import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    isRepoAttached?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, isRepoAttached = false }) => {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if (input.trim() && !disabled) {
            onSend(input);
            setInput('');
        }
    };

    return (
        <div className="relative z-10">
            <div className="relative flex items-center border border-[#FF3B00] bg-black group focus-within:ring-1 ring-[#FF3B00]/50 transition-all">
                <span className="pl-3 text-[#FF3B00] font-bold select-none font-mono">{'>'}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRepoAttached ? 'COMMAND_' : '[LOCKED] Connect repository to unlock...'}
                    disabled={disabled || !isRepoAttached}
                    className={`flex-1 bg-transparent border-none text-gray-300 font-mono p-3 focus:ring-0 focus:outline-none placeholder-[#FF3B00]/30 caret-[#FF3B00] ${!isRepoAttached ? 'opacity-50 cursor-not-allowed' : ''}`}
                    autoComplete="off"
                />
                <button
                    onClick={handleSend}
                    disabled={disabled || !input.trim() || !isRepoAttached}
                    className="p-3 text-[#FF3B00] hover:bg-[#FF3B00] hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#FF3B00] transition-colors"
                >
                    <Send size={16} />
                </button>
            </div>
            <div className="flex justify-between mt-1 px-1">
                <span className={`text-[10px] font-mono ${isRepoAttached ? 'text-[#FF3B00]/40' : 'text-orange-500/60'}`}>
                    {isRepoAttached ? 'MERCURY_ENGINE // ACTIVE' : 'MERCURY_ENGINE // STANDBY'}
                </span>
                <span className="text-[10px] text-[#FF3B00]/40 font-mono">
                    {isRepoAttached ? 'SECURE_LINK' : 'AWAITING_REPO'}
                </span>
            </div>
        </div>
    );
};
