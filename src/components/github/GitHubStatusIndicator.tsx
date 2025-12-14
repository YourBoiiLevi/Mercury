import React from 'react';
import { Github, CheckCircle2, Loader2, AlertCircle, FolderGit2 } from 'lucide-react';
import { GitHubStatus } from '../../contexts/GitHubContext';

interface GitHubStatusIndicatorProps {
    status: GitHubStatus;
    repoName?: string | null;
    userName?: string | null;
    onClick?: () => void;
}

export const GitHubStatusIndicator: React.FC<GitHubStatusIndicatorProps> = ({
    status,
    repoName,
    userName,
    onClick
}) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'disconnected':
                return {
                    icon: <Github size={12} />,
                    text: 'CONNECT_GITHUB',
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-500/10',
                    borderColor: 'border-gray-500/30'
                };
            case 'authenticating':
                return {
                    icon: <Loader2 size={12} className="animate-spin" />,
                    text: 'AUTHENTICATING...',
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/30'
                };
            case 'authenticated':
                return {
                    icon: <Github size={12} />,
                    text: userName ? `@${userName}` : 'AUTHENTICATED',
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/30'
                };
            case 'hydrating':
                return {
                    icon: <Loader2 size={12} className="animate-spin" />,
                    text: 'HYDRATING...',
                    color: 'text-[#FF3B00]',
                    bgColor: 'bg-[#FF3B00]/10',
                    borderColor: 'border-[#FF3B00]/30'
                };
            case 'ready':
                return {
                    icon: <FolderGit2 size={12} />,
                    text: repoName || 'REPO_READY',
                    color: 'text-green-500',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500/30'
                };
            case 'error':
                return {
                    icon: <AlertCircle size={12} />,
                    text: 'ERROR',
                    color: 'text-red-500',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/30'
                };
            default:
                return {
                    icon: <Github size={12} />,
                    text: 'UNKNOWN',
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-500/10',
                    borderColor: 'border-gray-500/30'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-wider border transition-all hover:opacity-80 ${config.color} ${config.bgColor} ${config.borderColor}`}
        >
            {config.icon}
            <span>{config.text}</span>
            {status === 'ready' && (
                <CheckCircle2 size={10} className="text-green-500" />
            )}
        </button>
    );
};
