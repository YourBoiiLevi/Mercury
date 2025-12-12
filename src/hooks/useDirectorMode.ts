import { useState, useEffect, useCallback } from 'react';
import { TimelineEvent } from '../types/timeline';

export const useDirectorMode = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [events, setEvents] = useState<TimelineEvent[]>([]);

    const addEvent = useCallback((event: TimelineEvent) => {
        setEvents(prev => [...prev, event]);
    }, []);

    const triggerUserMsg = useCallback(() => {
        addEvent({ type: 'user_msg', content: 'Can you help me build a React app?' });
    }, [addEvent]);

    const triggerThinking = useCallback(() => {
        addEvent({ type: 'agent_thought', content: 'I need to analyze the user request and check the current directory structure.' });
    }, [addEvent]);

    const triggerAgentResp = useCallback(() => {
        addEvent({ type: 'agent_text', content: 'Sure! I can help you with that. Let\'s start by setting up the project.' });
    }, [addEvent]);

    const triggerPlanUpdate = useCallback(() => {
        const steps = ['Analyze requirements', 'Setup project', 'Create components', 'Implement logic', 'Verify'];
        const randomStep = steps[Math.floor(Math.random() * steps.length)];
        const status = 'active';
        addEvent({ type: 'plan_update', step: randomStep, status: status });
    }, [addEvent]);

    const triggerTerminal = useCallback(() => {
        addEvent({
            type: 'tool_call',
            toolName: 'run_command',
            args: { command: 'npm install framer-motion' },
            state: 'running'
        });
        setTimeout(() => {
            setEvents(prev => {
                const newEvents = [...prev];
                const lastEvent = newEvents[newEvents.length - 1];
                if (lastEvent.type === 'tool_call' && lastEvent.toolName === 'run_command') {
                    // Replace the last event with success state
                    newEvents[newEvents.length - 1] = { ...lastEvent, state: 'success', result: 'added 1 package in 2s' };
                }
                return newEvents;
            });
        }, 2000);
    }, [addEvent]);

    const triggerFileEdit = useCallback(() => {
        addEvent({
            type: 'tool_call',
            toolName: 'replace_file_content',
            args: { path: 'src/App.tsx', diff: '+23 / -12' },
            state: 'success',
            result: 'File updated successfully'
        });
    }, [addEvent]);

    const triggerWebTool = useCallback(() => {
        addEvent({
            type: 'tool_call',
            toolName: 'search_web',
            args: { query: 'Gemini API Docs' },
            state: 'success',
            result: 'Found 5 results for "Gemini API Docs"...'
        });
    }, [addEvent]);

    const triggerGenericTool = useCallback(() => {
        addEvent({
            type: 'tool_call',
            toolName: 'custom_tool',
            args: { param: 'value' },
            state: 'success',
            result: 'Operation completed.'
        });
    }, [addEvent]);

    // Expose triggers to window
    useEffect(() => {
        // @ts-ignore
        window.__MERCURY_TRIGGERS__ = {
            addEvent,
            triggerUserMsg,
            triggerThinking,
            triggerAgentResp,
            triggerPlanUpdate,
            triggerTerminal,
            triggerFileEdit,
            triggerWebTool,
            triggerGenericTool
        };
    }, [addEvent, triggerUserMsg, triggerThinking, triggerAgentResp, triggerPlanUpdate, triggerTerminal, triggerFileEdit, triggerWebTool, triggerGenericTool]);

    return {
        isEnabled,
        setIsEnabled,
        events,
        triggers: {
            triggerUserMsg,
            triggerThinking,
            triggerAgentResp,
            triggerPlanUpdate,
            triggerTerminal,
            triggerFileEdit,
            triggerWebTool,
            triggerGenericTool
        }
    };
};
