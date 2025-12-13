import React, { useState, useMemo } from 'react';
import { X, Play, ChevronDown, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TOOLS } from '../../../services/tools';
import { useToolExecutor } from '../../hooks/useToolExecutor';
import { ToolExecutionModal } from './ToolExecutionModal';

interface ManualOverridePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

// Extract parameter info from tool definition
interface ParamInfo {
    name: string;
    type: string;
    description: string;
    required: boolean;
}

const getToolParams = (toolName: string): ParamInfo[] => {
    const tool = TOOLS.find(t => t.name === toolName);
    if (!tool?.parameters?.properties) return [];

    const required = tool.parameters.required || [];
    return Object.entries(tool.parameters.properties).map(([name, prop]: [string, any]) => ({
        name,
        type: prop.type || 'string',
        description: prop.description || '',
        required: required.includes(name),
    }));
};

export const ManualOverridePanel: React.FC<ManualOverridePanelProps> = ({ isOpen, onClose }) => {
    const [selectedTool, setSelectedTool] = useState<string>(TOOLS[0]?.name || '');
    const [args, setArgs] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionState, setExecutionState] = useState<'running' | 'success' | 'error'>('running');
    const [executionResult, setExecutionResult] = useState<string>('');
    const [usedMock, setUsedMock] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const { executeTool, isRuntimeReady } = useToolExecutor();

    const params = useMemo(() => getToolParams(selectedTool), [selectedTool]);

    const handleToolChange = (toolName: string) => {
        setSelectedTool(toolName);
        setArgs({});
    };

    const handleArgChange = (name: string, value: any) => {
        setArgs(prev => ({ ...prev, [name]: value }));
    };

    const handleExecute = async () => {
        setIsExecuting(true);
        setExecutionState('running');
        setExecutionResult('');
        setShowModal(true);

        try {
            const result = await executeTool(selectedTool, args);
            setUsedMock(result.usedMock);

            if (result.success) {
                setExecutionState('success');
                setExecutionResult(JSON.stringify(result.data, null, 2));
            } else {
                setExecutionState('error');
                setExecutionResult(result.error || 'Unknown error');
            }
        } catch (err) {
            setExecutionState('error');
            setExecutionResult(err instanceof Error ? err.message : 'Execution failed');
        } finally {
            setIsExecuting(false);
        }
    };

    const renderInput = (param: ParamInfo) => {
        const value = args[param.name] ?? '';

        switch (param.type) {
            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => handleArgChange(param.name, e.target.checked)}
                        className="w-4 h-4 accent-orange-500"
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleArgChange(param.name, e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={param.description}
                        className="w-full px-3 py-2 bg-[#111] border border-[#333] text-gray-200 text-xs font-mono focus:border-orange-500/50 focus:outline-none"
                    />
                );
            case 'array':
            case 'object':
                return (
                    <textarea
                        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                        onChange={(e) => {
                            try {
                                handleArgChange(param.name, JSON.parse(e.target.value));
                            } catch {
                                handleArgChange(param.name, e.target.value);
                            }
                        }}
                        placeholder={`JSON: ${param.description}`}
                        rows={2}
                        className="w-full px-3 py-2 bg-[#111] border border-[#333] text-gray-200 text-xs font-mono focus:border-orange-500/50 focus:outline-none resize-none"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleArgChange(param.name, e.target.value)}
                        placeholder={param.description}
                        className="w-full px-3 py-2 bg-[#111] border border-[#333] text-gray-200 text-xs font-mono focus:border-orange-500/50 focus:outline-none"
                    />
                );
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-96 bg-[#0A0A0A] border-l border-[#333] z-50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[#333]">
                            <div className="flex items-center gap-2">
                                <span className="text-orange-500 font-mono text-sm font-medium">
                                    [MANUAL_OVERRIDE]
                                </span>
                                {isRuntimeReady ? (
                                    <Wifi size={12} className="text-green-500" />
                                ) : (
                                    <WifiOff size={12} className="text-yellow-500" />
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-[#222] transition-colors text-gray-400"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Runtime Status */}
                        {!isRuntimeReady && (
                            <div className="mx-4 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                                <AlertCircle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-yellow-500 font-mono">
                                    E2B sandbox not connected. Tools will execute in MOCK mode.
                                </p>
                            </div>
                        )}

                        {/* Tool Selector */}
                        <div className="p-4 border-b border-[#333]">
                            <label className="block text-xs text-gray-500 font-mono mb-2 uppercase tracking-wider">
                                Select Tool
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedTool}
                                    onChange={(e) => handleToolChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#111] border border-[#333] text-gray-200 text-xs font-mono appearance-none cursor-pointer focus:border-orange-500/50 focus:outline-none"
                                >
                                    {TOOLS.map(tool => (
                                        <option key={tool.name} value={tool.name}>
                                            {tool.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                            <p className="mt-2 text-xs text-gray-600 font-mono">
                                {TOOLS.find(t => t.name === selectedTool)?.description}
                            </p>
                        </div>

                        {/* Arguments Form */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <label className="block text-xs text-gray-500 font-mono mb-3 uppercase tracking-wider">
                                Arguments
                            </label>
                            <div className="space-y-4">
                                {params.length === 0 ? (
                                    <p className="text-xs text-gray-600 font-mono italic">
                                        No parameters required.
                                    </p>
                                ) : (
                                    params.map(param => (
                                        <div key={param.name}>
                                            <label className="flex items-center gap-1 text-xs text-gray-400 font-mono mb-1">
                                                {param.name}
                                                {param.required && (
                                                    <span className="text-red-500">*</span>
                                                )}
                                                <span className="text-gray-600">({param.type})</span>
                                            </label>
                                            {renderInput(param)}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Execute Button */}
                        <div className="p-4 border-t border-[#333]">
                            <button
                                onClick={handleExecute}
                                disabled={isExecuting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-black text-sm font-mono font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play size={16} />
                                {isExecuting ? 'EXECUTING...' : 'EXECUTE'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Execution Modal */}
            <ToolExecutionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                toolName={selectedTool}
                args={args}
                state={executionState}
                result={executionResult}
                usedMock={usedMock}
            />
        </>
    );
};
