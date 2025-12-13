import React, { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { ManualOverridePanel } from './ManualOverridePanel';

const ManualOverrideButton: React.FC = () => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    return (
        <>
            <div className="fixed bottom-16 right-4 z-50">
                <button
                    onClick={() => setIsPanelOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] border border-orange-500/30 rounded font-mono text-xs text-orange-500 hover:bg-orange-500/10 hover:border-orange-500/50 transition-colors"
                >
                    <Crosshair size={12} />
                    [MANUAL_OVERRIDE]
                </button>
            </div>

            <ManualOverridePanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
            />
        </>
    );
};

export default ManualOverrideButton;
