import React from 'react';
import WireframePanel from './WireframePanel';
import { Activity } from 'lucide-react';

interface SystemModuleProps {
    activeTool?: string;
    isBusy?: boolean;
}

const SystemModule: React.FC<SystemModuleProps> = ({ activeTool, isBusy }) => {
    return (
        <WireframePanel className="flex flex-col justify-center" title="SYSTEM">
            <div className="flex items-center gap-2 mb-1">
                <Activity size={12} className={isBusy ? "text-mercury-orange animate-pulse" : "text-gray-600"} />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    RUNTIME STATE
                </span>
            </div>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBusy ? 'bg-mercury-orange animate-pulse' : 'bg-green-500/50'}`} />
                <span className="font-mono text-sm text-white uppercase truncate">
                    {activeTool ? `EXECUTING: ${activeTool}` : 'STANDBY'}
                </span>
            </div>
        </WireframePanel>
    );
};

export default SystemModule;
