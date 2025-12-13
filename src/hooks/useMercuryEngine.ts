import { useState, useCallback, useRef, useContext } from 'react';
import { Content, Part, FunctionCall } from '@google/genai';
import { TimelineEvent } from '../types/timeline';
import { streamMercuryResponse } from '../../services/geminiService';
import { executeToolMock } from '../../services/tools';
import { useMercuryRuntime, RuntimeToolResult } from './useMercuryRuntime';
import { GitHubContext } from '../contexts/GitHubContext';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useMercuryEngine = () => {
    const runtime = useMercuryRuntime();
    const githubContext = useContext(GitHubContext);

    const [history, setHistory] = useState<Content[]>([]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const currentThoughtIdRef = useRef<string | null>(null);
    const currentTextIdRef = useRef<string | null>(null);

    const addTimelineEvent = useCallback((event: TimelineEvent & { id?: string }) => {
        const eventWithId = { ...event, id: event.id || generateId() };
        setTimeline(prev => [...prev, eventWithId]);
        return eventWithId.id;
    }, []);

    const updateTimelineEvent = useCallback((id: string, updates: Partial<TimelineEvent>) => {
        setTimeline(prev => prev.map(e => {
            if (e.id === id) {
                return { ...e, ...updates } as TimelineEvent;
            }
            return e;
        }));
    }, []);

    const processStream = useCallback(async (
        stream: AsyncIterable<any>,
        accumulatedParts: Part[]
    ): Promise<{ finalParts: Part[], hasFunctionCall: boolean, functionCalls: { call: FunctionCall, partIndex: number }[] }> => {
        let hasFunctionCall = false;
        const functionCalls: { call: FunctionCall, partIndex: number }[] = [];

        let thoughtText = '';
        let responseText = '';

        for await (const chunk of stream) {
            const candidate = chunk.candidates?.[0];
            if (!candidate?.content?.parts) continue;

            for (const part of candidate.content.parts) {
                if (part.thought && part.text) {
                    if (!currentThoughtIdRef.current) {
                        currentThoughtIdRef.current = addTimelineEvent({ type: 'agent_thought', content: '' });
                    }
                    thoughtText += part.text;
                    updateTimelineEvent(currentThoughtIdRef.current, { content: thoughtText });
                    accumulatedParts.push(part);
                }
                else if (part.functionCall) {
                    hasFunctionCall = true;
                    const toolEventId = addTimelineEvent({
                        type: 'tool_call',
                        toolName: part.functionCall.name,
                        args: part.functionCall.args,
                        state: 'running'
                    });
                    functionCalls.push({ call: part.functionCall, partIndex: accumulatedParts.length });
                    accumulatedParts.push(part);
                    console.log('[MERCURY] Function call received:', part.functionCall.name, 'Signature present:', !!part.thoughtSignature);
                }
                else if (part.text) {
                    if (!currentTextIdRef.current) {
                        currentTextIdRef.current = addTimelineEvent({ type: 'agent_text', content: '' });
                    }
                    responseText += part.text;
                    updateTimelineEvent(currentTextIdRef.current, { content: responseText });
                    accumulatedParts.push(part);
                }
            }
        }

        currentThoughtIdRef.current = null;
        currentTextIdRef.current = null;

        return { finalParts: accumulatedParts, hasFunctionCall, functionCalls };
    }, [addTimelineEvent, updateTimelineEvent]);

    const executeRealTool = useCallback(async (name: string, args: any): Promise<RuntimeToolResult | any> => {
        if (!runtime.isReady) {
            return { error: 'System not ready. E2B sandbox is not connected.' };
        }

        switch (name) {
            case 'file_readFile':
                return runtime.readFile(args.path, args.startLine, args.endLine);
            case 'file_writeFile':
                return runtime.writeFile(args.path, args.content);
            case 'file_editFile':
                return runtime.editFile(args.path, args.oldContent, args.newContent);
            case 'file_deleteFile':
                return runtime.deleteFile(args.path);
            case 'file_listFiles':
                return runtime.listFiles(args.path, args.recursive, args.pattern);

            case 'terminal_bash':
                return runtime.runCommand(
                    args.command, 
                    args.cwd || githubContext?.workingDirectory, 
                    args.timeout
                );
            case 'terminal_grep':
                return runtime.grep(args.pattern, args.path, args.includes, args.caseSensitive);
            case 'terminal_glob':
                return runtime.glob(
                    args.pattern, 
                    args.cwd || githubContext?.workingDirectory
                );

            case 'github_create_pr':
                if (!githubContext?.isAuthenticated || !githubContext?.selectedRepo) {
                    return { success: false, error: 'GitHub not connected or no repository selected.' };
                }
                try {
                    const result = await githubContext.createPullRequest({
                        title: args.title,
                        body: args.body || '',
                        head: args.head,
                        base: args.base,
                    });
                    return { success: true, data: result };
                } catch (err: any) {
                    return { success: false, error: err.message };
                }

            case 'web_search':
            case 'web_fetch':
                return { error: 'Web tools not yet implemented' };

            case 'planner_createTodo':
            case 'planner_updateTodo':
            case 'planner_listTodos':
            case 'planner_deleteTodo':
                return executeToolMock(name, args);

            default:
                return { error: `Unknown tool: ${name}` };
        }
    }, [runtime, githubContext]);

    const runAgentLoop = useCallback(async (currentHistory: Content[]) => {
        let loopHistory = [...currentHistory];
        let continueLoop = true;
        let loopCount = 0;
        const MAX_LOOPS = 10;

        while (continueLoop && loopCount < MAX_LOOPS) {
            loopCount++;
            console.log(`[MERCURY] Agent loop iteration ${loopCount}`);

            const stream = await streamMercuryResponse(loopHistory, githubContext ? {
                isAuthenticated: githubContext.isAuthenticated,
                selectedRepo: githubContext.selectedRepo || undefined,
                workingDirectory: githubContext.workingDirectory || undefined
            } : undefined);
            
            const accumulatedParts: Part[] = [];

            const { finalParts, hasFunctionCall, functionCalls } = await processStream(stream, accumulatedParts);

            const modelContent: Content = { role: 'model', parts: finalParts };
            loopHistory = [...loopHistory, modelContent];
            setHistory(loopHistory);

            console.log('[MERCURY] Model response added to history. Parts:', finalParts.length);

            if (hasFunctionCall && functionCalls.length > 0) {
                const functionResponseParts: Part[] = [];

                for (const { call } of functionCalls) {
                    console.log(`[MERCURY] Executing tool: ${call.name}`);

                    const result = await executeRealTool(call.name, call.args);

                    const isSuccess = result.success !== false && !result.error;

                    setTimeline(prev => prev.map(e => {
                        if (e.type === 'tool_call' && e.toolName === call.name && e.state === 'running') {
                            const toolEvent = e as TimelineEvent & { type: 'tool_call' };
                            return {
                                ...toolEvent,
                                state: isSuccess ? 'success' as const : 'error' as const,
                                result: JSON.stringify(result.data || result)
                            };
                        }
                        return e;
                    }) as TimelineEvent[]);

                    functionResponseParts.push({
                        functionResponse: {
                            name: call.name,
                            response: result.data || result
                        }
                    });
                }

                const functionResponseContent: Content = { role: 'user', parts: functionResponseParts };
                loopHistory = [...loopHistory, functionResponseContent];
                setHistory(loopHistory);

                console.log('[MERCURY] Function responses added. Continuing loop...');
            } else {
                continueLoop = false;
                console.log('[MERCURY] Agent loop complete. No more function calls.');
            }
        }

        if (loopCount >= MAX_LOOPS) {
            console.warn('[MERCURY] Agent loop hit max iterations limit.');
            addTimelineEvent({ type: 'agent_text', content: '[System: Max tool call iterations reached]' });
        }
    }, [processStream, addTimelineEvent, executeRealTool, githubContext]);

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim()) return;

        setIsLoading(true);

        addTimelineEvent({ type: 'user_msg', content: userMessage });

        const userContent: Content = { role: 'user', parts: [{ text: userMessage }] };
        const newHistory = [...history, userContent];
        setHistory(newHistory);

        try {
            await runAgentLoop(newHistory);
        } catch (error) {
            console.error('[MERCURY] Error in agent loop:', error);
            addTimelineEvent({ type: 'agent_text', content: `Error: ${(error as Error).message}` });
        } finally {
            setIsLoading(false);
        }
    }, [history, addTimelineEvent, runAgentLoop]);

    return {
        timeline,
        history,
        isLoading,
        sendMessage,
        clearConversation: useCallback(() => {
            setHistory([]);
            setTimeline([]);
        }, [])
    };
};
