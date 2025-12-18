import React from 'react';
import WireframePanel from './WireframePanel';
import { Streamdown } from 'streamdown';

interface BlueprintPanelProps {
    content: string | null;
}

const BlueprintPanel: React.FC<BlueprintPanelProps> = ({ content }) => {
    return (
        <WireframePanel title="BLUEPRINT // PLAN.md" className="h-full flex flex-col" noPadding>
            <div className="flex-1 overflow-auto p-4 prose prose-invert prose-mercury prose-sm max-w-none font-mono text-gray-400">
                {content ? (
                    <Streamdown>{content}</Streamdown>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-700 text-xs text-center">
                        NO BLUEPRINT DATA ESTABLISHED
                    </div>
                )}
            </div>
        </WireframePanel>
    );
};

export default BlueprintPanel;
