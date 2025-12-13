import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Octokit } from '@octokit/rest';
import { useE2B } from '../hooks/useE2B';

interface Repository {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    default_branch: string;
    private: boolean;
    description: string | null;
}

interface PRParams {
    title: string;
    body: string;
    head: string;
    base: string;
}

interface GitHubContextState {
    octokit: Octokit | null;
    isAuthenticated: boolean;
    user: { login: string; avatar_url: string } | null;
    repositories: Repository[];
    selectedRepo: { owner: string; name: string; defaultBranch: string } | null;
    hydrationStatus: 'idle' | 'configuring' | 'cloning' | 'ready' | 'error';
    hydrationError: string | null;
    workingDirectory: string | null;
}

interface GitHubContextActions {
    authenticate: (pat: string) => Promise<void>;
    logout: () => void;
    fetchRepositories: () => Promise<void>;
    selectRepository: (repo: Repository) => void;
    hydrateEnvironment: () => Promise<void>;
    createPullRequest: (params: PRParams) => Promise<{ url: string }>;
}

export type GitHubContextValue = GitHubContextState & GitHubContextActions;

export const GitHubContext = createContext<GitHubContextValue | null>(null);

interface GitHubProviderProps {
    children: ReactNode;
}

export const GitHubProvider: React.FC<GitHubProviderProps> = ({ children }) => {
    const { sandbox } = useE2B();
    const [octokit, setOctokit] = useState<Octokit | null>(null);
    const [user, setUser] = useState<{ login: string; avatar_url: string } | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<GitHubContextState['selectedRepo']>(null);
    const [hydrationStatus, setHydrationStatus] = useState<GitHubContextState['hydrationStatus']>('idle');
    const [hydrationError, setHydrationError] = useState<string | null>(null);
    const [workingDirectory, setWorkingDirectory] = useState<string | null>(null);
    const [pat, setPat] = useState<string | null>(null);

    const authenticate = useCallback(async (token: string) => {
        try {
            const newOctokit = new Octokit({ auth: token });
            const { data: userData } = await newOctokit.users.getAuthenticated();
            
            setOctokit(newOctokit);
            setPat(token);
            setUser({ login: userData.login, avatar_url: userData.avatar_url });
        } catch (error: any) {
            console.error('GitHub authentication failed:', error);
            throw new Error(error.message || 'Authentication failed');
        }
    }, []);

    const logout = useCallback(() => {
        setOctokit(null);
        setPat(null);
        setUser(null);
        setRepositories([]);
        setSelectedRepo(null);
        setHydrationStatus('idle');
        setHydrationError(null);
        setWorkingDirectory(null);
    }, []);

    const fetchRepositories = useCallback(async () => {
        if (!octokit) return;
        try {
            const { data } = await octokit.repos.listForAuthenticatedUser({
                per_page: 100,
                sort: 'updated',
                direction: 'desc'
            });
            setRepositories(data as Repository[]);
        } catch (error: any) {
            console.error('Failed to fetch repositories:', error);
            throw error;
        }
    }, [octokit]);

    const selectRepository = useCallback((repo: Repository) => {
        setSelectedRepo({
            owner: repo.owner.login,
            name: repo.name,
            defaultBranch: repo.default_branch
        });
        setHydrationStatus('idle'); // Reset hydration status when repo changes
    }, []);

    const hydrateEnvironment = useCallback(async () => {
        if (!selectedRepo || !octokit || !sandbox || !pat) return;
        
        const { owner, name } = selectedRepo;
        const repoPath = `/home/user/${name}`;

        try {
            setHydrationStatus('configuring');
            setHydrationError(null);

            // Configure git credentials
            await sandbox.commands.run('git config --global user.email "mercury@agent.local"');
            await sandbox.commands.run('git config --global user.name "Mercury Agent"');
            await sandbox.commands.run('git config --global credential.helper store');

            setHydrationStatus('cloning');
            
            // Clone with PAT authentication
            const cloneUrl = `https://${pat}@github.com/${owner}/${name}.git`;
            // Using a hidden way to pass credentials if possible, but here putting it in URL as per instruction
            // Note: In a real secure env, we might want to avoid logging this command if logs are visible
            await sandbox.commands.run(`git clone ${cloneUrl} ${repoPath}`, { timeoutMs: 120000 });

            setWorkingDirectory(repoPath);
            setHydrationStatus('ready');
        } catch (err: any) {
            console.error('Hydration failed:', err);
            setHydrationStatus('error');
            setHydrationError(err.message || 'Failed to clone repository');
        }
    }, [selectedRepo, octokit, sandbox, pat]);

    const createPullRequest = useCallback(async (params: PRParams) => {
        if (!octokit || !selectedRepo) {
            throw new Error('GitHub not connected or no repository selected');
        }

        const { data } = await octokit.pulls.create({
            owner: selectedRepo.owner,
            repo: selectedRepo.name,
            ...params
        });

        return { url: data.html_url };
    }, [octokit, selectedRepo]);

    const value = {
        octokit,
        isAuthenticated: !!octokit,
        user,
        repositories,
        selectedRepo,
        hydrationStatus,
        hydrationError,
        workingDirectory,
        authenticate,
        logout,
        fetchRepositories,
        selectRepository,
        hydrateEnvironment,
        createPullRequest
    };

    return (
        <GitHubContext.Provider value={value}>
            {children}
        </GitHubContext.Provider>
    );
};

export const useGitHub = () => {
    const context = useContext(GitHubContext);
    if (!context) {
        throw new Error('useGitHub must be used within a GitHubProvider');
    }
    return context;
};
