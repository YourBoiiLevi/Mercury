import React from 'react';
import { Play, MessageSquare, Brain, Terminal, FileText, Globe, Wrench, ListTodo } from 'lucide-react';

interface DirectorControlsProps {
    triggers: {
        triggerUserMsg: () => void;
        triggerThinking: () => void;
        triggerAgentResp: () => void;
        triggerPlanUpdate: () => void;
        triggerTerminal: () => void;
        triggerFileEdit: () => void;
        triggerWebTool: () => void;
        triggerGenericTool: () => void;
    };
}

export const DirectorControls: React.FC<DirectorControlsProps> = ({ triggers }) => {
    return (
        <div className="fixed bottom-4 right-4 bg-[#111]/90 backdrop-blur-md border border-[#FF3B00]/50 p-4 rounded-none shadow-2xl z-50 w-64">
            <div className="text-[#FF3B00] text-xs font-mono mb-3 uppercase tracking-wider border-b border-[#FF3B00]/30 pb-1">
                Director Mode
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={triggers.triggerUserMsg} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <MessageSquare size={12} /> User Msg
                </button>
                <button onClick={triggers.triggerThinking} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <Brain size={12} /> Thinking
                </button>
                <button onClick={triggers.triggerAgentResp} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <Play size={12} /> Agent Resp
                </button>
                <button onClick={triggers.triggerPlanUpdate} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <ListTodo size={12} /> Plan Update
                </button>
                <button onClick={triggers.triggerTerminal} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <Terminal size={12} /> Terminal
                </button>
                <button onClick={triggers.triggerFileEdit} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <FileText size={12} /> File Edit
                </button>
                <button onClick={triggers.triggerWebTool} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <Globe size={12} /> Web Tool
                </button>
                <button onClick={triggers.triggerGenericTool} className="flex items-center gap-2 p-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-mono border border-[#444] transition-colors">
                    <Wrench size={12} /> Generic Tool
                </button>
            </div>
        </div>
    );
};
