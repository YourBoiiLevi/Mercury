import React, { useEffect, useRef } from 'react';
import { TimelineEvent } from '../../types/timeline';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolWidget } from './ToolWidget';
import { Streamdown } from 'streamdown';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineRendererProps {
    events: TimelineEvent[];
}

const TaskSection: React.FC<{
    step: string;
    status: 'active' | 'completed';
    children: React.ReactNode;
}> = ({ step, status, children }) => {
    // Initialize state based on status, but allow user toggle
    const [isExpanded, setIsExpanded] = React.useState(status === 'active');

    // Sync expansion with status changes if needed, but prioritize user interaction
    // We'll only auto-expand if it becomes active. We won't auto-collapse to avoid annoying the user.
    useEffect(() => {
        if (status === 'active') setIsExpanded(true);
    }, [status]);

    return (
        <div className="mb-4 border-l-2 border-[#333] pl-4 ml-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-3 w-full text-left mb-2 group"
            >
                {status === 'completed' ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                ) : (
                    <Circle size={20} className="text-[#FF3B00] fill-[#FF3B00]/20 animate-pulse" />
                )}
                <span className={`font-medium ${status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                    {step}
                </span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-500">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="pl-2 border-l border-[#222] ml-2.5 space-y-4 py-2">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const TimelineRenderer: React.FC<TimelineRendererProps> = ({ events }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events.length, events[events.length - 1]?.type]);

    // Group events into task sections
    const renderEvents = () => {
        const rendered: React.ReactNode[] = [];
        let currentTaskChildren: React.ReactNode[] = [];
        let currentTask: { step: string; status: 'active' | 'completed' } | null = null;

        const flushTask = () => {
            if (currentTask) {
                rendered.push(
                    <TaskSection key={`task-${rendered.length}`} step={currentTask.step} status={currentTask.status}>
                        {[...currentTaskChildren]}
                    </TaskSection>
                );
                currentTaskChildren = [];
                currentTask = null;
            }
        };

        events.forEach((event, index) => {
            const key = `event-${index}`;

            if (event.type === 'plan_update') {
                flushTask();
                currentTask = { step: event.step, status: event.status };
            } else if (currentTask && event.type === 'tool_call') {
                // ONLY tool calls go inside the task section
                currentTaskChildren.push(
                    <ToolWidget
                        key={key}
                        toolName={event.toolName}
                        args={event.args}
                        state={event.state}
                        result={event.result}
                    />
                );
            } else {
                // Everything else (User Msg, Agent Text, Agent Thought) breaks out of the task
                flushTask();

                if (event.type === 'user_msg') {
                    rendered.push(
                        <div key={key} className="flex justify-end mb-6">
                            <div className="bg-[#222] text-white px-4 py-2 max-w-[80%] border border-[#333]">
                                {event.content}
                            </div>
                        </div>
                    );
                } else if (event.type === 'agent_text') {
                    rendered.push(
                        <div key={key} className="mb-6 prose prose-invert prose-sm max-w-none text-gray-300">
                            <Streamdown>
                                {event.content}
                            </Streamdown>
                        </div>
                    );
                } else if (event.type === 'agent_thought') {
                    rendered.push(<ThinkingBlock key={key} content={event.content} />);
                } else if (event.type === 'tool_call') {
                    // Tool call outside of a plan (should be rare but possible)
                    rendered.push(
                        <ToolWidget
                            key={key}
                            toolName={event.toolName}
                            args={event.args}
                            state={event.state}
                            result={event.result}
                        />
                    );
                }
            }
        });

        flushTask(); // Flush any remaining task
        return rendered;
    };

    return (
        <div className="flex flex-col w-full max-w-3xl mx-auto p-4 pb-32">
            {renderEvents()}
            <div ref={bottomRef} />
        </div>
    );
};
