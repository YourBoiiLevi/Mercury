import { useCallback, useMemo } from 'react';
import { useE2B } from './useE2B';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useTerminal } from '../contexts/TerminalContext';
import { useGitHub } from '../contexts/GitHubContext';

export interface RuntimeToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface MercuryRuntime {
    readFile: (path: string, startLine?: number, endLine?: number) => Promise<RuntimeToolResult>;
    writeFile: (path: string, content: string) => Promise<RuntimeToolResult>;
    editFile: (path: string, oldContent: string, newContent: string) => Promise<RuntimeToolResult>;
    deleteFile: (path: string) => Promise<RuntimeToolResult>;
    runCommand: (command: string, cwd?: string, timeout?: number) => Promise<RuntimeToolResult>;
    refreshFiles: () => Promise<void>;
    // Artifact methods
    readArtifactFile: (filename: string) => Promise<RuntimeToolResult>;
    writeArtifactFile: (filename: string, content: string) => Promise<RuntimeToolResult>;
    isReady: boolean;
    projectRoot: string | null;
}

export const useMercuryRuntime = (): MercuryRuntime => {
    const { sandbox } = useE2B();
    const fileSystemContext = useFileSystem();
    const terminalContext = useTerminal();
    const { repoPath } = useGitHub();
    const refreshFileTree = fileSystemContext?.refreshFileTree;
    const addCommandEntry = terminalContext?.addCommandEntry;
    const projectRoot = repoPath;

    const ensureSandbox = useCallback(() => {
        if (!sandbox) {
            throw new Error('System not ready. E2B sandbox is not connected.');
        }
        return sandbox;
    }, [sandbox]);

    const resolvePath = useCallback((inputPath: string): string => {
        // Allow mercury artifacts directory
        if (inputPath.startsWith('/home/user/mercury')) {
            return inputPath;
        }
        if (!projectRoot) {
            throw new Error('No repository attached. Cannot resolve path.');
        }
        if (inputPath.startsWith(projectRoot)) return inputPath;
        if (inputPath.startsWith('/')) {
            throw new Error(`Access denied: paths must be within ${projectRoot}`);
        }
        return `${projectRoot}/${inputPath}`;
    }, [projectRoot]);

    const MERCURY_ARTIFACTS_DIR = '/home/user/mercury';

    const readFile = useCallback(async (
        path: string,
        startLine?: number,
        endLine?: number
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const resolvedPath = resolvePath(path);
            const content = await sb.files.read(resolvedPath);

            if (startLine !== undefined && endLine !== undefined) {
                const lines = content.split('\n');
                const sliced = lines.slice(startLine - 1, endLine).join('\n');
                return {
                    success: true,
                    data: {
                        path: resolvedPath,
                        content: sliced,
                        lines: { from: startLine, to: endLine },
                        totalLines: lines.length
                    }
                };
            }

            return {
                success: true,
                data: {
                    path: resolvedPath,
                    content,
                    lines: { from: 1, to: content.split('\n').length }
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Read failed'
            };
        }
    }, [ensureSandbox, resolvePath]);

    const writeFile = useCallback(async (
        path: string,
        content: string
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const resolvedPath = resolvePath(path);
            await sb.files.write(resolvedPath, content);
            await new Promise(resolve => setTimeout(resolve, 300));
            await refreshFileTree?.();

            return {
                success: true,
                data: {
                    path: resolvedPath,
                    bytesWritten: new TextEncoder().encode(content).length,
                    message: `File created at ${resolvedPath}`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Write failed'
            };
        }
    }, [ensureSandbox, resolvePath, refreshFileTree]);

    const editFile = useCallback(async (
        path: string,
        oldContent: string,
        newContent: string
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const resolvedPath = resolvePath(path);
            const existing = await sb.files.read(resolvedPath);

            if (!existing.includes(oldContent)) {
                return {
                    success: false,
                    error: 'Old content not found in file'
                };
            }

            const updated = existing.replace(oldContent, newContent);
            await sb.files.write(resolvedPath, updated);
            await new Promise(resolve => setTimeout(resolve, 300));
            await refreshFileTree?.();

            return {
                success: true,
                data: {
                    path: resolvedPath,
                    replacements: 1,
                    message: `Replaced content in ${resolvedPath}`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Edit failed'
            };
        }
    }, [ensureSandbox, resolvePath, refreshFileTree]);

    const deleteFile = useCallback(async (path: string): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const resolvedPath = resolvePath(path);
            await sb.files.remove(resolvedPath);
            await new Promise(resolve => setTimeout(resolve, 300));
            await refreshFileTree?.();

            return {
                success: true,
                data: {
                    path: resolvedPath,
                    message: `Deleted ${resolvedPath}`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Delete failed'
            };
        }
    }, [ensureSandbox, resolvePath, refreshFileTree]);

    const trimOutput = (str: string, max = 5000): string => {
        if (str.length <= max) return str;
        return str.slice(0, max) + `\n... [truncated ${str.length - max} chars]`;
    };

    const runCommand = useCallback(async (
        command: string,
        cwd?: string,
        timeout?: number
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            if (!projectRoot) {
                throw new Error('No repository attached. Cannot run commands.');
            }
            let effectiveCwd = projectRoot;
            if (cwd) {
                if (cwd.startsWith(projectRoot)) {
                    effectiveCwd = cwd;
                } else if (cwd.startsWith('/')) {
                    throw new Error(`Access denied: cwd must be within ${projectRoot}`);
                } else {
                    effectiveCwd = `${projectRoot}/${cwd}`;
                }
            }
            const fullCommand = `cd ${effectiveCwd} && ${command}`;

            const result = await sb.commands.run(fullCommand, {
                timeoutMs: timeout || 30000,
            });

            // Small delay to ensure filesystem has settled
            await new Promise(resolve => setTimeout(resolve, 300));
            await refreshFileTree?.();

            const stdout = trimOutput(result.stdout || '');
            const stderr = trimOutput(result.stderr || '');

            addCommandEntry?.(command, stdout, stderr, result.exitCode, effectiveCwd || undefined);

            return {
                success: true,
                data: {
                    stdout,
                    stderr,
                    exitCode: result.exitCode,
                }
            };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Command failed';
            addCommandEntry?.(command, '', errorMsg, 1, projectRoot || undefined);

            return {
                success: false,
                error: errorMsg
            };
        }
    }, [ensureSandbox, refreshFileTree, addCommandEntry, projectRoot]);

    const refreshFiles = useCallback(async () => {
        await refreshFileTree?.();
    }, [refreshFileTree]);

    // Artifact file operations (for PLAN.md, TODO.md)
    const readArtifactFile = useCallback(async (filename: string): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const artifactPath = `${MERCURY_ARTIFACTS_DIR}/${filename}`;

            // Check if directory exists, create if not
            try {
                await sb.files.list(MERCURY_ARTIFACTS_DIR);
            } catch {
                await sb.commands.run(`mkdir -p ${MERCURY_ARTIFACTS_DIR}`);
            }

            try {
                const content = await sb.files.read(artifactPath);
                return {
                    success: true,
                    data: { path: artifactPath, content }
                };
            } catch {
                // File doesn't exist yet
                return {
                    success: false,
                    error: 'FILE_NOT_FOUND'
                };
            }
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Read artifact failed'
            };
        }
    }, [ensureSandbox]);

    const writeArtifactFile = useCallback(async (filename: string, content: string): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const artifactPath = `${MERCURY_ARTIFACTS_DIR}/${filename}`;

            // Ensure directory exists
            await sb.commands.run(`mkdir -p ${MERCURY_ARTIFACTS_DIR}`);
            await sb.files.write(artifactPath, content);

            return {
                success: true,
                data: {
                    path: artifactPath,
                    bytesWritten: new TextEncoder().encode(content).length,
                    message: `Artifact ${filename} saved`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Write artifact failed'
            };
        }
    }, [ensureSandbox]);

    return useMemo(() => ({
        readFile,
        writeFile,
        editFile,
        deleteFile,
        runCommand,
        refreshFiles,
        readArtifactFile,
        writeArtifactFile,
        isReady: sandbox !== null && projectRoot !== null,
        projectRoot,
    }), [readFile, writeFile, editFile, deleteFile, runCommand, refreshFiles, readArtifactFile, writeArtifactFile, sandbox, projectRoot]);
};
