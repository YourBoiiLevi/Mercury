import React, { useState, useEffect } from 'react';
import { Power, Wifi, WifiOff, AlertTriangle, Loader, GitBranch } from 'lucide-react';

export type SystemStatusType = 'disconnected' | 'booting' | 'connected' | 'error';

interface SystemStatusProps {
    status: SystemStatusType;
    error?: string | null;
    sandboxId?: string | null;
    isRepoAttached?: boolean;
    repoName?: string | null;
}

const BOOT_MESSAGES = [
    '[KERNEL] Initializing E2B runtime...',
    '[NET] Establishing secure tunnel...',
    '[SYS] Allocating resources...',
    '[VM] Mounting filesystem...',
    '[ENV] Loading dependencies...',
    '[UPLINK] Handshake in progress...',
];

const ProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!active) {
            setProgress(0);
            return;
        }

        const interval = setInterval(() => {
            setProgress(prev => (prev >= 10 ? 0 : prev + 1));
        }, 200);

        return () => clearInterval(interval);
    }, [active]);

    const filled = '█'.repeat(progress);
    const empty = '░'.repeat(10 - progress);

    return (
        <span className="text-orange-500/70">[{filled}{empty}]</span>
    );
};

const SystemStatus: React.FC<SystemStatusProps> = ({ status, error, sandboxId, isRepoAttached = false, repoName }) => {
    const [bootMessageIndex, setBootMessageIndex] = useState(0);

    useEffect(() => {
        if (status !== 'booting') {
            setBootMessageIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setBootMessageIndex(prev => (prev + 1) % BOOT_MESSAGES.length);
        }, 800);

        return () => clearInterval(interval);
    }, [status]);

    const truncateId = (id: string) => {
        if (id.length <= 12) return id;
        return `${id.slice(0, 6)}...${id.slice(-4)}`;
    };

    const renderStatusIcon = () => {
        switch (status) {
            case 'disconnected':
                return <WifiOff size={14} className="text-gray-500" />;
            case 'booting':
                return <Loader size={14} className="text-orange-500 animate-spin" />;
            case 'connected':
                if (!isRepoAttached) {
                    return <GitBranch size={14} className="text-orange-500 animate-pulse" />;
                }
                return <Wifi size={14} className="text-green-500" />;
            case 'error':
                return <AlertTriangle size={14} className="text-red-500" />;
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'disconnected':
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Power size={12} className="text-gray-500/50" />
                            <span className="text-gray-500 text-xs tracking-wider">
                                SYSTEM OFFLINE. AWAITING KEY.
                            </span>
                        </div>
                    </div>
                );

            case 'booting':
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-orange-500 text-xs tracking-wider animate-pulse">
                                INITIALIZING KERNEL...
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                            <ProgressBar active={true} />
                            <span className="text-orange-500/60">LOADING...</span>
                        </div>
                        <div className="text-[10px] text-orange-500/40 mt-1 h-4 overflow-hidden">
                            {BOOT_MESSAGES[bootMessageIndex]}
                        </div>
                    </div>
                );

            case 'connected':
                if (!isRepoAttached) {
                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-orange-500 text-xs tracking-wider">
                                    AWAITING REPOSITORY
                                </span>
                            </div>
                            <div className="text-[10px] text-orange-500/50">
                                Connect GitHub and select a repository to begin.
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 text-xs tracking-wider">
                                SYSTEM READY. UPLINK ESTABLISHED.
                            </span>
                        </div>
                        {repoName && (
                            <div className="text-[10px] text-green-500/50">
                                REPO: {repoName}
                            </div>
                        )}
                        {sandboxId && (
                            <div className="text-[10px] text-green-500/50">
                                NODE: {truncateId(sandboxId)}
                            </div>
                        )}
                    </div>
                );

            case 'error':
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 text-xs tracking-wider">
                                CONNECTION FAILED
                            </span>
                        </div>
                        {error && (
                            <div className="text-[10px] text-red-500/60 max-w-[200px] truncate">
                                ERR: {error}
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="flex items-start gap-3 px-3 py-2 bg-mercury-black/50 border border-mercury-orange/10 rounded font-mono">
            <div className="mt-0.5">
                {renderStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default SystemStatus;
