import React, { useState, useEffect, useCallback } from 'react';
import { useMercuryRuntime } from '../src/hooks/useMercuryRuntime';
import { parseTodoMarkdown } from '../utils/todoParser';
import StatusModule from './dashboard/StatusModule';
import ObjectiveModule from './dashboard/ObjectiveModule';
import SystemModule from './dashboard/SystemModule';
import ManifestPanel from './dashboard/ManifestPanel';
import BlueprintPanel from './dashboard/BlueprintPanel';
import { RefreshCw, AlertCircle } from 'lucide-react';

const DashboardView: React.FC = () => {
    const runtime = useMercuryRuntime();
    const [planContent, setPlanContent] = useState<string | null>(null);
    const [todoContent, setTodoContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // TODO: Get real active tool from engine/runtime state if possible
    // For now, we'll placeholder or check if we can pipe that strictly.
    // The runtime object doesn't strictly expose "currently executing tool" unless we add it. 
    // We can show "STANDBY" or "READY" for now.

    const refreshArtifacts = useCallback(async () => {
        if (!runtime.isReady) return;

        setIsLoading(true);
        try {
            const [planResult, todoResult] = await Promise.all([
                runtime.readArtifactFile('PLAN.md'),
                runtime.readArtifactFile('TODO.md')
            ]);

            setPlanContent(planResult.success ? planResult.data.content : null);
            setTodoContent(todoResult.success ? todoResult.data.content : null);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('[Dashboard] Refresh failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [runtime]);

    useEffect(() => {
        if (runtime.isReady) {
            refreshArtifacts();
            const interval = setInterval(refreshArtifacts, 1000);
            return () => clearInterval(interval);
        }
    }, [runtime.isReady, refreshArtifacts]);

    const parsedTodos = todoContent ? parseTodoMarkdown(todoContent) : {
        total: 0,
        completed: 0,
        progress: 0,
        activeTaskIndex: -1,
        currentTask: null,
        tree: []
    };

    if (!runtime.isReady) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-mercury-carbon dashboard-grid-bg">
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-mercury-orange" />
                    <p className="font-mono text-sm text-gray-500">SYSTEM OFFLINE</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-mercury-carbon dashboard-grid-bg overflow-hidden flex flex-col p-6">

            {/* Header / Top Bar */}
            <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-2">
                <h1 className="text-2xl font-mono font-bold text-white tracking-widest">
                    MISSION DASHBOARD
                </h1>
                <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                    {lastRefresh && (
                        <span>LAST SYNC: {lastRefresh.toLocaleTimeString()}</span>
                    )}
                    <button
                        onClick={refreshArtifacts}
                        className={`hover:text-mercury-orange transition-colors ${isLoading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Row 1: Modules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 h-32 shrink-0">
                <StatusModule
                    completed={parsedTodos.completed}
                    total={parsedTodos.total}
                />
                <ObjectiveModule
                    currentTask={parsedTodos.currentTask}
                />
                <SystemModule
                    // activeTool can be piped in later
                    isBusy={false}
                />
            </div>

            {/* Row 2: Panels */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                <ManifestPanel parsedTodos={parsedTodos} />
                <BlueprintPanel content={planContent} />
            </div>

        </div>
    );
};

export default DashboardView;
