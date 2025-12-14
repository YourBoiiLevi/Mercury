import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X,
    Github,
    Search,
    Lock,
    Unlock,
    Star,
    GitBranch,
    Loader2,
    FolderGit2,
    ArrowRight
} from 'lucide-react';
import { useGitHub, GitHubRepo } from '../../contexts/GitHubContext';

interface RepoPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRepo: (repo: GitHubRepo) => void;
}

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
};

const LanguageDot: React.FC<{ language: string | null }> = ({ language }) => {
    const colors: Record<string, string> = {
        TypeScript: '#3178c6',
        JavaScript: '#f7df1e',
        Python: '#3572A5',
        Rust: '#dea584',
        Go: '#00ADD8',
        Java: '#b07219',
        'C++': '#f34b7d',
        C: '#555555',
        Ruby: '#701516',
        PHP: '#4F5D95',
        Swift: '#ffac45',
        Kotlin: '#A97BFF',
        Dart: '#00B4AB',
        HTML: '#e34c26',
        CSS: '#563d7c',
        Shell: '#89e051',
        Vue: '#41b883',
        Svelte: '#ff3e00'
    };

    if (!language) return null;

    return (
        <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: colors[language] || '#6e7681' }}
        />
    );
};

export const RepoPickerModal: React.FC<RepoPickerModalProps> = ({
    isOpen,
    onClose,
    onSelectRepo
}) => {
    const { repos, fetchRepos, user, status } = useGitHub();
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

    useEffect(() => {
        if (isOpen && repos.length === 0 && status === 'authenticated') {
            setIsLoading(true);
            fetchRepos().finally(() => setIsLoading(false));
        }
    }, [isOpen, repos.length, status, fetchRepos]);

    const filteredRepos = useMemo(() => {
        if (!search.trim()) return repos;
        const query = search.toLowerCase();
        return repos.filter(repo =>
            repo.name.toLowerCase().includes(query) ||
            repo.full_name.toLowerCase().includes(query) ||
            repo.description?.toLowerCase().includes(query)
        );
    }, [repos, search]);

    const handleSelect = (repo: GitHubRepo) => {
        setSelectedRepo(repo);
    };

    const handleConfirm = () => {
        if (selectedRepo) {
            onSelectRepo(selectedRepo);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-2xl mx-4 bg-[#0A0A0A] border-2 border-[#FF3B00] shadow-[0_0_60px_rgba(255,59,0,0.15)]"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="border-b-2 border-[#FF3B00] p-4 flex items-center justify-between bg-[#0D0D0D]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FF3B00] flex items-center justify-center">
                                <Github size={20} className="text-black" />
                            </div>
                            <div>
                                <h2 className="font-mono font-bold text-[#FF3B00] tracking-wider text-sm">
                                    [REPO_SELECTOR]
                                </h2>
                                <p className="text-[10px] text-gray-500 font-mono">
                                    {user?.login ? `@${user.login}` : 'SELECT_TARGET_REPOSITORY'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-[#FF3B00] hover:bg-[#FF3B00]/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 border-b border-[#222]">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH_REPOSITORIES..."
                                className="w-full bg-black border-2 border-[#333] pl-10 pr-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 focus:border-[#FF3B00]/50 focus:outline-none transition-colors"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <Loader2 size={32} className="text-[#FF3B00] animate-spin" />
                                <p className="text-gray-500 font-mono text-xs tracking-wider">
                                    FETCHING_REPOSITORIES...
                                </p>
                            </div>
                        ) : filteredRepos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <FolderGit2 size={32} className="text-gray-600" />
                                <p className="text-gray-500 font-mono text-xs tracking-wider">
                                    {search ? 'NO_MATCHES_FOUND' : 'NO_REPOSITORIES_AVAILABLE'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1a1a1a]">
                                {filteredRepos.map(repo => (
                                    <motion.button
                                        key={repo.id}
                                        onClick={() => handleSelect(repo)}
                                        className={`w-full p-4 text-left transition-all group ${
                                            selectedRepo?.id === repo.id
                                                ? 'bg-[#FF3B00]/10 border-l-4 border-[#FF3B00]'
                                                : 'hover:bg-[#111] border-l-4 border-transparent'
                                        }`}
                                        whileTap={{ scale: 0.995 }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {repo.private ? (
                                                        <Lock size={12} className="text-yellow-500" />
                                                    ) : (
                                                        <Unlock size={12} className="text-green-500" />
                                                    )}
                                                    <span className="font-mono font-bold text-gray-200 truncate">
                                                        {repo.name}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 font-mono truncate mb-2">
                                                    {repo.full_name}
                                                </p>
                                                {repo.description && (
                                                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                                        {repo.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono">
                                                    {repo.language && (
                                                        <span className="flex items-center gap-1.5">
                                                            <LanguageDot language={repo.language} />
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Star size={10} />
                                                        {repo.stargazers_count}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <GitBranch size={10} />
                                                        {repo.default_branch}
                                                    </span>
                                                    <span>Updated {formatDate(repo.updated_at)}</span>
                                                </div>
                                            </div>
                                            <div className={`p-2 transition-all ${
                                                selectedRepo?.id === repo.id
                                                    ? 'text-[#FF3B00]'
                                                    : 'text-gray-700 group-hover:text-gray-500'
                                            }`}>
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t-2 border-[#222] bg-[#0D0D0D] flex items-center justify-between">
                        <div className="text-[10px] text-gray-600 font-mono">
                            {filteredRepos.length} REPOSITORIES // {selectedRepo ? `SELECTED: ${selectedRepo.name}` : 'NONE_SELECTED'}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-[#333] text-gray-500 font-mono text-xs hover:border-gray-500 hover:text-gray-300 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedRepo}
                                className="px-6 py-2 bg-[#FF3B00] text-black font-mono text-xs font-bold tracking-wider hover:bg-[#ff5722] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <FolderGit2 size={14} />
                                HYDRATE
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
