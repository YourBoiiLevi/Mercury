import { useCallback, useMemo } from 'react';
import { useE2B } from './useE2B';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useTerminal } from '../contexts/TerminalContext';
import { useGitHub } from '../contexts/GitHubContext';

// Convert Uint8Array to Base64 string (browser-compatible)
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

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

    // Browser methods
    browserNavigate: (url: string) => Promise<RuntimeToolResult>;
    browserScreenshot: () => Promise<RuntimeToolResult>;
    browserClick: (x: number, y: number, type: 'left' | 'right' | 'middle' | 'double') => Promise<RuntimeToolResult>;
    browserMoveMouse: (x: number, y: number) => Promise<RuntimeToolResult>;
    browserType: (text: string, delay?: number) => Promise<RuntimeToolResult>;
    browserPress: (key: string) => Promise<RuntimeToolResult>;
    browserScroll: (amount: number) => Promise<RuntimeToolResult>;
    browserDrag: (startX: number, startY: number, endX: number, endY: number) => Promise<RuntimeToolResult>;

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
    const SCREENSHOTS_DIR = '/home/user/mercury/screenshots';

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

    // -------------------------------------------------------------------------
    // BROWSER IMPLEMENTATIONS
    // -------------------------------------------------------------------------

    const browserNavigate = useCallback(async (url: string): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            // We use 'open' which typically opens the default browser (Chrome in this env)
            // Since we launched chrome at startup, this should open a new tab or use existing?
            // Actually, if chrome is running, `open <url>` might open in it.
            // But `sb.launch` is strictly for apps. 
            // `sb.open` is for files/URLs.
            await sb.open(url);
            return { success: true, data: { message: `Navigated to ${url}` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Navigation failed' };
        }
    }, [ensureSandbox]);

    const browserScreenshot = useCallback(async (): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const screenshot = await sb.screenshot(); // Uint8Array

            // Ensure dir exists
            await sb.commands.run(`mkdir -p ${SCREENSHOTS_DIR}`);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `screenshot-${timestamp}.png`;
            const path = `${SCREENSHOTS_DIR}/${filename}`;

            // Convert Uint8Array to ArrayBuffer for file write
            const buffer = screenshot.buffer.slice(screenshot.byteOffset, screenshot.byteOffset + screenshot.byteLength);
            await sb.files.write(path, buffer);

            // Convert to Base64 for LLM multimodal response and UI display
            const imageData = uint8ArrayToBase64(screenshot);

            return {
                success: true,
                data: {
                    message: `Screenshot saved to ${path}`,
                    path,
                    image_data: imageData, // Base64 for Gemini 3.0 multimodal and UI
                }
            };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Screenshot failed' };
        }
    }, [ensureSandbox]);

    const browserClick = useCallback(async (
        x: number,
        y: number,
        type: 'left' | 'right' | 'middle' | 'double'
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            switch (type) {
                case 'double': await sb.doubleClick(x, y); break;
                case 'right': await sb.rightClick(x, y); break;
                case 'middle': await sb.middleClick(x, y); break;
                case 'left':
                default:
                    await sb.leftClick(x, y); break;
            }
            return { success: true, data: { message: `Performed ${type} click at (${x}, ${y})` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Click failed' };
        }
    }, [ensureSandbox]);

    const browserMoveMouse = useCallback(async (x: number, y: number): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            await sb.moveMouse(x, y);
            return { success: true, data: { message: `Moved mouse to (${x}, ${y})` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Move mouse failed' };
        }
    }, [ensureSandbox]);

    const browserType = useCallback(async (text: string, delay?: number): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            // Default delay 10ms as per new default if not specified? 
            // SDK default is 75ms. User might want faster.
            // I'll leave SDK default if undefined, or passed value.
            await sb.write(text, { delayInMs: delay });
            return { success: true, data: { message: `Typed "${text}"` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Type failed' };
        }
    }, [ensureSandbox]);

    const browserPress = useCallback(async (key: string): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            await sb.press(key);
            return { success: true, data: { message: `Pressed "${key}"` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Press key failed' };
        }
    }, [ensureSandbox]);

    const browserScroll = useCallback(async (amount: number): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const direction = amount > 0 ? 'up' : 'down';
            await sb.scroll(direction, Math.abs(amount));
            return { success: true, data: { message: `Scrolled ${direction} by ${Math.abs(amount)}` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Scroll failed' };
        }
    }, [ensureSandbox]);

    const browserDrag = useCallback(async (startX: number, startY: number, endX: number, endY: number): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            await sb.drag([startX, startY], [endX, endY]);
            return { success: true, data: { message: `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})` } };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Drag failed' };
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

        // Browser methods
        browserNavigate,
        browserScreenshot,
        browserClick,
        browserMoveMouse,
        browserType,
        browserPress,
        browserScroll,
        browserDrag,

        isReady: sandbox !== null && projectRoot !== null,
        projectRoot,
    }), [
        readFile, writeFile, editFile, deleteFile, runCommand, refreshFiles, readArtifactFile, writeArtifactFile,
        browserNavigate, browserScreenshot, browserClick, browserMoveMouse, browserType, browserPress, browserScroll, browserDrag,
        sandbox, projectRoot
    ]);
};
