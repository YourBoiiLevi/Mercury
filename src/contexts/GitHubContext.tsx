import React, {
    createContext,
    useState,
    useCallback,
    useContext,
    useMemo,
    ReactNode
} from 'react';
import { Octokit } from 'octokit';

export type GitHubStatus = 'disconnected' | 'authenticating' | 'authenticated' | 'hydrating' | 'ready' | 'error';

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    description: string | null;
    private: boolean;
    default_branch: string;
    html_url: string;
    clone_url: string;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
}

export interface GitHubUser {
    login: string;
    avatar_url: string;
    name: string | null;
    email: string | null;
}

export interface HydrationState {
    phase: 'idle' | 'configuring' | 'cloning' | 'indexing' | 'complete';
    progress: number;
    message: string;
}

export interface GitHubContextState {
    status: GitHubStatus;
    error: string | null;
    user: GitHubUser | null;
    repos: GitHubRepo[];
    activeRepo: GitHubRepo | null;
    repoPath: string | null;
    hydration: HydrationState;
    pat: string | null;
}

export interface GitHubContextActions {
    authenticate: (pat: string) => Promise<boolean>;
    disconnect: () => void;
    fetchRepos: () => Promise<void>;
    selectRepo: (repo: GitHubRepo) => void;
    hydrateRepo: (repo: GitHubRepo, sandbox: any) => Promise<boolean>;
    createPullRequest: (params: CreatePRParams) => Promise<PRResult>;
    getOctokit: () => Octokit | null;
}

export interface CreatePRParams {
    title: string;
    body: string;
    head: string;
    base: string;
}

export interface PRResult {
    success: boolean;
    url?: string;
    number?: number;
    error?: string;
}

export type GitHubContextValue = GitHubContextState & GitHubContextActions;

export const GitHubContext = createContext<GitHubContextValue | null>(null);

interface GitHubProviderProps {
    children: ReactNode;
}

export const GitHubProvider: React.FC<GitHubProviderProps> = ({ children }) => {
    const [status, setStatus] = useState<GitHubStatus>('disconnected');
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<GitHubUser | null>(null);
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [activeRepo, setActiveRepo] = useState<GitHubRepo | null>(null);
    const [repoPath, setRepoPath] = useState<string | null>(null);
    const [pat, setPat] = useState<string | null>(null);
    const [octokit, setOctokit] = useState<Octokit | null>(null);
    const [hydration, setHydration] = useState<HydrationState>({
        phase: 'idle',
        progress: 0,
        message: ''
    });

    const authenticate = useCallback(async (token: string): Promise<boolean> => {
        setStatus('authenticating');
        setError(null);

        try {
            const client = new Octokit({ auth: token });
            const { data: userData } = await client.rest.users.getAuthenticated();

            setOctokit(client);
            setPat(token);
            setUser({
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name,
                email: userData.email
            });
            setStatus('authenticated');

            console.log('[GitHub] Authenticated as:', userData.login);
            return true;
        } catch (err) {
            console.error('[GitHub] Authentication failed:', err);
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Authentication failed');
            setOctokit(null);
            setPat(null);
            return false;
        }
    }, []);

    const disconnect = useCallback(() => {
        setOctokit(null);
        setPat(null);
        setUser(null);
        setRepos([]);
        setActiveRepo(null);
        setRepoPath(null);
        setStatus('disconnected');
        setError(null);
        setHydration({ phase: 'idle', progress: 0, message: '' });
        console.log('[GitHub] Disconnected');
    }, []);

    const fetchRepos = useCallback(async () => {
        if (!octokit) {
            setError('Not authenticated');
            return;
        }

        try {
            const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                sort: 'updated',
                per_page: 100,
                affiliation: 'owner,collaborator,organization_member'
            });

            const mappedRepos: GitHubRepo[] = data.map(repo => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                owner: {
                    login: repo.owner.login,
                    avatar_url: repo.owner.avatar_url
                },
                description: repo.description,
                private: repo.private,
                default_branch: repo.default_branch,
                html_url: repo.html_url,
                clone_url: repo.clone_url,
                language: repo.language,
                stargazers_count: repo.stargazers_count,
                updated_at: repo.updated_at || ''
            }));

            setRepos(mappedRepos);
            console.log('[GitHub] Fetched', mappedRepos.length, 'repositories');
        } catch (err) {
            console.error('[GitHub] Failed to fetch repos:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
        }
    }, [octokit]);

    const selectRepo = useCallback((repo: GitHubRepo) => {
        setActiveRepo(repo);
        console.log('[GitHub] Selected repo:', repo.full_name);
    }, []);

    const hydrateRepo = useCallback(async (repo: GitHubRepo, sandbox: any): Promise<boolean> => {
        if (!pat || !sandbox) {
            setError('Missing PAT or sandbox');
            return false;
        }

        setStatus('hydrating');
        setActiveRepo(repo);

        try {
            setHydration({ phase: 'configuring', progress: 10, message: 'Configuring git credentials...' });
            await sandbox.commands.run(`git config --global user.email "agent@mercury.dev"`);
            await sandbox.commands.run(`git config --global user.name "Mercury Agent"`);
            await sandbox.commands.run(`git config --global init.defaultBranch main`);
            await sandbox.commands.run(`git config --global credential.helper store`);

            setHydration({ phase: 'cloning', progress: 30, message: `Cloning ${repo.name}...` });
            const cloneUrl = `https://x-access-token:${pat}@github.com/${repo.full_name}.git`;
            const targetPath = `/home/user/${repo.name}`;

            await sandbox.commands.run(`rm -rf ${targetPath}`);
            const cloneResult = await sandbox.commands.run(`git clone ${cloneUrl} ${targetPath}`, {
                timeoutMs: 120000
            });

            if (cloneResult.exitCode !== 0) {
                throw new Error(`Clone failed: ${cloneResult.stderr}`);
            }

            setHydration({ phase: 'indexing', progress: 80, message: 'Indexing project structure...' });
            await sandbox.commands.run(`cd ${targetPath} && ls -la`);

            setRepoPath(targetPath);
            setHydration({ phase: 'complete', progress: 100, message: 'Repository ready!' });
            setStatus('ready');

            console.log('[GitHub] Hydration complete:', targetPath);
            return true;
        } catch (err) {
            console.error('[GitHub] Hydration failed:', err);
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Hydration failed');
            setHydration({ phase: 'idle', progress: 0, message: '' });
            return false;
        }
    }, [pat]);

    const createPullRequest = useCallback(async (params: CreatePRParams): Promise<PRResult> => {
        if (!octokit || !activeRepo) {
            return { success: false, error: 'Not authenticated or no active repository' };
        }

        try {
            const { data } = await octokit.rest.pulls.create({
                owner: activeRepo.owner.login,
                repo: activeRepo.name,
                title: params.title,
                body: params.body,
                head: params.head,
                base: params.base || activeRepo.default_branch
            });

            console.log('[GitHub] PR created:', data.html_url);
            return {
                success: true,
                url: data.html_url,
                number: data.number
            };
        } catch (err: any) {
            console.error('[GitHub] PR creation failed:', err);
            return {
                success: false,
                error: err.message || 'Failed to create pull request'
            };
        }
    }, [octokit, activeRepo]);

    const getOctokit = useCallback(() => octokit, [octokit]);

    const contextValue = useMemo<GitHubContextValue>(() => ({
        status,
        error,
        user,
        repos,
        activeRepo,
        repoPath,
        hydration,
        pat,
        authenticate,
        disconnect,
        fetchRepos,
        selectRepo,
        hydrateRepo,
        createPullRequest,
        getOctokit
    }), [
        status, error, user, repos, activeRepo, repoPath, hydration, pat,
        authenticate, disconnect, fetchRepos, selectRepo, hydrateRepo, createPullRequest, getOctokit
    ]);

    return (
        <GitHubContext.Provider value={contextValue}>
            {children}
        </GitHubContext.Provider>
    );
};

export const useGitHub = (): GitHubContextValue => {
    const context = useContext(GitHubContext);
    if (!context) {
        throw new Error('useGitHub must be used within a GitHubProvider');
    }
    return context;
};
