import { useCallback } from 'react';
import { useMercuryRuntime, RuntimeToolResult } from './useMercuryRuntime';
import { useExa } from '../contexts/ExaContext';

type ToolExecutorFn = (args: Record<string, any>) => Promise<RuntimeToolResult>;

// GitHub tools are handled externally via GitHubContext
const GITHUB_TOOLS = ['github_createPR'];

export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
}

export const useToolExecutor = () => {
    const runtime = useMercuryRuntime();
    const exaContext = useExa();

    // Maps tool names to their real runtime implementations
    const createToolMapping = useCallback((): Record<string, ToolExecutorFn> => ({
        // File System Tools
        'file_readFile': async (args) => runtime.readFile(args.path, args.startLine, args.endLine),
        'file_writeFile': async (args) => runtime.writeFile(args.path, args.content),
        'file_editFile': async (args) => runtime.editFile(args.path, args.oldContent, args.newContent),
        'file_deleteFile': async (args) => runtime.deleteFile(args.path),

        // Terminal Tool (Bash-heavy approach)
        'terminal_bash': async (args) => runtime.runCommand(args.command, args.cwd, args.timeout),

        // Web Tools (Exa-powered)
        'web_search': async (args) => {
            if (!exaContext?.exaClient) {
                return { success: false, error: 'Exa API key not configured. Please set it in Settings.' };
            }
            try {
                const results = await exaContext.exaClient.searchAndContents(args.query, {
                    text: true,
                    highlights: true,
                    numResults: args.numResults || 5
                });
                return {
                    success: true,
                    data: {
                        query: args.query,
                        results: results.results.map((r: any) => ({
                            title: r.title,
                            url: r.url,
                            text: r.text?.slice(0, 500),
                            highlights: r.highlights
                        })),
                        totalResults: results.results.length
                    }
                };
            } catch (err) {
                return { success: false, error: err instanceof Error ? err.message : 'Exa search failed' };
            }
        },

        'web_fetch': async (args) => {
            if (!exaContext?.exaClient) {
                return { success: false, error: 'Exa API key not configured. Please set it in Settings.' };
            }
            try {
                const urls = Array.isArray(args.url) ? args.url : [args.url];
                const results = await exaContext.exaClient.getContents(urls, { text: true });
                return {
                    success: true,
                    data: {
                        contents: results.results.map((r: any) => ({
                            url: r.url,
                            title: r.title,
                            text: r.text
                        }))
                    }
                };
            } catch (err) {
                return { success: false, error: err instanceof Error ? err.message : 'Exa fetch failed' };
            }
        },

        'web_answer': async (args) => {
            if (!exaContext?.exaClient) {
                return { success: false, error: 'Exa API key not configured. Please set it in Settings.' };
            }
            try {
                const result = await exaContext.exaClient.answer(args.query, { text: true });
                return {
                    success: true,
                    data: {
                        query: args.query,
                        answer: result.answer,
                        citations: result.citations?.map((c: any) => ({
                            title: c.title,
                            url: c.url
                        }))
                    }
                };
            } catch (err) {
                return { success: false, error: err instanceof Error ? err.message : 'Exa answer failed' };
            }
        },

        // Planner Tools (file-based artifacts)
        'planner_createPlan': async (args) => {
            return runtime.writeArtifactFile('PLAN.md', args.content);
        },

        'planner_readTodos': async () => {
            return runtime.readArtifactFile('TODO.md');
        },

        'planner_writeTodos': async (args) => {
            return runtime.writeArtifactFile('TODO.md', args.content);
        },

        // Browser Tools (Computer Use)
        'browser_navigate': async (args) => runtime.browserNavigate(args.url),
        'browser_screenshot': async () => runtime.browserScreenshot(),
        'browser_leftClick': async (args) => runtime.browserClick(args.x, args.y, 'left'),
        'browser_doubleClick': async (args) => runtime.browserClick(args.x, args.y, 'double'),
        'browser_rightClick': async (args) => runtime.browserClick(args.x, args.y, 'right'),
        'browser_moveMouse': async (args) => runtime.browserMoveMouse(args.x, args.y),
        'browser_type': async (args) => runtime.browserType(args.text, args.delay),
        'browser_press': async (args) => runtime.browserPress(args.key),
        'browser_scroll': async (args) => runtime.browserScroll(args.amount),
        'browser_drag': async (args) => runtime.browserDrag(args.startX, args.startY, args.endX, args.endY),
    }), [runtime, exaContext]);

    const executeTool = useCallback(async (
        toolName: string,
        args: Record<string, any>
    ): Promise<ToolExecutionResult> => {
        // E2B sandbox must be connected for tool execution
        if (!runtime.isReady) {
            return {
                success: false,
                error: 'E2B sandbox not connected. Please connect to sandbox first.',
            };
        }

        if (GITHUB_TOOLS.includes(toolName)) {
            // GitHub tools require external handling via GitHubContext
            return {
                success: false,
                error: 'GITHUB_TOOL_REQUIRES_CONTEXT',
            };
        }

        const toolMapping = createToolMapping();
        const executor = toolMapping[toolName];

        if (!executor) {
            return {
                success: false,
                error: `Unknown tool: ${toolName}`,
            };
        }

        // Execute with real runtime
        try {
            const result = await executor(args);
            return {
                success: result.success,
                data: result.data,
                error: result.error,
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Execution failed',
            };
        }
    }, [runtime, createToolMapping]);

    return {
        executeTool,
        isRuntimeReady: runtime.isReady,
        isExaReady: exaContext?.isReady ?? false,
    };
};
