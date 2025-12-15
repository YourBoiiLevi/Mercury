import { useState, useCallback, useRef } from 'react';
import { Content, Part, FunctionCall } from '@google/genai';
import { TimelineEvent } from '../types/timeline';
import { streamMercuryResponse } from '../../services/geminiService';
import { useMercuryRuntime, RuntimeToolResult } from './useMercuryRuntime';
import { useExa } from '../contexts/ExaContext';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useMercuryEngine = () => {
    const runtime = useMercuryRuntime();
    const exaContext = useExa();

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
            // File System Tools
            case 'file_readFile':
                return runtime.readFile(args.path, args.startLine, args.endLine);
            case 'file_writeFile':
                return runtime.writeFile(args.path, args.content);
            case 'file_editFile':
                return runtime.editFile(args.path, args.oldContent, args.newContent);
            case 'file_deleteFile':
                return runtime.deleteFile(args.path);

            // Terminal Tool (Bash-heavy approach)
            case 'terminal_bash':
                return runtime.runCommand(args.command, args.cwd, args.timeout);

            // Web Tools (Exa-powered)
            case 'web_search': {
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
            }

            case 'web_fetch': {
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
            }

            case 'web_answer': {
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
            }

            // Planner Tools (file-based, lean toolset)
            case 'planner_createPlan':
                return runtime.writeArtifactFile('PLAN.md', args.content);

            case 'planner_readTodos':
                return runtime.readArtifactFile('TODO.md');

            case 'planner_writeTodos':
                return runtime.writeArtifactFile('TODO.md', args.content);

            default:
                return { error: `Unknown tool: ${name}` };
        }
    }, [runtime, exaContext]);

    const runAgentLoop = useCallback(async (currentHistory: Content[]) => {
        let loopHistory = [...currentHistory];
        let continueLoop = true;
        let loopCount = 0;
        const MAX_LOOPS = 10;

        while (continueLoop && loopCount < MAX_LOOPS) {
            loopCount++;
            console.log(`[MERCURY] Agent loop iteration ${loopCount}`);

            const stream = await streamMercuryResponse(loopHistory);
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
    }, [processStream, addTimelineEvent, executeRealTool]);

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
