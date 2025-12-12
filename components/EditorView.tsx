import React from 'react';
import { FileNode } from '../types';
import { Folder, FileCode, ChevronRight, ChevronDown, File } from 'lucide-react';
import CodeViewer from './CodeViewer';

interface EditorViewProps {
  files: FileNode[];
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
  onToggleFolder: (id: string) => void;
}

const FileTreeItem: React.FC<{
  node: FileNode;
  activeId: string | null;
  level: number;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}> = ({ node, activeId, level, onSelect, onToggle }) => {
  const isFolder = node.type === 'folder';
  const isActive = node.id === activeId;
  const paddingLeft = `${level * 16 + 12}px`;

  return (
    <div>
      <div
        className={`flex items-center py-1 cursor-pointer select-none border-l-2 hover:bg-mercury-carbon transition-colors duration-75
        ${isActive ? 'border-mercury-orange bg-mercury-orange/10 text-mercury-orange' : 'border-transparent text-gray-400'}
        `}
        style={{ paddingLeft }}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node.id)}
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
              key={child.id}
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

const EditorView: React.FC<EditorViewProps> = ({ files, activeFileId, onFileSelect, onToggleFolder }) => {
  // Helper to find content of active file
  const findNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeNode = activeFileId ? findNode(files, activeFileId) : null;
  const activeContent = activeNode && activeNode.type === 'file' ? activeNode.content : null;
  const activeLang = activeNode ? activeNode.language || 'text' : 'text';

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-mercury-orange/20 bg-mercury-black flex flex-col">
        <div className="p-3 border-b border-mercury-orange/20 text-mercury-orange/60 text-xs font-bold tracking-wider">
          // PROJECT_FILES
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {files.map(node => (
            <FileTreeItem
              key={node.id}
              node={node}
              activeId={activeFileId}
              level={0}
              onSelect={onFileSelect}
              onToggle={onToggleFolder}
            />
          ))}
        </div>
      </div>

      {/* Code Area */}
      <div className="flex-1 bg-mercury-carbon relative flex flex-col overflow-hidden">
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