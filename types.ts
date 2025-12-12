export enum Tab {
  EDITOR = 'EDITOR',
  TERMINAL = 'TERMINAL',
  BROWSER = 'BROWSER',
  ARTIFACTS = 'ARTIFACTS',
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, any>;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  input: string;
}

export interface AppState {
  activeTab: Tab;
  files: FileNode[];
  activeFileId: string | null;
}