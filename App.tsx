import React, { useState, useEffect, useRef } from 'react';
import ChatPane from './components/ChatPane';
import WorkspacePane from './components/WorkspacePane';
import { AppState, Tab, Message, FileNode, ChatState, ToolCallInfo } from './types';
import { INITIAL_FILES } from './constants';
import { createChatSession, sendMessageStream } from './services/geminiService';
import { executeToolMock } from './services/tools';
import { GenerateContentResponse } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

const App: React.FC = () => {
  // --- App State ---
  const [appState, setAppState] = useState<AppState>({
    activeTab: Tab.EDITOR,
    files: INITIAL_FILES,
    activeFileId: 'app_tsx',
  });

  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(true);

  // --- Chat State ---
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      {
        id: 'init-1',
        role: 'model',
        text: '# MERCURY_AGENT v1.0 ONLINE.\n\nAwaiting operational commands.',
        timestamp: Date.now(),
      }
    ],
    isLoading: false,
    input: '',
  });

  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    try {
        chatSessionRef.current = createChatSession();
    } catch (e) {
        console.error("Failed to init chat session", e);
        setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, {
                id: 'err-init',
                role: 'model',
                text: 'CRITICAL ERROR: API_KEY MISSING OR INVALID.\nCHECK ENV VARS.',
                timestamp: Date.now()
            }]
        }));
    }
  }, []);

  // --- Handlers ---
  const handleTabChange = (tab: Tab) => {
    setAppState(prev => ({ ...prev, activeTab: tab }));
    if (!isWorkspaceVisible) setIsWorkspaceVisible(true);
  };

  const handleFileSelect = (id: string) => {
    setAppState(prev => ({ ...prev, activeFileId: id }));
  };

  const handleToggleFolder = (id: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id) return { ...node, isOpen: !node.isOpen };
        if (node.children) return { ...node, children: toggleNode(node.children) };
        return node;
      });
    };
    setAppState(prev => ({ ...prev, files: toggleNode(prev.files) }));
  };

  const handleSendMessage = async () => {
    if (!chatState.input.trim() || !chatSessionRef.current) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: chatState.input,
      timestamp: Date.now()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      input: ''
    }));

    try {
      const resultStream = await sendMessageStream(chatSessionRef.current, userMsg.text);
      
      const responseId = (Date.now() + 1).toString();
      let accumulatedText = '';
      
      setChatState(prev => ({
         ...prev,
         messages: [...prev.messages, {
             id: responseId,
             role: 'model',
             text: '',
             timestamp: Date.now(),
             toolCalls: []
         }]
      }));

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        
        if (c.text) {
          accumulatedText += c.text;
        }

        const toolCalls: ToolCallInfo[] = [];
        if (c.functionCalls) {
           c.functionCalls.forEach(fc => {
               toolCalls.push({ name: fc.name, args: fc.args });
               executeToolMock(fc.name, fc.args).then(res => {
                    console.log("Tool result:", res);
               });
           });
        }

        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(m => 
            m.id === responseId 
              ? { ...m, text: accumulatedText, toolCalls: m.toolCalls ? [...m.toolCalls, ...toolCalls] : toolCalls }
              : m
          )
        }));
      }

    } catch (error) {
      console.error(error);
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: Date.now().toString(),
          role: 'model',
          text: `[ERROR] TRANSMISSION FAILED: ${error}`,
          timestamp: Date.now()
        }]
      }));
    } finally {
      setChatState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-mercury-black text-mercury-text font-mono selection:bg-mercury-orange selection:text-black relative">
      
      {/* Layout Toggle Button */}
      <button 
        onClick={() => setIsWorkspaceVisible(!isWorkspaceVisible)}
        className="absolute top-3 right-4 z-50 text-mercury-orange/50 hover:text-mercury-orange transition-colors"
        title={isWorkspaceVisible ? "Collapse Workspace" : "Open Workspace"}
      >
        {isWorkspaceVisible ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>

      {/* Left Pane: Comm Link */}
      <motion.div 
        layout
        className="h-full bg-mercury-black z-10"
        initial={false}
        animate={{ 
            width: isWorkspaceVisible ? "30%" : "100%",
            minWidth: isWorkspaceVisible ? "320px" : "100%",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <ChatPane 
          messages={chatState.messages}
          input={chatState.input}
          isLoading={chatState.isLoading}
          onInputChange={(val) => setChatState(p => ({ ...p, input: val }))}
          onSendMessage={handleSendMessage}
          isExpanded={!isWorkspaceVisible}
        />
      </motion.div>

      {/* Right Pane: Workspace */}
      <AnimatePresence>
        {isWorkspaceVisible && (
            <motion.div 
                className="h-full border-l border-mercury-orange/20 overflow-hidden"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "70%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <WorkspacePane 
                  appState={appState}
                  onTabChange={handleTabChange}
                  onFileSelect={handleFileSelect}
                  onToggleFolder={handleToggleFolder}
                />
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;