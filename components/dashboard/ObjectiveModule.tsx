import React from 'react';
import WireframePanel from './WireframePanel';
import { Target } from 'lucide-react';

interface ObjectiveModuleProps {
    currentTask: string | null;
}

const ObjectiveModule: React.FC<ObjectiveModuleProps> = ({ currentTask }) => {
    return (
        <WireframePanel className="flex flex-col justify-center" title="OBJECTIVE">
            <div className="flex items-center gap-2 mb-1">
                <Target size={12} className="text-mercury-orange" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    CURRENT DIRECTIVE
                </span>
            </div>
            <div className="font-mono text-sm text-white truncate">
                {currentTask || <span className="text-gray-600">No active directive</span>}
            </div>
        </WireframePanel>
    );
};

export default ObjectiveModule;
