import React from 'react';
import { Tab, AppState } from '../types';
import EditorView from './EditorView';
import TerminalView from './TerminalView';
import BrowserView from './BrowserView';
import DashboardView from './DashboardView';
import { Code, Terminal, Globe, LayoutDashboard } from 'lucide-react';

interface WorkspacePaneProps {
  appState: AppState;
  onTabChange: (tab: Tab) => void;
  onFileSelect?: (id: string) => void;
  onToggleFolder?: (id: string) => void;
}

const TabButton: React.FC<{
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ active, label, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-6 py-3 font-mono text-sm font-bold tracking-wider transition-all
      border-r border-mercury-orange/20
      ${active
        ? 'bg-mercury-orange text-black'
        : 'bg-mercury-carbon text-gray-500 hover:text-mercury-orange hover:bg-mercury-carbon/80'}
    `}
  >
    {icon}
    {label}
  </button>
);

const WorkspacePane: React.FC<WorkspacePaneProps> = ({ appState, onTabChange, onFileSelect, onToggleFolder }) => {
  return (
    <div className="h-full flex flex-col bg-mercury-carbon dot-grid-bg">
      {/* Top Nav */}
      <div className="flex border-b border-mercury-orange/30 bg-mercury-black">
        <TabButton
          active={appState.activeTab === Tab.EDITOR}
          label="EDITOR"
          icon={<Code size={16} />}
          onClick={() => onTabChange(Tab.EDITOR)}
        />
        <TabButton
          active={appState.activeTab === Tab.TERMINAL}
          label="TERMINAL"
          icon={<Terminal size={16} />}
          onClick={() => onTabChange(Tab.TERMINAL)}
        />
        <TabButton
          active={appState.activeTab === Tab.BROWSER}
          label="BROWSER"
          icon={<Globe size={16} />}
          onClick={() => onTabChange(Tab.BROWSER)}
        />
        <TabButton
          active={appState.activeTab === Tab.ARTIFACTS}
          label="DASHBOARD"
          icon={<LayoutDashboard size={16} />}
          onClick={() => onTabChange(Tab.ARTIFACTS)}
        />

        {/* Fill remaining space */}
        <div className="flex-1 flex items-center justify-end px-4 gap-4 text-xs text-mercury-orange/40 font-mono">
          <span>CPU: 12%</span>
          <span>MEM: 4.2GB</span>
          <span>NET: 1Gbps</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {appState.activeTab === Tab.EDITOR && (
          <EditorView
            files={appState.files}
            activeFileId={appState.activeFileId}
            onFileSelect={onFileSelect}
            onToggleFolder={onToggleFolder}
          />
        )}
        {appState.activeTab === Tab.TERMINAL && <TerminalView />}
        {appState.activeTab === Tab.BROWSER && <BrowserView />}
        {appState.activeTab === Tab.ARTIFACTS && <DashboardView />}
      </div>
    </div>
  );
};

export default WorkspacePane;
