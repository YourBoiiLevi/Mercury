import React, { useState, useCallback, useEffect } from 'react';
import { FileNode } from '../types';
import { FileTreeNode, useFileSystem } from '../src/contexts/FileSystemContext';
import { useMercuryRuntime } from '../src/hooks/useMercuryRuntime';
import { Folder, FileCode, ChevronRight, ChevronDown, File, Loader2 } from 'lucide-react';
import CodeViewer from './CodeViewer';

interface EditorViewProps {
  files?: FileNode[];
  activeFileId?: string | null;
  onFileSelect?: (id: string) => void;
  onToggleFolder?: (id: string) => void;
}

const FileTreeItem: React.FC<{
  node: FileTreeNode | FileNode;
  activeId: string | null;
  level: number;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}> = ({ node, activeId, level, onSelect, onToggle }) => {
  const isFolder = node.type === 'folder';
  const nodePath = 'path' in node ? node.path : node.id;
  const isActive = nodePath === activeId;
  const paddingLeft = `${level * 16 + 12}px`;

  return (
    <div>
      <div
        className={`flex items-center py-1 cursor-pointer select-none border-l-2 hover:bg-mercury-carbon transition-colors duration-75
        ${isActive ? 'border-mercury-orange bg-mercury-orange/10 text-mercury-orange' : 'border-transparent text-gray-400'}
        `}
        style={{ paddingLeft }}
        onClick={() => isFolder ? onToggle(nodePath) : onSelect(nodePath)}
      >
        <span className="mr-2 opacity-70">
          {isFolder ? (
             node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <div className="w-[14px]" />
          )}
        </span>
        <span className="mr-2">
            {isFolder ? <Folder size={14} /> : <FileCode size={14} />}
        </span>
        <span className="text-sm tracking-tight">{node.name}</span>
      </div>
      {isFolder && node.isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem
              key={'path' in child ? child.path : child.id}
              node={child}
              activeId={activeId}
              level={level + 1}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EditorView: React.FC<EditorViewProps> = ({ 
  files: propFiles, 
  activeFileId: propActiveFileId, 
  onFileSelect: propOnFileSelect, 
  onToggleFolder: propOnToggleFolder 
}) => {
  const fileSystemContext = useFileSystem();
  const runtime = useMercuryRuntime();
  
  const [activeFileId, setActiveFileId] = useState<string | null>(propActiveFileId || null);
  const [activeContent, setActiveContent] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<string>('text');
  const [loadingFile, setLoadingFile] = useState(false);

  const files = fileSystemContext?.files || propFiles || [];
  const toggleFolder = fileSystemContext?.toggleFolder || propOnToggleFolder;
  const isLoading = fileSystemContext?.isLoading || false;

  const detectLanguage = useCallback((path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'html': 'html',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml',
      'rs': 'rust',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
    };
    return langMap[ext] || 'text';
  }, []);

  const handleFileSelect = useCallback(async (path: string) => {
    setActiveFileId(path);
    propOnFileSelect?.(path);

    if (runtime.isReady) {
      setLoadingFile(true);
      try {
        const result = await runtime.readFile(path);
        if (result.success && result.data) {
          setActiveContent(result.data.content);
          setActiveLang(detectLanguage(path));
        } else {
          setActiveContent(`// Error loading file: ${result.error}`);
          setActiveLang('text');
        }
      } catch (err) {
        setActiveContent(`// Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setActiveLang('text');
      } finally {
        setLoadingFile(false);
      }
    } else {
      const findNode = (nodes: (FileTreeNode | FileNode)[], id: string): (FileTreeNode | FileNode) | null => {
        for (const node of nodes) {
          const nodeId = 'path' in node ? node.path : node.id;
          if (nodeId === id) return node;
          if (node.children) {
            const found = findNode(node.children as (FileTreeNode | FileNode)[], id);
            if (found) return found;
          }
        }
        return null;
      };
      
      const node = findNode(files, path);
      if (node && 'content' in node && node.content) {
        setActiveContent(node.content);
        setActiveLang('language' in node ? node.language || 'text' : detectLanguage(path));
      } else {
        setActiveContent(null);
      }
    }
  }, [runtime, detectLanguage, propOnFileSelect, files]);

  const handleToggleFolder = useCallback((path: string) => {
    toggleFolder?.(path);
    propOnToggleFolder?.(path);
  }, [toggleFolder, propOnToggleFolder]);

  useEffect(() => {
    if (propActiveFileId && propActiveFileId !== activeFileId) {
      setActiveFileId(propActiveFileId);
    }
  }, [propActiveFileId]);

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-mercury-orange/20 bg-mercury-black flex flex-col">
        <div className="p-3 border-b border-mercury-orange/20 text-mercury-orange/60 text-xs font-bold tracking-wider flex items-center justify-between">
          <span>// PROJECT_FILES</span>
          {isLoading && <Loader2 size={12} className="animate-spin text-mercury-orange/50" />}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {files.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 text-xs">
              {runtime.isReady ? 'Loading files...' : 'Waiting for sandbox...'}
            </div>
          ) : (
            files.map(node => (
              <FileTreeItem
                key={'path' in node ? node.path : node.id}
                node={node}
                activeId={activeFileId}
                level={0}
                onSelect={handleFileSelect}
                onToggle={handleToggleFolder}
              />
            ))
          )}
        </div>
      </div>

      {/* Code Area */}
      <div className="flex-1 bg-mercury-carbon relative flex flex-col overflow-hidden">
         {loadingFile && (
           <div className="absolute inset-0 z-20 flex items-center justify-center bg-mercury-carbon/80">
             <div className="flex items-center gap-2 text-mercury-orange">
               <Loader2 size={20} className="animate-spin" />
               <span className="text-xs tracking-wider">LOADING_FILE...</span>
             </div>
           </div>
         )}
         {activeContent !== null ? (
             <>
               <div className="absolute top-0 right-0 p-2 z-10 bg-mercury-carbon/80 backdrop-blur border-b border-l border-mercury-orange/10 text-xs text-mercury-orange/40 font-mono">
                 [READ_ONLY] {activeLang.toUpperCase()}
               </div>
               <CodeViewer code={activeContent} lang={activeLang} />
             </>
         ) : (
             <div className="h-full flex flex-col items-center justify-center text-mercury-orange/30">
                 <File size={48} strokeWidth={1} />
                 <span className="mt-4 text-xs tracking-widest">[NO_FILE_SELECTED]</span>
             </div>
         )}
      </div>
    </div>
  );
};

export default EditorView;
