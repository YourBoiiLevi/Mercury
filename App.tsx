import React, { useState } from 'react';
import WorkspacePane from './components/WorkspacePane';
import { TimelineRenderer } from './src/components/chat/TimelineRenderer';
import { ChatInput } from './src/components/chat/ChatInput';
import { DirectorControls } from './src/components/debug/DirectorControls';
import { useDirectorMode } from './src/hooks/useDirectorMode';
import { useMercuryEngine } from './src/hooks/useMercuryEngine';
import { AppState, Tab, FileNode } from './types';
import { INITIAL_FILES } from './constants';
import { Bug, PanelRightClose, PanelRightOpen, Terminal, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    activeTab: Tab.EDITOR,
    files: INITIAL_FILES,
    activeFileId: 'app_tsx',
  });

  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(true);

  // Director Mode (for UI debugging)
  const [isDirectorMode, setIsDirectorMode] = useState(false);
  const { events: directorEvents, triggers } = useDirectorMode();

  // Mercury Engine (real AI)
  const { timeline: mercuryTimeline, isLoading, sendMessage } = useMercuryEngine();

  // Use director events or mercury timeline based on mode
  const events = isDirectorMode ? directorEvents : mercuryTimeline;

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

  const handleSend = (msg: string) => {
    if (isDirectorMode) {
      triggers.triggerUserMsg();
    } else {
      sendMessage(msg);
    }
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0A0A0A] text-gray-300 font-mono selection:bg-orange-500 selection:text-black relative">

      {/* Layout Toggle Button */}
      <button
        onClick={() => setIsWorkspaceVisible(!isWorkspaceVisible)}
        className="absolute top-3 right-4 z-50 text-orange-500/50 hover:text-orange-500 transition-colors"
        title={isWorkspaceVisible ? "Collapse Workspace" : "Open Workspace"}
      >
        {isWorkspaceVisible ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>

      {/* Left Pane: Comm Link (Chat) */}
      <motion.div
        layout
        className="h-full bg-[#050505] z-10 flex flex-col border-r border-[#222]"
        initial={false}
        animate={{
          width: isWorkspaceVisible ? "30%" : "100%",
          minWidth: isWorkspaceVisible ? "350px" : "100%",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="h-12 border-b border-[#222] flex items-center justify-between px-4 bg-[#0A0A0A] shrink-0 relative z-10">
          <div className="flex items-center gap-2 text-orange-500">
            <Terminal size={16} />
            <span className="font-bold tracking-widest text-sm">MERCURY_OS</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-1 text-orange-500/70 text-[10px]">
                <Zap size={10} className="animate-pulse" />
                <span>PROCESSING</span>
              </div>
            )}

            {/* Director Mode Toggle */}
            <button
              onClick={() => setIsDirectorMode(!isDirectorMode)}
              className={`flex items-center gap-2 px-2 py-1 text-[10px] font-mono border transition-colors ${isDirectorMode ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-[#333] text-gray-500 hover:text-gray-300'}`}
            >
              <Bug size={10} />
              {isDirectorMode ? 'DIRECTOR ON' : 'DIRECTOR OFF'}
            </button>
          </div>
        </div>

        {/* Timeline / Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {events.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#111] border border-[#222] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 animate-pulse" />
                </div>
                <p className="text-orange-500 tracking-widest font-mono">SYSTEM READY</p>
              </div>
            </div>
          ) : (
            <TimelineRenderer events={events} />
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#0A0A0A] border-t border-[#222] shrink-0 relative z-10">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
          />
        </div>
      </motion.div>

      {/* Right Pane: Workspace */}
      <AnimatePresence>
        {isWorkspaceVisible && (
          <motion.div
            className="h-full border-l border-orange-500/20 overflow-hidden bg-[#0A0A0A]"
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

      {/* Director Controls Overlay */}
      {isDirectorMode && <DirectorControls triggers={triggers} />}
    </div>
  );
};

export default App;