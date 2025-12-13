import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Github, Lock, Search, GitBranch, Loader2, X, Globe } from 'lucide-react';
import { useGitHub } from '../../contexts/GitHubContext';

interface RepoPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RepoPickerModal: React.FC<RepoPickerModalProps> = ({ isOpen, onClose }) => {
    const { 
        isAuthenticated, 
        authenticate, 
        fetchRepositories, 
        repositories, 
        selectRepository, 
        hydrateEnvironment,
        user
    } = useGitHub();

    const [pat, setPat] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
    const [setupStep, setSetupStep] = useState<'auth' | 'selection'>('auth');

    useEffect(() => {
        if (isAuthenticated) {
            setSetupStep('selection');
            if (repositories.length === 0) {
                loadRepos();
            }
        } else {
            setSetupStep('auth');
        }
    }, [isAuthenticated]);

    const loadRepos = async () => {
        setIsLoading(true);
        try {
            await fetchRepositories();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setIsLoading(true);
        try {
            await authenticate(pat);
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRepo = async (repo: any) => {
        setSelectedRepoId(repo.id);
        selectRepository(repo);
        onClose();
        // Trigger hydration immediately after selection and closing modal
        // Note: The parent component or context manages when hydration starts, 
        // but per instructions we should trigger it. 
        // We'll call hydrateEnvironment right here or let the user confirm? 
        // The plan says: "When user selects a repo and confirms, execute this sequence"
        // Let's assume selection triggers it.
        await hydrateEnvironment();
    };

    const filteredRepos = useMemo(() => {
        return repositories.filter(repo => 
            repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [repositories, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg w-full max-w-2xl mx-4 shadow-2xl shadow-orange-500/10 flex flex-col max-h-[85vh]"
            >
                <div className="flex items-center justify-between p-6 border-b border-[#222]">
                    <div className="flex items-center gap-2 text-orange-500">
                        <Github size={18} />
                        <span className="font-mono font-bold tracking-wider text-sm">
                            {setupStep === 'auth' ? 'GITHUB_AUTHENTICATION' : 'REPOSITORY_SELECTION'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-orange-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {setupStep === 'auth' ? (
                        <form onSubmit={handleAuth}>
                            <div className="mb-6">
                                <p className="text-gray-400 text-sm mb-4 font-mono leading-relaxed">
                                    Authenticate with a Personal Access Token (classic) to enable repo access, cloning, and PR creation.
                                </p>
                                <div className="bg-[#111] border border-[#222] p-4 rounded mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 mb-2 font-mono uppercase">Required Scopes:</h4>
                                    <ul className="text-xs text-gray-400 font-mono space-y-1 list-disc pl-4">
                                        <li>repo (Full control of private repositories)</li>
                                        <li>read:user (Read user profile data)</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-xs text-gray-500 font-mono mb-2 tracking-wider">
                                    PERSONAL_ACCESS_TOKEN
                                </label>
                                <input
                                    type="password"
                                    value={pat}
                                    onChange={(e) => setPat(e.target.value)}
                                    placeholder="ghp_..."
                                    className="w-full bg-[#050505] border border-[#333] rounded px-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                                    autoFocus
                                />
                            </div>

                            {authError && (
                                <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-xs font-mono">
                                    ERR: {authError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!pat.trim() || isLoading}
                                className="w-full px-4 py-3 bg-orange-500 rounded font-mono text-xs text-black font-bold tracking-wider hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-6">
                                {user && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#222] rounded-full">
                                        <img src={user.avatar_url} alt={user.login} className="w-5 h-5 rounded-full" />
                                        <span className="text-xs font-mono text-gray-300">{user.login}</span>
                                    </div>
                                )}
                                <div className="flex-1 relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input 
                                        type="text"
                                        placeholder="Filter repositories..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-[#050505] border border-[#333] rounded pl-9 pr-4 py-2 font-mono text-xs text-gray-300 focus:outline-none focus:border-orange-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                                    {filteredRepos.length} / {repositories.length} REPOSITORIES
                                </span>
                                {isLoading && <Loader2 size={12} className="text-orange-500 animate-spin" />}
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredRepos.map(repo => (
                                    <button
                                        key={repo.id}
                                        onClick={() => handleSelectRepo(repo)}
                                        className="w-full text-left p-3 rounded border border-[#222] hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                {repo.private ? <Lock size={12} className="text-orange-500" /> : <Globe size={12} className="text-gray-500" />}
                                                <span className="font-mono text-sm font-bold text-gray-300 group-hover:text-orange-500 transition-colors">
                                                    {repo.full_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-600 bg-[#111] px-1.5 py-0.5 rounded border border-[#222]">
                                                <GitBranch size={10} />
                                                <span className="text-[10px] font-mono">{repo.default_branch}</span>
                                            </div>
                                        </div>
                                        <div className="pl-5">
                                            <p className="text-xs text-gray-500 font-mono truncate">
                                                {repo.description || 'No description provided'}
                                            </p>
                                        </div>
                                    </button>
                                ))}

                                {filteredRepos.length === 0 && !isLoading && (
                                    <div className="text-center py-8 text-gray-600 font-mono text-xs">
                                        NO_REPOSITORIES_FOUND
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
