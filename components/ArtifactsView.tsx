import React, { useState, useEffect, useCallback } from 'react';
import { useMercuryRuntime } from '../src/hooks/useMercuryRuntime';
import { RefreshCw, FileText, CheckSquare, AlertCircle } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface TodoItem {
    id: string;
    content: string;
    completed: boolean;
}

const parseTodoItems = (content: string): TodoItem[] => {
    const lines = content.split('\n');
    const todos: TodoItem[] = [];

    lines.forEach((line, idx) => {
        const unchecked = line.match(/^- \[ \] (.+)$/);
        const checked = line.match(/^- \[x\] (.+)$/i);

        if (unchecked) {
            todos.push({ id: `todo_${idx}`, content: unchecked[1], completed: false });
        } else if (checked) {
            todos.push({ id: `todo_${idx}`, content: checked[1], completed: true });
        }
    });

    return todos;
};

// Industrial Progress Bar with striped pattern
const IndustrialProgressBar: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">PROGRESS</span>
                <span className="text-sm font-mono font-bold text-orange-500">
                    {completed}/{total} ({percentage}%)
                </span>
            </div>
            <div className="h-6 bg-[#111] border-2 border-[#333] relative overflow-hidden">
                <div
                    className="h-full transition-all duration-300"
                    style={{
                        width: `${percentage}%`,
                        background: `repeating-linear-gradient(
                            45deg,
                            #FF6B00,
                            #FF6B00 10px,
                            #000 10px,
                            #000 20px
                        )`
                    }}
                />
                {/* Sharp edge accent */}
                <div
                    className="absolute top-0 h-full w-1 bg-orange-500"
                    style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
                />
            </div>
        </div>
    );
};

// Industrial Todo Item
const TodoItemRow: React.FC<{ item: TodoItem }> = ({ item }) => (
    <div
        className={`flex items-center gap-3 p-3 border-l-4 mb-2 transition-all ${item.completed
                ? 'border-l-green-500 bg-green-500/5'
                : 'border-l-orange-500 bg-orange-500/5'
            }`}
    >
        <div
            className={`w-5 h-5 flex items-center justify-center border-2 ${item.completed
                    ? 'border-green-500 bg-green-500 text-black'
                    : 'border-orange-500 bg-transparent'
                }`}
        >
            {item.completed && <span className="text-xs font-bold">✓</span>}
        </div>
        <span
            className={`font-mono text-sm flex-1 ${item.completed ? 'text-gray-500 line-through' : 'text-gray-300'
                }`}
        >
            {item.content}
        </span>
    </div>
);

const ArtifactsView: React.FC = () => {
    const runtime = useMercuryRuntime();

    const [planContent, setPlanContent] = useState<string | null>(null);
    const [todoContent, setTodoContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
            console.error('[Artifacts] Refresh failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [runtime]);

    // Initial load and polling every 1 second
    useEffect(() => {
        if (runtime.isReady) {
            refreshArtifacts();
            const interval = setInterval(refreshArtifacts, 1000);
            return () => clearInterval(interval);
        }
    }, [runtime.isReady, refreshArtifacts]);

    const todos = todoContent ? parseTodoItems(todoContent) : [];
    const completedCount = todos.filter(t => t.completed).length;

    // Placeholder when no artifacts exist
    if (!runtime.isReady) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#080808]">
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-orange-500/30" />
                    <p className="text-gray-500 font-mono text-sm">SYSTEM_NOT_READY</p>
                    <p className="text-gray-600 font-mono text-xs mt-2">Connect to sandbox to view artifacts</p>
                </div>
            </div>
        );
    }

    if (!planContent && !todoContent) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-[#080808]">
                <div className="text-center">
                    <FileText size={48} className="mx-auto mb-4 text-orange-500/30" />
                    <p className="text-gray-500 font-mono text-sm">WAITING_FOR_ARTIFACTS</p>
                    <p className="text-gray-600 font-mono text-xs mt-2">Agent will create PLAN.md and TODO.md</p>
                    <button
                        onClick={refreshArtifacts}
                        disabled={isLoading}
                        className="mt-4 flex items-center gap-2 px-4 py-2 border border-orange-500/30 text-orange-500 font-mono text-xs hover:bg-orange-500/10 transition-colors mx-auto"
                    >
                        <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                        REFRESH
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#080808] overflow-auto">
            {/* Header with refresh */}
            <div className="sticky top-0 z-10 bg-[#080808] border-b border-[#222] px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-orange-500 font-mono font-bold text-sm tracking-wider">ARTIFACTS</span>
                    {lastRefresh && (
                        <span className="text-gray-600 font-mono text-[10px]">
                            Updated {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                </div>
                <button
                    onClick={refreshArtifacts}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1 border border-[#333] text-gray-500 hover:text-orange-500 hover:border-orange-500/30 font-mono text-xs transition-colors"
                >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                    REFRESH
                </button>
            </div>

            <div className="p-6 space-y-8">
                {/* TODO Section - Industrial Checklist */}
                {todoContent && (
                    <div className="border border-[#333] bg-[#0a0a0a]">
                        <div className="border-b border-[#333] px-4 py-3 flex items-center gap-2 bg-[#111]">
                            <CheckSquare size={16} className="text-orange-500" />
                            <span className="font-mono font-bold text-sm text-orange-500 tracking-wider">TODO.md</span>
                        </div>
                        <div className="p-4">
                            <IndustrialProgressBar completed={completedCount} total={todos.length} />
                            <div className="space-y-1">
                                {todos.map(todo => (
                                    <TodoItemRow key={todo.id} item={todo} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PLAN Section - Markdown Rendered */}
                {planContent && (
                    <div className="border border-[#333] bg-[#0a0a0a]">
                        <div className="border-b border-[#333] px-4 py-3 flex items-center gap-2 bg-[#111]">
                            <FileText size={16} className="text-orange-500" />
                            <span className="font-mono font-bold text-sm text-orange-500 tracking-wider">PLAN.md</span>
                        </div>
                        <div className="p-4 prose prose-invert prose-orange prose-sm max-w-none font-mono">
                            <Streamdown>{planContent}</Streamdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtifactsView;