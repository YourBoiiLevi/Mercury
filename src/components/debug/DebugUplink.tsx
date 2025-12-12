import React, { useState } from 'react';
import { useE2B } from '../../hooks/useE2B';
import { Radio, Loader } from 'lucide-react';

const DebugUplink: React.FC = () => {
    const { sandbox, status } = useE2B();
    const [isRunning, setIsRunning] = useState(false);

    const handleTestUplink = async () => {
        if (!sandbox) {
            alert('ERR: No sandbox connection available');
            return;
        }

        setIsRunning(true);
        try {
            const result = await sandbox.commands.run('echo "Mercury Uplink Verified: " $(date)');
            alert(result.stdout || 'No output received');
        } catch (err) {
            alert(`ERR: ${err instanceof Error ? err.message : 'Command execution failed'}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                onClick={handleTestUplink}
                disabled={status !== 'connected' || isRunning}
                className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] border border-orange-500/30 rounded font-mono text-xs text-orange-500 hover:bg-orange-500/10 hover:border-orange-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isRunning ? (
                    <Loader size={12} className="animate-spin" />
                ) : (
                    <Radio size={12} />
                )}
                [TEST_UPLINK]
            </button>
        </div>
    );
};

export default DebugUplink;
