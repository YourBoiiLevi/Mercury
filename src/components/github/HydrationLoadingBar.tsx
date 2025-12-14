import React from 'react';
import { motion } from 'motion/react';
import { Github, Loader2, CheckCircle2, FolderGit2, Settings, Database } from 'lucide-react';
import { HydrationState } from '../../contexts/GitHubContext';

interface HydrationLoadingBarProps {
    hydration: HydrationState;
    repoName?: string;
}

const PhaseIcon: React.FC<{ phase: HydrationState['phase']; isActive: boolean }> = ({ phase, isActive }) => {
    const iconProps = {
        size: 14,
        className: isActive ? 'text-[#FF3B00]' : 'text-gray-600'
    };

    switch (phase) {
        case 'configuring':
            return <Settings {...iconProps} />;
        case 'cloning':
            return <FolderGit2 {...iconProps} />;
        case 'indexing':
            return <Database {...iconProps} />;
        case 'complete':
            return <CheckCircle2 {...iconProps} className="text-green-500" />;
        default:
            return <Github {...iconProps} />;
    }
};

export const HydrationLoadingBar: React.FC<HydrationLoadingBarProps> = ({
    hydration,
    repoName
}) => {
    const { phase, progress, message } = hydration;

    if (phase === 'idle') return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-10"
        >
            <div className="border-2 border-[#FF3B00] bg-black overflow-hidden">
                <div className="px-4 py-3 border-b border-[#FF3B00]/30 bg-[#0D0D0D]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {phase === 'complete' ? (
                                <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                                <Loader2 size={16} className="text-[#FF3B00] animate-spin" />
                            )}
                            <span className="font-mono text-xs text-[#FF3B00] tracking-wider font-bold">
                                {phase === 'complete' ? '[HYDRATION_COMPLETE]' : '[HYDRATING_SANDBOX]'}
                            </span>
                        </div>
                        {repoName && (
                            <span className="font-mono text-[10px] text-gray-500">
                                {repoName}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4">
                    <div className="flex items-center gap-6 mb-3">
                        {(['configuring', 'cloning', 'indexing', 'complete'] as const).map((p, i) => (
                            <div key={p} className="flex items-center gap-2">
                                <div className={`w-6 h-6 flex items-center justify-center border ${
                                    phase === p 
                                        ? 'border-[#FF3B00] bg-[#FF3B00]/10' 
                                        : progress >= (i + 1) * 25
                                            ? 'border-green-500/50 bg-green-500/10'
                                            : 'border-[#333] bg-[#111]'
                                }`}>
                                    <PhaseIcon phase={p} isActive={phase === p} />
                                </div>
                                <span className={`font-mono text-[10px] tracking-wider ${
                                    phase === p ? 'text-[#FF3B00]' : 'text-gray-600'
                                }`}>
                                    {p.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="relative h-2 bg-[#111] border border-[#333] overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF3B00] to-[#ff5722]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                        <div 
                            className="absolute inset-0 opacity-30"
                            style={{
                                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,59,0,0.3) 4px, rgba(255,59,0,0.3) 8px)',
                                animation: 'scan 1s linear infinite'
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <span className="font-mono text-[10px] text-gray-500">
                            {message}
                        </span>
                        <span className="font-mono text-[10px] text-[#FF3B00]">
                            {progress}%
                        </span>
                    </div>
                </div>

                <style>{`
                    @keyframes scan {
                        from { transform: translateX(-8px); }
                        to { transform: translateX(0); }
                    }
                `}</style>
            </div>
        </motion.div>
    );
};
