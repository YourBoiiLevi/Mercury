import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { Send, Cpu, Search, Terminal } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface ChatPaneProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
  isExpanded: boolean;
}

const ChatPane: React.FC<ChatPaneProps> = ({ messages, input, isLoading, onInputChange, onSendMessage, isExpanded }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className={`h-full flex flex-col bg-mercury-black border-r border-mercury-orange/30 relative transition-all duration-300 ${isExpanded ? 'mx-auto max-w-[900px] border-r-0' : ''}`}>
        {/* CRT Scanline Overlay - Placed on top but ignores pointer events so scrolling works */}
        <div className="absolute inset-0 scanline-bg pointer-events-none z-20"></div>

        {/* Header */}
        <div className="h-12 border-b border-mercury-orange/30 flex items-center justify-between px-4 bg-mercury-carbon/50 shrink-0 relative z-10">
            <div className="flex items-center gap-2 text-mercury-orange">
                <Terminal size={16} />
                <span className="font-bold tracking-widest text-sm">COMM_LINK</span>
            </div>
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-mercury-orange animate-pulse"></div>
                <div className="w-2 h-2 bg-mercury-orange/30"></div>
                <div className="w-2 h-2 bg-mercury-orange/30"></div>
            </div>
        </div>

        {/* Messages */}
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 space-y-8 relative z-10"
        >
            {messages.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <div className="text-center">
                        <Cpu size={64} className="mx-auto mb-4 text-mercury-orange" />
                        <p className="text-mercury-orange tracking-widest font-mono">SYSTEM ONLINE</p>
                    </div>
                </div>
            )}

            {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`w-full ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                        {/* Meta Header */}
                        <div className={`text-[10px] mb-2 font-mono opacity-50 flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse text-mercury-orange' : 'text-gray-500'}`}>
                            <span>{msg.role === 'user' ? 'OP_USER' : 'SYS_AGENT'}</span>
                            <span>::</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour12: false})}</span>
                        </div>

                        {/* Content */}
                        <div className={`
                            text-sm leading-relaxed font-sans max-w-full
                            ${msg.role === 'user' 
                                ? 'bg-mercury-orange text-black p-3 max-w-[85%] shadow-[4px_4px_0px_rgba(255,59,0,0.3)]' 
                                : 'text-mercury-text w-full prose-mercury'}
                        `}>
                            {msg.role === 'user' ? (
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            ) : (
                                <Streamdown 
                                    mermaid={{
                                        config: {
                                        theme: 'base',
                                        themeVariables: {
                                            darkMode: true,
                                            background: '#050505',
                                            primaryColor: '#121212',
                                            mainBkg: '#121212',
                                            primaryTextColor: '#FF3B00',
                                            primaryBorderColor: '#FF3B00',
                                            lineColor: '#FF3B00',
                                            secondaryColor: '#050505',
                                            tertiaryColor: '#121212',
                                            nodeBorder: '#FF3B00',
                                            clusterBkg: '#050505',
                                            clusterBorder: '#FF3B00',
                                            defaultLinkColor: '#FF3B00',
                                            fontFamily: '"Courier New", Courier, monospace',
                                            fontSize: '14px'
                                        },
                                        themeCSS: `
                                            .node rect, .cluster rect, .label-container rect, .node circle, .node polygon, .node path { rx: 0 !important; ry: 0 !important; stroke-width: 2px !important; }
                                            .edgePath .path { stroke: #FF3B00 !important; stroke-width: 2px !important; }
                                            .cluster rect { stroke: rgba(255, 59, 0, 0.2) !important; stroke-dasharray: 4 4; stroke-width: 1px !important; }
                                            text { text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
                                            .marker { fill: #FF3B00 !important; stroke: #FF3B00 !important; }
                                        `
                                        }
                                    }}
                                >
                                    {msg.text}
                                </Streamdown>
                            )}
                        </div>
                        
                        {/* Tool Calls Visualization */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                             <div className="mt-2 space-y-1 font-mono w-full">
                                 {msg.toolCalls.map((tool, idx) => (
                                     <div key={idx} className="flex items-center gap-2 text-xs text-mercury-orange/70 bg-black border border-mercury-orange/20 p-1 px-2 w-max">
                                         <Search size={12} />
                                         <span className="font-bold">EXEC:</span>
                                         <span>{tool.name}</span>
                                         <span className="opacity-50 text-[10px] truncate max-w-[150px]">{JSON.stringify(tool.args)}</span>
                                     </div>
                                 ))}
                             </div>
                        )}
                    </div>
                </div>
            ))}
            
            {isLoading && (
                <div className="flex items-start">
                     <div className="bg-mercury-carbon border border-gray-700 p-2 text-xs text-mercury-orange animate-pulse font-mono">
                        [PROCESSING_REQUEST]...
                     </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-mercury-black border-t border-mercury-orange/30 shrink-0 relative z-10">
            <div className="relative flex items-center border border-mercury-orange bg-black group focus-within:ring-1 ring-mercury-orange/50 transition-all">
                <span className="pl-3 text-mercury-orange font-bold select-none font-mono">{'>'}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="COMMAND_"
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none text-mercury-text font-mono p-3 focus:ring-0 focus:outline-none placeholder-mercury-orange/30 caret-mercury-orange"
                    autoComplete="off"
                />
                <button 
                    onClick={onSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="p-3 text-mercury-orange hover:bg-mercury-orange hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mercury-orange transition-colors"
                >
                    <Send size={16} />
                </button>
            </div>
            <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] text-mercury-orange/40 font-mono">GEMINI_3_PRO // ACTIVE</span>
                <span className="text-[10px] text-mercury-orange/40 font-mono">SECURE_LINK</span>
            </div>
        </div>
    </div>
  );
};

export default ChatPane;