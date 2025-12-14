import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Github, Key, AlertCircle, ExternalLink } from 'lucide-react';

interface GitHubAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pat: string) => Promise<boolean>;
    error?: string | null;
}

export const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    error
}) => {
    const [pat, setPat] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pat.trim()) return;

        setIsSubmitting(true);
        setLocalError(null);

        const success = await onSubmit(pat.trim());
        
        if (!success) {
            setLocalError('Authentication failed. Please check your token.');
        }
        
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-md mx-4 bg-[#0A0A0A] border-2 border-[#FF3B00] shadow-[0_0_60px_rgba(255,59,0,0.15)]"
                >
                    <div className="border-b-2 border-[#FF3B00] p-4 flex items-center justify-between bg-[#0D0D0D]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FF3B00] flex items-center justify-center">
                                <Github size={20} className="text-black" />
                            </div>
                            <div>
                                <h2 className="font-mono font-bold text-[#FF3B00] tracking-wider text-sm">
                                    [GITHUB_AUTH]
                                </h2>
                                <p className="text-[10px] text-gray-500 font-mono">
                                    PERSONAL_ACCESS_TOKEN_REQUIRED
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

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="mb-6">
                            <label className="block text-xs text-gray-500 font-mono mb-2 tracking-wider">
                                GITHUB_PAT
                            </label>
                            <div className="relative">
                                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="password"
                                    value={pat}
                                    onChange={e => setPat(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    className="w-full bg-black border-2 border-[#333] pl-10 pr-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 focus:border-[#FF3B00]/50 focus:outline-none transition-colors"
                                    autoFocus
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {(error || localError) && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-500 font-mono">
                                    {error || localError}
                                </p>
                            </div>
                        )}

                        <div className="mb-6 p-3 bg-[#111] border border-[#222]">
                            <p className="text-[10px] text-gray-500 font-mono mb-2">
                                REQUIRED_SCOPES:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {['repo', 'read:user', 'workflow'].map(scope => (
                                    <span
                                        key={scope}
                                        className="px-2 py-1 bg-[#FF3B00]/10 border border-[#FF3B00]/30 text-[#FF3B00] text-[10px] font-mono"
                                    >
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border border-[#333] text-gray-500 font-mono text-xs hover:border-gray-500 hover:text-gray-300 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={!pat.trim() || isSubmitting}
                                className="flex-1 px-4 py-3 bg-[#FF3B00] text-black font-mono text-xs font-bold tracking-wider hover:bg-[#ff5722] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'AUTHENTICATING...' : 'CONNECT'}
                            </button>
                        </div>

                        <a
                            href="https://github.com/settings/tokens/new?scopes=repo,read:user,workflow&description=Mercury%20Agent"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-500 hover:text-[#FF3B00] transition-colors font-mono"
                        >
                            <ExternalLink size={10} />
                            GENERATE_NEW_TOKEN
                        </a>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
