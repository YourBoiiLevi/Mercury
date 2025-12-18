import React from 'react';
import WireframePanel from './WireframePanel';
import { ParsedTodos, TodoNode } from '../../utils/todoParser';
import { CheckSquare } from 'lucide-react';

interface ManifestPanelProps {
    parsedTodos: ParsedTodos;
}

const TodoItem: React.FC<{ node: TodoNode; activeId: string | null }> = ({ node, activeId }) => {
    // Current active task styling
    const isActive = node.isCurrent;

    return (
        <div className="font-mono text-xs">
            <div
                className={`flex items-start gap-2 py-1 px-2 transition-colors ${isActive ? 'bg-white text-black font-bold' :
                        node.completed ? 'text-gray-600 line-through' :
                            'text-gray-400 opacity-60'
                    }`}
                style={{ marginLeft: `${node.indent * 12}px` }}
            >
                <span className="mt-[2px]">
                    {node.completed ? '[x]' : isActive ? '[>]' : '[ ]'}
                </span>
                <span className="flex-1 break-words">
                    {node.content}
                </span>
                {isActive && (
                    <span className="animate-blink ml-2 inline-block w-2 h-4 bg-black"></span>
                )}
            </div>

            {node.children.map(child => (
                <TodoItem key={child.id} node={child} activeId={activeId} />
            ))}
        </div>
    );
};

const ManifestPanel: React.FC<ManifestPanelProps> = ({ parsedTodos }) => {
    const { tree, currentTask } = parsedTodos;

    return (
        <WireframePanel title="MANIFEST // TODO.md" className="h-full flex flex-col" noPadding>
            <div className="flex-1 overflow-auto p-4 space-y-1 scrollbar-hide">
                {tree.map(node => (
                    <TodoItem key={node.id} node={node} activeId={null} />
                ))}
            </div>
            {tree.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-700 text-xs font-mono p-4">
                    NO MANIFEST DATA FOUND
                </div>
            )}
        </WireframePanel>
    );
};

export default ManifestPanel;
