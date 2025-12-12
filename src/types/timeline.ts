export type TimelineEvent =
    | { type: 'user_msg'; content: string; id?: string }
    | { type: 'agent_thought'; content: string; signature?: string; id?: string }
    | { type: 'tool_call'; toolName: string; args: any; state: 'running' | 'success' | 'error'; result?: string; id?: string }
    | { type: 'agent_text'; content: string; id?: string }
    | { type: 'plan_update'; step: string; status: 'active' | 'completed'; id?: string };

