import { useState, useCallback, useRef } from 'react';
import { Content, Part, FunctionCall } from '@google/genai';
import { TimelineEvent } from '../types/timeline';
import { streamMercuryResponse } from '../../services/geminiService';
import { executeToolMock } from '../../services/tools';

// Helper to generate unique IDs for timeline events
const generateId = () => Math.random().toString(36).substring(2, 9);

export const useMercuryEngine = () => {
    // --- State ---
    // SDK-native history: CRITICAL for Gemini 3.0 thought signatures
    const [history, setHistory] = useState<Content[]>([]);
    // UI-native timeline for rendering
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    // Loading state
    const [isLoading, setIsLoading] = useState(false);

    // Refs to track current streaming event IDs for in-place updates
    const currentThoughtIdRef = useRef<string | null>(null);
    const currentTextIdRef = useRef<string | null>(null);

    // --- Timeline Helpers ---
    const addTimelineEvent = useCallback((event: TimelineEvent & { id?: string }) => {
        const eventWithId = { ...event, id: event.id || generateId() };
        setTimeline(prev => [...prev, eventWithId]);
        return eventWithId.id;
    }, []);

    const updateTimelineEvent = useCallback((id: string, updates: Partial<TimelineEvent>) => {
        setTimeline(prev => prev.map(e => {
            if (e.id === id) {
                // TypeScript-safe in-place update for same-type events
                return { ...e, ...updates } as TimelineEvent;
            }
            return e;
        }));
    }, []);

    // --- Core Agent Loop ---
    const processStream = useCallback(async (
        stream: AsyncIterable<any>,
        accumulatedParts: Part[]
    ): Promise<{ finalParts: Part[], hasFunctionCall: boolean, functionCalls: { call: FunctionCall, partIndex: number }[] }> => {
        let hasFunctionCall = false;
        const functionCalls: { call: FunctionCall, partIndex: number }[] = [];

        // Accumulators for streaming text
        let thoughtText = '';
        let responseText = '';

        for await (const chunk of stream) {
            const candidate = chunk.candidates?.[0];
            if (!candidate?.content?.parts) continue;

            for (const part of candidate.content.parts) {
                // --- Thought Parts ---
                if (part.thought && part.text) {
                    if (!currentThoughtIdRef.current) {
                        currentThoughtIdRef.current = addTimelineEvent({ type: 'agent_thought', content: '' });
                    }
                    thoughtText += part.text;
                    updateTimelineEvent(currentThoughtIdRef.current, { content: thoughtText });
                    // Accumulate for history - preserve exact part structure
                    accumulatedParts.push(part);
                }
                // --- Function Call Parts ---
                else if (part.functionCall) {
                    hasFunctionCall = true;
                    const toolEventId = addTimelineEvent({
                        type: 'tool_call',
                        toolName: part.functionCall.name,
                        args: part.functionCall.args,
                        state: 'running'
                    });
                    functionCalls.push({ call: part.functionCall, partIndex: accumulatedParts.length });
                    // Accumulate for history - CRITICAL: preserve thoughtSignature
                    accumulatedParts.push(part);
                    console.log('[MERCURY] Function call received:', part.functionCall.name, 'Signature present:', !!part.thoughtSignature);
                }
                // --- Text Parts ---
                else if (part.text) {
                    if (!currentTextIdRef.current) {
                        currentTextIdRef.current = addTimelineEvent({ type: 'agent_text', content: '' });
                    }
                    responseText += part.text;
                    updateTimelineEvent(currentTextIdRef.current, { content: responseText });
                    // Accumulate for history
                    accumulatedParts.push(part);
                }
            }
        }

        // Reset streaming refs for next turn
        currentThoughtIdRef.current = null;
        currentTextIdRef.current = null;

        return { finalParts: accumulatedParts, hasFunctionCall, functionCalls };
    }, [addTimelineEvent, updateTimelineEvent]);

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim()) return;

        setIsLoading(true);

        // Add user message to timeline
        addTimelineEvent({ type: 'user_msg', content: userMessage });

        // Build the new history with user message
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
    }, [history, addTimelineEvent]);

    const runAgentLoop = useCallback(async (currentHistory: Content[]) => {
        let loopHistory = [...currentHistory];
        let continueLoop = true;
        let loopCount = 0;
        const MAX_LOOPS = 10; // Safety limit

        while (continueLoop && loopCount < MAX_LOOPS) {
            loopCount++;
            console.log(`[MERCURY] Agent loop iteration ${loopCount}`);

            // Call the API
            const stream = await streamMercuryResponse(loopHistory);
            const accumulatedParts: Part[] = [];

            const { finalParts, hasFunctionCall, functionCalls } = await processStream(stream, accumulatedParts);

            // Add model response to history
            const modelContent: Content = { role: 'model', parts: finalParts };
            loopHistory = [...loopHistory, modelContent];
            setHistory(loopHistory);

            console.log('[MERCURY] Model response added to history. Parts:', finalParts.length);

            // If there were function calls, execute them and continue the loop
            if (hasFunctionCall && functionCalls.length > 0) {
                const functionResponseParts: Part[] = [];

                for (const { call } of functionCalls) {
                    console.log(`[MERCURY] Executing tool: ${call.name}`);

                    // Execute the mock tool
                    const result = await executeToolMock(call.name, call.args);

                    // Update timeline with result
                    setTimeline(prev => prev.map(e => {
                        if (e.type === 'tool_call' && e.toolName === call.name && e.state === 'running') {
                            const toolEvent = e as TimelineEvent & { type: 'tool_call' };
                            return {
                                ...toolEvent,
                                state: 'success' as const,
                                result: JSON.stringify(result)
                            };
                        }
                        return e;
                    }) as TimelineEvent[]);

                    // Build function response part
                    functionResponseParts.push({
                        functionResponse: {
                            name: call.name,
                            response: result
                        }
                    });
                }

                // Add function responses to history as a user turn
                const functionResponseContent: Content = { role: 'user', parts: functionResponseParts };
                loopHistory = [...loopHistory, functionResponseContent];
                setHistory(loopHistory);

                console.log('[MERCURY] Function responses added. Continuing loop...');
                // Continue the loop to let the model process the results
            } else {
                // No function calls, we're done
                continueLoop = false;
                console.log('[MERCURY] Agent loop complete. No more function calls.');
            }
        }

        if (loopCount >= MAX_LOOPS) {
            console.warn('[MERCURY] Agent loop hit max iterations limit.');
            addTimelineEvent({ type: 'agent_text', content: '[System: Max tool call iterations reached]' });
        }
    }, [processStream, addTimelineEvent]);

    // --- Public Interface ---
    return {
        timeline,
        history, // Exposed for debugging
        isLoading,
        sendMessage,
        // Utility to clear state (useful for new conversations)
        clearConversation: useCallback(() => {
            setHistory([]);
            setTimeline([]);
        }, [])
    };
};
