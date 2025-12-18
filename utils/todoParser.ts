export interface TodoNode {
    id: string;
    content: string;
    completed: boolean;
    indent: number;
    children: TodoNode[];
    isCurrent?: boolean; // Added to easily mark the current active task
}

export interface ParsedTodos {
    total: number;
    completed: number;
    progress: number;
    activeTaskIndex: number;
    currentTask: string | null;
    tree: TodoNode[];
}

export function parseTodoMarkdown(content: string): ParsedTodos {
    const lines = content.split('\n');
    const nodes: TodoNode[] = [];
    const stack: { node: TodoNode; level: number }[] = [];

    let total = 0;
    let completed = 0;
    let firstUncheckedFound = false;
    let activeTaskIndex = -1;
    let currentTask: string | null = null;
    let flatIndex = 0;

    lines.forEach((line) => {
        // Match todo items: "- [ ] " or "- [x] " or "- [/] "
        // Also capture indentation
        const match = line.match(/^(\s*)- \[([ x/])\] (.+)$/i);

        if (match) {
            const indentStr = match[1];
            const statusMark = match[2].toLowerCase(); // ' ', 'x', or '/'
            const text = match[3];

            // Calculate indentation level (assuming 2 spaces or 1 tab per level)
            // Using 2 spaces as standard for markdown list indentation
            const indentLevel = Math.floor(indentStr.length / 2);

            const isCompleted = statusMark === 'x';
            // Treat [/] as in-progress, effectively uncompleted for "done" count, 
            // but we might want to handle it specifically. For now, treat as not completed.
            // If the user wants specific logic for [/], we can adjust.
            // For the dashboard progress bar, usually x is done, everything else is todo.

            // Determine if this is the "current" task (first unchecked or in-progress)
            let isCurrent = false;
            // A task is pending if it's not 'x'
            const isPending = statusMark !== 'x';

            if (isCompleted) {
                completed++;
            } else {
                // If it's the first pending item we find, mark it
                if (!firstUncheckedFound) {
                    firstUncheckedFound = true;
                    isCurrent = true;
                    activeTaskIndex = flatIndex;
                    currentTask = text;
                }
            }

            total++;

            const newNode: TodoNode = {
                id: `todo-${flatIndex}`,
                content: text,
                completed: isCompleted,
                indent: indentLevel,
                children: [],
                isCurrent
            };

            // Tree construction logic
            if (indentLevel === 0) {
                nodes.push(newNode);
                // Reset stack for new top-level item
                stack.length = 0;
                stack.push({ node: newNode, level: 0 });
            } else {
                // Find parent
                // Pop stack until we find a node with level < indentLevel
                while (stack.length > 0 && stack[stack.length - 1].level >= indentLevel) {
                    stack.pop();
                }

                if (stack.length > 0) {
                    const parent = stack[stack.length - 1].node;
                    parent.children.push(newNode);
                    stack.push({ node: newNode, level: indentLevel });
                } else {
                    // Fallback: if indentation is weird, treat as top level or attach to last root
                    // For now, just add to root if no parent found (shouldn't happen with valid tree)
                    nodes.push(newNode);
                    stack.push({ node: newNode, level: indentLevel });
                }
            }

            flatIndex++;
        }
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
        total,
        completed,
        progress,
        activeTaskIndex,
        currentTask,
        tree: nodes
    };
}
