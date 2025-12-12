import React, { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronRight, Terminal, Globe, FileText, Wrench, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToolWidgetProps {
    toolName: string;
    args: any;
    state: 'running' | 'success' | 'error';
    result?: string;
}

// Tool category detection - uses prefix convention: category_toolName
type ToolCategory = 'terminal' | 'web' | 'file' | 'planner' | 'generic';

const getToolCategory = (toolName: string): ToolCategory => {
    // Check for prefix-based naming (e.g., terminal_bash, web_search)
    if (toolName.startsWith('terminal_')) return 'terminal';
    if (toolName.startsWith('web_')) return 'web';
    if (toolName.startsWith('file_')) return 'file';
    if (toolName.startsWith('planner_')) return 'planner';

    // Fallback: detect by keyword in name
    if (toolName.includes('bash') || toolName.includes('grep') || toolName.includes('glob')) return 'terminal';
    if (toolName.includes('Search') || toolName.includes('fetch')) return 'web';
    if (toolName.includes('File') || toolName.includes('edit')) return 'file';
    if (toolName.includes('Todo') || toolName.includes('planner')) return 'planner';

    return 'generic';
};

const CATEGORY_CONFIG = {
    terminal: { icon: Terminal, color: 'text-orange-500' },
    web: { icon: Globe, color: 'text-blue-400' },
    file: { icon: FileText, color: 'text-yellow-400' },
    planner: { icon: ListChecks, color: 'text-purple-400' },
    generic: { icon: Wrench, color: 'text-gray-400' },
};

export const ToolWidget: React.FC<ToolWidgetProps> = ({ toolName, args, state, result }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const category = getToolCategory(toolName);
    const { icon: IconComponent, color } = CATEGORY_CONFIG[category];

    const getIcon = () => <IconComponent size={16} className={color} />;

    const getStatusIcon = () => {
        switch (state) {
            case 'running':
                return <Loader2 size={16} className="animate-spin text-orange-500" />;
            case 'success':
                return <Check size={16} className="text-green-500" />;
            case 'error':
                return <X size={16} className="text-red-500" />;
        }
    };

    return (
        <div className="border border-[#333] bg-[#0A0A0A] mb-2 overflow-hidden group">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-[#111] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#1A1A1A] border border-[#333]">
                        {getIcon()}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-200 font-mono">{toolName}</span>
                        <span className="text-xs text-gray-500 font-mono truncate max-w-[300px]">
                            {JSON.stringify(args).slice(0, 50)}...
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    {isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 border-t border-[#333] bg-[#050505] font-mono text-xs">
                            <div className="mb-2">
                                <div className="text-gray-500 mb-1">Arguments:</div>
                                <pre className="text-gray-300 overflow-x-auto p-2 bg-[#111] border border-[#222]">
                                    {JSON.stringify(args, null, 2)}
                                </pre>
                            </div>
                            {result && (
                                <div>
                                    <div className="text-gray-500 mb-1">Result:</div>
                                    <pre className={`overflow-x-auto p-2 bg-[#111] border border-[#222] ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                        {result}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
