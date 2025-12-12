import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ThinkingBlockProps {
    content: string;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border border-[#333] bg-[#1A1A1A] mb-4 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 p-3 text-sm text-gray-400 hover:text-gray-200 transition-colors font-mono"
            >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Brain size={16} />
                <span className="italic">Thinking...</span>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 pt-0 text-sm text-gray-400 font-mono whitespace-pre-wrap border-t border-[#333]">
                            {content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
