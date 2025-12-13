import { useCallback, useMemo } from 'react';
import { useE2B } from './useE2B';
import { useFileSystem } from '../contexts/FileSystemContext';
import { useTerminal } from '../contexts/TerminalContext';

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
    listFiles: (path: string, recursive?: boolean, pattern?: string) => Promise<RuntimeToolResult>;
    runCommand: (command: string, cwd?: string, timeout?: number) => Promise<RuntimeToolResult>;
    grep: (pattern: string, path: string, includes?: string[], caseSensitive?: boolean) => Promise<RuntimeToolResult>;
    glob: (pattern: string, cwd?: string) => Promise<RuntimeToolResult>;
    isReady: boolean;
}

export const useMercuryRuntime = (): MercuryRuntime => {
    const { sandbox } = useE2B();
    const fileSystemContext = useFileSystem();
    const terminalContext = useTerminal();
    const refreshFileTree = fileSystemContext?.refreshFileTree;
    const addCommandEntry = terminalContext?.addCommandEntry;

    const ensureSandbox = useCallback(() => {
        if (!sandbox) {
            throw new Error('System not ready. E2B sandbox is not connected.');
        }
        return sandbox;
    }, [sandbox]);

    const readFile = useCallback(async (
        path: string,
        startLine?: number,
        endLine?: number
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const content = await sb.files.read(path);

            if (startLine !== undefined && endLine !== undefined) {
                const lines = content.split('\n');
                const sliced = lines.slice(startLine - 1, endLine).join('\n');
                return {
                    success: true,
                    data: {
                        path,
                        content: sliced,
                        lines: { from: startLine, to: endLine },
                        totalLines: lines.length
                    }
                };
            }

            return {
                success: true,
                data: {
                    path,
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
    }, [ensureSandbox]);

    const writeFile = useCallback(async (
        path: string,
        content: string
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            await sb.files.write(path, content);
            await refreshFileTree?.();

            return {
                success: true,
                data: {
                    path,
                    bytesWritten: new TextEncoder().encode(content).length,
                    message: `File created at ${path}`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Write failed'
            };
        }
    }, [ensureSandbox, refreshFileTree]);

    const editFile = useCallback(async (
        path: string,
        oldContent: string,
        newContent: string
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const existing = await sb.files.read(path);

            if (!existing.includes(oldContent)) {
                return {
                    success: false,
                    error: 'Old content not found in file'
                };
            }

            const updated = existing.replace(oldContent, newContent);
            await sb.files.write(path, updated);
            await refreshFileTree?.();

            return {
                success: true,
                data: {
                    path,
                    replacements: 1,
                    message: `Replaced content in ${path}`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Edit failed'
            };
        }
    }, [ensureSandbox, refreshFileTree]);

    const deleteFile = useCallback(async (path: string): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            await sb.files.remove(path);
            await refreshFileTree?.();

            return {
                success: true,
                data: {
                    path,
                    message: `Deleted ${path}`
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Delete failed'
            };
        }
    }, [ensureSandbox, refreshFileTree]);

    const listFiles = useCallback(async (
        path: string,
        recursive?: boolean,
        pattern?: string
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const entries = await sb.files.list(path, { depth: recursive ? 10 : 1 });

            let filtered = entries;
            if (pattern) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
                filtered = entries.filter(e => regex.test(e.name));
            }

            return {
                success: true,
                data: {
                    path,
                    entries: filtered.map(e => ({
                        name: e.name,
                        type: e.type === 'dir' ? 'directory' : 'file',
                        size: e.size,
                        path: e.path
                    })),
                    total: filtered.length
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'List failed'
            };
        }
    }, [ensureSandbox]);

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
            const fullCommand = cwd ? `cd ${cwd} && ${command}` : command;

            const result = await sb.commands.run(fullCommand, {
                timeoutMs: timeout || 30000,
            });

            await refreshFileTree?.();

            const stdout = trimOutput(result.stdout || '');
            const stderr = trimOutput(result.stderr || '');

            addCommandEntry?.(command, stdout, stderr, result.exitCode, cwd);

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
            addCommandEntry?.(command, '', errorMsg, 1, cwd);

            return {
                success: false,
                error: errorMsg
            };
        }
    }, [ensureSandbox, refreshFileTree, addCommandEntry]);

    const grep = useCallback(async (
        pattern: string,
        path: string,
        includes?: string[],
        caseSensitive = true
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            let cmd = `grep -rn${caseSensitive ? '' : 'i'} "${pattern}" ${path}`;

            if (includes && includes.length > 0) {
                const includeArgs = includes.map(i => `--include="${i}"`).join(' ');
                cmd = `grep -rn${caseSensitive ? '' : 'i'} ${includeArgs} "${pattern}" ${path}`;
            }

            const result = await sb.commands.run(cmd, { timeoutMs: 30000 });

            const matches = (result.stdout || '').split('\n').filter(Boolean).map(line => {
                const match = line.match(/^([^:]+):(\d+):(.*)$/);
                if (match) {
                    return { file: match[1], line: parseInt(match[2]), content: match[3] };
                }
                return null;
            }).filter(Boolean);

            return {
                success: true,
                data: {
                    pattern,
                    matches: matches.slice(0, 50),
                    totalMatches: matches.length
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Grep failed'
            };
        }
    }, [ensureSandbox]);

    const glob = useCallback(async (
        pattern: string,
        cwd?: string
    ): Promise<RuntimeToolResult> => {
        try {
            const sb = ensureSandbox();
            const basePath = cwd || '.';
            const cmd = `find ${basePath} -name "${pattern}" -type f 2>/dev/null | head -100`;

            const result = await sb.commands.run(cmd, { timeoutMs: 30000 });

            const matches = (result.stdout || '').split('\n').filter(Boolean);

            return {
                success: true,
                data: {
                    pattern,
                    matches,
                    total: matches.length
                }
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Glob failed'
            };
        }
    }, [ensureSandbox]);

    return useMemo(() => ({
        readFile,
        writeFile,
        editFile,
        deleteFile,
        listFiles,
        runCommand,
        grep,
        glob,
        isReady: sandbox !== null,
    }), [readFile, writeFile, editFile, deleteFile, listFiles, runCommand, grep, glob, sandbox]);
};
