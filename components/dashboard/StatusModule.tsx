import React from 'react';
import WireframePanel from './WireframePanel';
import DotMatrixProgressBar from './DotMatrixProgressBar';

interface StatusModuleProps {
    completed: number;
    total: number;
}

const StatusModule: React.FC<StatusModuleProps> = ({ completed, total }) => {
    return (
        <WireframePanel className="flex flex-col justify-center gap-1" title="STATUS">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden md:block mb-1">
                EXECUTION PROGRESS
            </span>
            <DotMatrixProgressBar completed={completed} total={total} showLabel />
        </WireframePanel>
    );
};

export default StatusModule;
