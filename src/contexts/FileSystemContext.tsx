import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
    ReactNode
} from 'react';
import { useE2B } from '../hooks/useE2B';
import { useGitHub } from '../contexts/GitHubContext';

export interface FileTreeNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileTreeNode[];
    isOpen?: boolean;
}

export interface FileSystemContextValue {
    files: FileTreeNode[];
    refreshFileTree: () => Promise<void>;
    isLoading: boolean;
    toggleFolder: (path: string) => void;
    openFolders: Set<string>;
}

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

interface FileSystemProviderProps {
    children: ReactNode;
}

export const FileSystemProvider: React.FC<FileSystemProviderProps> = ({ children }) => {
    const { sandbox, status } = useE2B();
    const { repoPath, status: ghStatus, activeRepo } = useGitHub();
    const [files, setFiles] = useState<FileTreeNode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

    const buildTree = useCallback((entries: any[], basePath: string, openFoldersSet: Set<string>): FileTreeNode[] => {
        const pathMap = new Map<string, FileTreeNode>();
        const rootNodes: FileTreeNode[] = [];

        const sortedEntries = [...entries].sort((a, b) => {
            const aDepth = a.path.split('/').length;
            const bDepth = b.path.split('/').length;
            return aDepth - bDepth;
        });

        for (const entry of sortedEntries) {
            const node: FileTreeNode = {
                id: entry.path,
                name: entry.name,
                type: entry.type === 'dir' ? 'folder' : 'file',
                path: entry.path,
                isOpen: openFoldersSet.has(entry.path),
            };

            if (node.type === 'folder') {
                node.children = [];
            }

            pathMap.set(entry.path, node);

            const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'));
            const parentNode = pathMap.get(parentPath);

            if (parentNode && parentNode.children) {
                parentNode.children.push(node);
            } else if (entry.path.startsWith(basePath) && entry.path !== basePath) {
                const relativeDepth = entry.path.replace(basePath, '').split('/').filter(Boolean).length;
                if (relativeDepth === 1) {
                    rootNodes.push(node);
                }
            }
        }

        const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
            return nodes.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            }).map(node => {
                if (node.children) {
                    node.children = sortNodes(node.children);
                }
                return node;
            });
        };

        return sortNodes(rootNodes);
    }, []);

    const refreshFileTree = useCallback(async () => {
        if (!sandbox || !repoPath) return;

        setIsLoading(true);
        try {
            const entries = await sandbox.files.list(repoPath, { depth: 5 });

            const visible = entries.filter(e => !e.name.startsWith('.'));

            const tree = buildTree(visible, repoPath, openFolders);

            const root: FileTreeNode = {
                id: repoPath,
                name: activeRepo?.name || 'repository',
                type: 'folder',
                path: repoPath,
                isOpen: true,
                children: tree,
            };

            setFiles([root]);
            console.log('[FileSystem] Tree refreshed:', tree.length, 'root entries');
        } catch (err) {
            console.error('[FileSystem] Refresh failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [sandbox, repoPath, activeRepo, openFolders, buildTree]);

    const toggleFolder = useCallback((path: string) => {
        setOpenFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (status === 'connected' && sandbox && ghStatus === 'ready' && repoPath) {
            if (!openFolders.has(repoPath)) {
                setOpenFolders(new Set([repoPath]));
            }
            refreshFileTree();
        }
    }, [status, sandbox, ghStatus, repoPath]);

    const value = useMemo(() => ({
        files,
        refreshFileTree,
        isLoading,
        toggleFolder,
        openFolders,
    }), [files, refreshFileTree, isLoading, toggleFolder, openFolders]);

    return (
        <FileSystemContext.Provider value={value}>
            {children}
        </FileSystemContext.Provider>
    );
};

export const useFileSystem = (): FileSystemContextValue | null => {
    return useContext(FileSystemContext);
};

export const useFileSystemRequired = (): FileSystemContextValue => {
    const context = useContext(FileSystemContext);
    if (!context) {
        throw new Error('useFileSystemRequired must be used within FileSystemProvider');
    }
    return context;
};
