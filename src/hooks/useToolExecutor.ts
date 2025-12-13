import { useCallback } from 'react';
import { useMercuryRuntime, RuntimeToolResult } from './useMercuryRuntime';
import { executeToolMock } from '../../services/tools';

type ToolExecutorFn = (args: Record<string, any>) => Promise<RuntimeToolResult>;

// Maps tool names to their real runtime implementations
const createToolMapping = (runtime: ReturnType<typeof useMercuryRuntime>): Record<string, ToolExecutorFn> => ({
    // File System Tools
    'file_readFile': async (args) => runtime.readFile(args.path, args.startLine, args.endLine),
    'file_writeFile': async (args) => runtime.writeFile(args.path, args.content),
    'file_editFile': async (args) => runtime.editFile(args.path, args.oldContent, args.newContent),
    'file_deleteFile': async (args) => runtime.deleteFile(args.path),
    'file_listFiles': async (args) => runtime.listFiles(args.path, args.recursive, args.pattern),

    // Terminal Tools
    'terminal_bash': async (args) => runtime.runCommand(args.command, args.cwd, args.timeout),
    'terminal_grep': async (args) => runtime.grep(args.pattern, args.path, args.includes, args.caseSensitive),
    'terminal_glob': async (args) => runtime.glob(args.pattern, args.cwd),
});

// Tools that fallback to mock (no real E2B implementation)
const MOCK_ONLY_TOOLS = ['web_search', 'web_fetch', 'planner_createTodo', 'planner_updateTodo', 'planner_listTodos', 'planner_deleteTodo'];

export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    usedMock: boolean;
}

export const useToolExecutor = () => {
    const runtime = useMercuryRuntime();

    const executeTool = useCallback(async (
        toolName: string,
        args: Record<string, any>
    ): Promise<ToolExecutionResult> => {
        // Check if runtime is ready for real execution
        if (!runtime.isReady) {
            // Fall back to mock if sandbox not connected
            try {
                const mockResult = await executeToolMock(toolName, args);
                return {
                    success: true,
                    data: mockResult,
                    usedMock: true,
                };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Mock execution failed',
                    usedMock: true,
                };
            }
        }

        // Check if tool has real implementation
        const toolMapping = createToolMapping(runtime);

        if (MOCK_ONLY_TOOLS.includes(toolName)) {
            // Use mock for web/planner tools
            try {
                const mockResult = await executeToolMock(toolName, args);
                return {
                    success: true,
                    data: mockResult,
                    usedMock: true,
                };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Mock execution failed',
                    usedMock: true,
                };
            }
        }

        const executor = toolMapping[toolName];
        if (!executor) {
            return {
                success: false,
                error: `Unknown tool: ${toolName}`,
                usedMock: false,
            };
        }

        // Execute with real runtime
        try {
            const result = await executor(args);
            return {
                success: result.success,
                data: result.data,
                error: result.error,
                usedMock: false,
            };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Execution failed',
                usedMock: false,
            };
        }
    }, [runtime]);

    return {
        executeTool,
        isRuntimeReady: runtime.isReady,
    };
};
