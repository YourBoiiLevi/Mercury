import React from 'react';
import { X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolWidget } from '../chat/ToolWidget';

interface ToolExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    toolName: string;
    args: Record<string, any>;
    state: 'running' | 'success' | 'error';
    result?: string;
    usedMock?: boolean;
}

export const ToolExecutionModal: React.FC<ToolExecutionModalProps> = ({
    isOpen,
    onClose,
    toolName,
    args,
    state,
    result,
    usedMock,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-2xl mx-4 bg-[#0A0A0A] border border-[#333] shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[#333]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 border border-orange-500/30">
                                    <Zap size={16} className="text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-mono font-medium text-gray-200">
                                        Manual Override Execution
                                    </h2>
                                    {usedMock && (
                                        <span className="text-xs text-yellow-500 font-mono">
                                            [MOCK MODE]
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-[#222] transition-colors text-gray-400 hover:text-gray-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Tool Widget */}
                        <div className="p-4">
                            <ToolWidget
                                toolName={toolName}
                                args={args}
                                state={state}
                                result={result}
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#333]">
                            <button
                                onClick={onClose}
                                disabled={state === 'running'}
                                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors disabled:opacity-50"
                            >
                                {state === 'running' ? 'EXECUTING...' : 'CLOSE'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
