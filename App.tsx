import React, { useState, useEffect } from 'react';
import WorkspacePane from './components/WorkspacePane';
import { TimelineRenderer } from './src/components/chat/TimelineRenderer';
import { ChatInput } from './src/components/chat/ChatInput';
import { DirectorControls } from './src/components/debug/DirectorControls';
import DebugUplink from './src/components/debug/DebugUplink';
import ManualOverrideButton from './src/components/debug/ManualOverrideButton';
import SystemStatus from './src/components/machine/SystemStatus';
import { GitHubAuthModal, RepoPickerModal, HydrationLoadingBar, GitHubStatusIndicator } from './src/components/github';
import { useDirectorMode } from './src/hooks/useDirectorMode';
import { useMercuryEngine } from './src/hooks/useMercuryEngine';
import { useE2B } from './src/hooks/useE2B';
import { useGitHub, GitHubRepo } from './src/contexts/GitHubContext';
import { useExa } from './src/contexts/ExaContext';
import { E2BProvider } from './src/contexts/E2BContext';
import { ExaProvider } from './src/contexts/ExaContext';
import { FileSystemProvider } from './src/contexts/FileSystemContext';
import { TerminalProvider } from './src/contexts/TerminalContext';
import { GitHubProvider } from './src/contexts/GitHubContext';
import { AppState, Tab, FileNode } from './types';
import { INITIAL_FILES } from './constants';
import { Bug, PanelRightClose, PanelRightOpen, Terminal, Zap, Key, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
  onClose: () => void;
  error?: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSubmit, onClose, error }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl shadow-orange-500/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-orange-500">
            <Key size={18} />
            <span className="font-mono font-bold tracking-wider text-sm">E2B_AUTH_REQUIRED</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-orange-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 font-mono mb-2 tracking-wider">
              API_KEY
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e2b_..."
              className="w-full bg-[#050505] border border-[#333] rounded px-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-xs font-mono">
              ERR: {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#111] border border-[#333] rounded font-mono text-xs text-gray-500 hover:text-gray-300 hover:border-[#444] transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="flex-1 px-4 py-2 bg-orange-500 rounded font-mono text-xs text-black font-bold tracking-wider hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONNECT
            </button>
          </div>
        </form>

        <div className="mt-4 text-[10px] text-gray-600 font-mono">
          // Set VITE_E2B_API_KEY in .env to skip this prompt
        </div>
      </motion.div>
    </div>
  );
};

// Exa API Key Settings Modal
interface ExaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExaSettingsModal: React.FC<ExaSettingsModalProps> = ({ isOpen, onClose }) => {
  const exaContext = useExa();
  const [inputKey, setInputKey] = useState(exaContext?.apiKey || '');

  useEffect(() => {
    if (isOpen && exaContext?.apiKey) {
      setInputKey(exaContext.apiKey);
    }
  }, [isOpen, exaContext?.apiKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim() && exaContext) {
      exaContext.setApiKey(inputKey.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0A0A0A] border border-orange-500/30 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl shadow-orange-500/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-orange-500">
            <Settings size={18} />
            <span className="font-mono font-bold tracking-wider text-sm">EXA_API_KEY</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-orange-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 font-mono mb-2 tracking-wider">
              API_KEY
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Enter your Exa API key..."
              className="w-full bg-[#050505] border border-[#333] rounded px-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              autoFocus
            />
          </div>

          {exaContext?.isReady && (
            <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-green-500 text-xs font-mono">
              ✓ Exa client connected
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#111] border border-[#333] rounded font-mono text-xs text-gray-500 hover:text-gray-300 hover:border-[#444] transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!inputKey.trim()}
              className="flex-1 px-4 py-2 bg-orange-500 rounded font-mono text-xs text-black font-bold tracking-wider hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SAVE
            </button>
          </div>
        </form>

        <div className="mt-4 text-[10px] text-gray-600 font-mono">
          // Get your API key from dashboard.exa.ai
        </div>
      </motion.div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    activeTab: Tab.EDITOR,
    files: INITIAL_FILES,
    activeFileId: 'app_tsx',
  });

  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showGitHubAuthModal, setShowGitHubAuthModal] = useState(false);
  const [showRepoPickerModal, setShowRepoPickerModal] = useState(false);
  const [showExaSettingsModal, setShowExaSettingsModal] = useState(false);

  const [isDirectorMode, setIsDirectorMode] = useState(false);
  const { events: directorEvents, triggers } = useDirectorMode();

  const { timeline: mercuryTimeline, isLoading, sendMessage } = useMercuryEngine();

  const { status: e2bStatus, connect, disconnect, error: e2bError, sandboxId, sandbox } = useE2B();

  const {
    status: ghStatus,
    error: ghError,
    user: ghUser,
    activeRepo,
    hydration,
    authenticate: ghAuthenticate,
    hydrateRepo
  } = useGitHub();

  const events = isDirectorMode ? directorEvents : mercuryTimeline;

  useEffect(() => {
    const envKey = import.meta.env.VITE_E2B_API_KEY;
    if (envKey && e2bStatus === 'disconnected') {
      connect(envKey);
    } else if (!envKey && e2bStatus === 'disconnected') {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleApiKeySubmit = async (apiKey: string) => {
    await connect(apiKey);
    if (e2bStatus !== 'error') {
      setShowApiKeyModal(false);
    }
  };

  useEffect(() => {
    if (e2bStatus === 'connected') {
      setShowApiKeyModal(false);
    }
  }, [e2bStatus]);

  const handleGitHubAuth = async (pat: string): Promise<boolean> => {
    const success = await ghAuthenticate(pat);
    if (success) {
      setShowGitHubAuthModal(false);
      setShowRepoPickerModal(true);
    }
    return success;
  };

  const handleRepoSelect = async (repo: GitHubRepo) => {
    setShowRepoPickerModal(false);
    if (sandbox) {
      await hydrateRepo(repo, sandbox);
    }
  };

  const handleGitHubStatusClick = () => {
    if (ghStatus === 'disconnected') {
      setShowGitHubAuthModal(true);
    } else if (ghStatus === 'authenticated') {
      setShowRepoPickerModal(true);
    }
  };

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

  const isHydrating = ghStatus === 'hydrating';

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0A0A0A] text-gray-300 font-mono selection:bg-orange-500 selection:text-black relative">

      <button
        onClick={() => setIsWorkspaceVisible(!isWorkspaceVisible)}
        className="absolute top-3 right-4 z-50 text-orange-500/50 hover:text-orange-500 transition-colors"
        title={isWorkspaceVisible ? "Collapse Workspace" : "Open Workspace"}
      >
        {isWorkspaceVisible ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
      </button>

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
        <div className="h-12 border-b border-[#222] flex items-center justify-between px-4 bg-[#0A0A0A] shrink-0 relative z-10">
          <div className="flex items-center gap-2 text-orange-500">
            <Terminal size={16} />
            <span className="font-bold tracking-widest text-sm">MERCURY_OS</span>
          </div>

          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-1 text-orange-500/70 text-[10px]">
                <Zap size={10} className="animate-pulse" />
                <span>PROCESSING</span>
              </div>
            )}

            <button
              onClick={() => setIsDirectorMode(!isDirectorMode)}
              className={`flex items-center gap-2 px-2 py-1 text-[10px] font-mono border transition-colors ${isDirectorMode ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-[#333] text-gray-500 hover:text-gray-300'}`}
            >
              <Bug size={10} />
              {isDirectorMode ? 'DIRECTOR ON' : 'DIRECTOR OFF'}
            </button>

            <button
              onClick={() => setShowExaSettingsModal(true)}
              className="flex items-center gap-2 px-2 py-1 text-[10px] font-mono border border-[#333] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Settings size={10} />
              Exa API Key
            </button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-[#222] bg-[#080808] flex items-center justify-between gap-4">
          <SystemStatus
            status={e2bStatus}
            error={e2bError}
            sandboxId={sandboxId}
            isRepoAttached={ghStatus === 'ready' && activeRepo !== null}
            repoName={activeRepo?.full_name}
          />
          <GitHubStatusIndicator
            status={ghStatus}
            repoName={activeRepo?.name}
            userName={ghUser?.login}
            onClick={handleGitHubStatusClick}
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {events.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#111] border border-[#222] flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full ${ghStatus === 'ready' && activeRepo ? 'bg-green-500/20' : 'bg-orange-500/20'} animate-pulse`} />
                </div>
                <p className={`${ghStatus === 'ready' && activeRepo ? 'text-green-500' : 'text-orange-500'} tracking-widest font-mono`}>
                  {ghStatus === 'ready' && activeRepo ? 'SYSTEM READY' : 'AWAITING REPOSITORY'}
                </p>
              </div>
            </div>
          ) : (
            <TimelineRenderer events={events} />
          )}
        </div>

        <div className="p-4 bg-[#0A0A0A] border-t border-[#222] shrink-0 relative z-10">
          <AnimatePresence mode="wait">
            {isHydrating ? (
              <HydrationLoadingBar
                hydration={hydration}
                repoName={activeRepo?.name}
              />
            ) : (
              <ChatInput
                onSend={handleSend}
                disabled={isLoading}
                isRepoAttached={ghStatus === 'ready' && activeRepo !== null}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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

      {isDirectorMode && <DirectorControls triggers={triggers} />}

      <AnimatePresence>
        {showApiKeyModal && (
          <ApiKeyModal
            isOpen={showApiKeyModal}
            onSubmit={handleApiKeySubmit}
            onClose={() => setShowApiKeyModal(false)}
            error={e2bError}
          />
        )}
      </AnimatePresence>

      <GitHubAuthModal
        isOpen={showGitHubAuthModal}
        onClose={() => setShowGitHubAuthModal(false)}
        onSubmit={handleGitHubAuth}
        error={ghError}
      />

      <RepoPickerModal
        isOpen={showRepoPickerModal}
        onClose={() => setShowRepoPickerModal(false)}
        onSelectRepo={handleRepoSelect}
      />

      <ExaSettingsModal
        isOpen={showExaSettingsModal}
        onClose={() => setShowExaSettingsModal(false)}
      />

      <ManualOverrideButton />
      <DebugUplink />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <E2BProvider>
      <ExaProvider>
        <GitHubProvider>
          <FileSystemProvider>
            <TerminalProvider>
              <AppContent />
            </TerminalProvider>
          </FileSystemProvider>
        </GitHubProvider>
      </ExaProvider>
    </E2BProvider>
  );
};

export default App;
