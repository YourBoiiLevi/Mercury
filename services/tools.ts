import { FunctionDeclaration, Type } from "@google/genai";

// ============================================================================
// STATEFUL TO-DO STORE (persists until hard refresh)
// ============================================================================

interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  completedAt?: string;
}

// In-memory store for to-dos
const todoStore: Map<string, Todo> = new Map();

// Generate unique IDs
const generateTodoId = () =>
  `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// ============================================================================
// TOOL DECLARATIONS
// ============================================================================

export const TOOLS: FunctionDeclaration[] = [
  // ---------------------------------------------------------------------------
  // FILE SYSTEM TOOLS
  // ---------------------------------------------------------------------------
  {
    name: "file_readFile",
    description: "Read the content of a file from the file system.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description:
            "Absolute or relative path to the file (e.g., src/App.tsx)",
        },
        startLine: {
          type: Type.NUMBER,
          description:
            "Optional. Starting line number (1-indexed) for partial read.",
        },
        endLine: {
          type: Type.NUMBER,
          description:
            "Optional. Ending line number (inclusive) for partial read.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "file_writeFile",
    description:
      "Create a new file or overwrite an existing file with content.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path where the file should be created or overwritten.",
        },
        content: {
          type: Type.STRING,
          description: "The full content to write to the file.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "file_editFile",
    description:
      "Edit an existing file by replacing specific content. Use for surgical edits.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path to the file to edit.",
        },
        oldContent: {
          type: Type.STRING,
          description:
            "The exact content to find and replace. Must match exactly.",
        },
        newContent: {
          type: Type.STRING,
          description: "The new content to replace the old content with.",
        },
      },
      required: ["path", "oldContent", "newContent"],
    },
  },
  {
    name: "file_deleteFile",
    description: "Delete a file from the file system.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Path to the file to delete.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "file_listFiles",
    description: "List files and directories in a path. Returns file metadata.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: "Directory path to list.",
        },
        recursive: {
          type: Type.BOOLEAN,
          description: "If true, list files recursively. Default: false.",
        },
        pattern: {
          type: Type.STRING,
          description:
            'Optional glob pattern to filter results (e.g., "*.tsx").',
        },
      },
      required: ["path"],
    },
  },

  // ---------------------------------------------------------------------------
  // SHELL TOOLS
  // ---------------------------------------------------------------------------
  {
    name: "terminal_bash",
    description:
      "Execute a bash/shell command. Use for running scripts, npm commands, etc.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: "The shell command to execute.",
        },
        cwd: {
          type: Type.STRING,
          description: "Optional. Working directory for the command.",
        },
        timeout: {
          type: Type.NUMBER,
          description: "Optional. Timeout in milliseconds. Default: 30000.",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "terminal_grep",
    description:
      "Search for patterns in files using regex. Fast content search.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pattern: {
          type: Type.STRING,
          description: "Regex pattern to search for.",
        },
        path: {
          type: Type.STRING,
          description: "File or directory path to search in.",
        },
        includes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            'Optional. Glob patterns to include (e.g., ["*.ts", "*.tsx"]).',
        },
        caseSensitive: {
          type: Type.BOOLEAN,
          description: "Optional. Case-sensitive search. Default: true.",
        },
      },
      required: ["pattern", "path"],
    },
  },
  {
    name: "terminal_glob",
    description: "Find files matching a glob pattern. Use for file discovery.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pattern: {
          type: Type.STRING,
          description: 'Glob pattern (e.g., "**/*.tsx", "src/**/*.test.ts").',
        },
        cwd: {
          type: Type.STRING,
          description: "Optional. Base directory for the search.",
        },
      },
      required: ["pattern"],
    },
  },

  // ---------------------------------------------------------------------------
  // WEB TOOLS
  // ---------------------------------------------------------------------------
  {
    name: "web_search",
    description:
      "Search the web using Google. Returns relevant results with snippets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query.",
        },
        numResults: {
          type: Type.NUMBER,
          description:
            "Optional. Number of results to return. Default: 5, Max: 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description: "Fetch content from a URL. Returns text/HTML content.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "The URL to fetch.",
        },
        method: {
          type: Type.STRING,
          description: "HTTP method. Default: GET.",
        },
        headers: {
          type: Type.OBJECT,
          description: "Optional. HTTP headers as key-value pairs.",
        },
      },
      required: ["url"],
    },
  },

  // ---------------------------------------------------------------------------
  // PLANNER / TO-DO TOOLS (STATEFUL)
  // ---------------------------------------------------------------------------
  {
    name: "planner_createTodo",
    description:
      "Create a new to-do item for tracking task progress. Use this to break down work.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description: "Description of the to-do item.",
        },
        status: {
          type: Type.STRING,
          description:
            'Initial status: "pending", "in_progress", or "completed". Default: "pending".',
        },
      },
      required: ["content"],
    },
  },
  {
    name: "planner_updateTodo",
    description: "Update the status of an existing to-do item.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: "The ID of the to-do to update.",
        },
        status: {
          type: Type.STRING,
          description: 'New status: "pending", "in_progress", or "completed".',
        },
        content: {
          type: Type.STRING,
          description: "Optional. Updated content/description.",
        },
      },
      required: ["id", "status"],
    },
  },
  {
    name: "planner_listTodos",
    description: "List all current to-do items with their statuses.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: {
          type: Type.STRING,
          description:
            'Optional. Filter by status: "pending", "in_progress", "completed", or "all". Default: "all".',
        },
      },
    },
  },
  {
    name: "planner_deleteTodo",
    description: "Delete a to-do item by ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: "The ID of the to-do to delete.",
        },
      },
      required: ["id"],
    },
  },
];

// ============================================================================
// MOCK EXECUTION HANDLER
// ============================================================================

// Random delay between 800ms and 3000ms
const randomDelay = () => 800 + Math.random() * 2200;

export const executeToolMock = async (
  name: string,
  args: any,
): Promise<any> => {
  console.log(`[TOOL_EXEC] ${name}`, args);

  // Simulate realistic latency (varies by tool type)
  const delay = name.startsWith("web_")
    ? 1500 + Math.random() * 2000 // Web tools are slower
    : name === "terminal_bash"
      ? 1000 + Math.random() * 3000 // Bash can vary
      : randomDelay();

  await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 4500)));

  switch (name) {
    // -------------------------------------------------------------------------
    // FILE SYSTEM
    // -------------------------------------------------------------------------
    case "file_readFile":
      return {
        path: args.path,
        content: `// File: ${args.path}\n// This is mock content for demonstration.\n\nimport React from 'react';\n\nexport const Component = () => {\n  return <div>Hello World</div>;\n};\n`,
        lines:
          args.startLine && args.endLine
            ? { from: args.startLine, to: args.endLine }
            : { from: 1, to: 10 },
        size: 256,
      };

    case "file_writeFile":
      return {
        success: true,
        path: args.path,
        bytesWritten: args.content?.length || 0,
        message: `File created at ${args.path}`,
      };

    case "file_editFile":
      return {
        success: true,
        path: args.path,
        replacements: 1,
        message: `Replaced content in ${args.path}`,
      };

    case "file_deleteFile":
      return {
        success: true,
        path: args.path,
        message: `Deleted ${args.path}`,
      };

    case "file_listFiles":
      return {
        path: args.path,
        entries: [
          { name: "App.tsx", type: "file", size: 2048 },
          { name: "index.ts", type: "file", size: 512 },
          { name: "components", type: "directory", children: 5 },
          { name: "styles.css", type: "file", size: 1024 },
          { name: "utils", type: "directory", children: 3 },
        ],
        total: 5,
      };

    // -------------------------------------------------------------------------
    // SHELL
    // -------------------------------------------------------------------------
    case "terminal_bash":
      const cmd = args.command?.toLowerCase() || "";
      if (cmd.includes("npm install")) {
        return {
          stdout:
            "added 42 packages in 2.3s\n\n8 packages are looking for funding\n  run `npm fund` for details",
          stderr: "",
          exitCode: 0,
          duration: 2300,
        };
      } else if (cmd.includes("npm run") || cmd.includes("npm start")) {
        return {
          stdout:
            "> app@1.0.0 dev\n> vite\n\n  VITE v5.0.0  ready in 450 ms\n\n  ➜  Local:   http://localhost:3000/",
          stderr: "",
          exitCode: 0,
          duration: 500,
        };
      } else if (cmd.includes("git")) {
        return {
          stdout:
            "On branch main\nYour branch is up to date.\n\nnothing to commit, working tree clean",
          stderr: "",
          exitCode: 0,
          duration: 150,
        };
      }
      return {
        stdout: `$ ${args.command}\n[Command executed successfully]`,
        stderr: "",
        exitCode: 0,
        duration: 100,
      };

    case "terminal_grep":
      return {
        pattern: args.pattern,
        matches: [
          {
            file: "src/App.tsx",
            line: 15,
            content: `  const result = ${args.pattern};`,
          },
          {
            file: "src/utils/helpers.ts",
            line: 42,
            content: `  // ${args.pattern} implementation`,
          },
          {
            file: "src/components/Button.tsx",
            line: 8,
            content: `  ${args.pattern}: boolean;`,
          },
        ],
        totalMatches: 3,
        filesSearched: 24,
      };

    case "terminal_glob":
      return {
        pattern: args.pattern,
        matches: [
          "src/App.tsx",
          "src/components/Button.tsx",
          "src/components/Input.tsx",
          "src/hooks/useAuth.ts",
          "src/utils/helpers.ts",
        ],
        total: 5,
      };

    // -------------------------------------------------------------------------
    // WEB
    // -------------------------------------------------------------------------
    case "web_search":
      return {
        query: args.query,
        results: [
          {
            title: `${args.query} - Official Documentation`,
            url: `https://docs.example.com/${args.query.replace(/\s/g, "-")}`,
            snippet: `Learn everything about ${args.query}. Comprehensive guide with examples and best practices.`,
          },
          {
            title: `How to use ${args.query} - Stack Overflow`,
            url: `https://stackoverflow.com/questions/example`,
            snippet: `Top-rated answer explaining ${args.query} with code examples and common pitfalls to avoid.`,
          },
          {
            title: `${args.query} Tutorial - Medium`,
            url: `https://medium.com/example`,
            snippet: `A step-by-step tutorial on implementing ${args.query} in your project.`,
          },
        ],
        totalResults: args.numResults || 3,
      };

    case "web_fetch":
      return {
        url: args.url,
        status: 200,
        contentType: "text/html",
        content: `<!DOCTYPE html><html><head><title>Fetched Page</title></head><body><h1>Content from ${args.url}</h1><p>This is mock content representing the fetched page. In production, this would contain the actual page content.</p></body></html>`,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "max-age=3600",
        },
      };

    // -------------------------------------------------------------------------
    // PLANNER / TO-DOS (STATEFUL)
    // -------------------------------------------------------------------------
    case "planner_createTodo": {
      const id = generateTodoId();
      const todo: Todo = {
        id,
        content: args.content,
        status: args.status || "pending",
        createdAt: new Date().toISOString(),
      };
      todoStore.set(id, todo);
      console.log("[TODO_STORE] Created:", todo);
      return {
        success: true,
        todo,
        message: `Created to-do: ${args.content}`,
      };
    }

    case "planner_updateTodo": {
      const existing = todoStore.get(args.id);
      if (!existing) {
        return {
          success: false,
          error: `To-do with ID ${args.id} not found.`,
        };
      }
      const updated: Todo = {
        ...existing,
        status: args.status || existing.status,
        content: args.content || existing.content,
        completedAt:
          args.status === "completed"
            ? new Date().toISOString()
            : existing.completedAt,
      };
      todoStore.set(args.id, updated);
      console.log("[TODO_STORE] Updated:", updated);
      return {
        success: true,
        todo: updated,
        message: `Updated to-do: ${updated.content} → ${updated.status}`,
      };
    }

    case "planner_listTodos": {
      const filter = args.filter || "all";
      const todos = Array.from(todoStore.values()).filter(
        (t) => filter === "all" || t.status === filter,
      );
      return {
        todos,
        total: todos.length,
        summary: {
          pending: Array.from(todoStore.values()).filter(
            (t) => t.status === "pending",
          ).length,
          in_progress: Array.from(todoStore.values()).filter(
            (t) => t.status === "in_progress",
          ).length,
          completed: Array.from(todoStore.values()).filter(
            (t) => t.status === "completed",
          ).length,
        },
      };
    }

    case "planner_deleteTodo": {
      const existed = todoStore.has(args.id);
      todoStore.delete(args.id);
      return {
        success: existed,
        message: existed
          ? `Deleted to-do ${args.id}`
          : `To-do ${args.id} not found`,
      };
    }

    // -------------------------------------------------------------------------
    // FALLBACK
    // -------------------------------------------------------------------------
    default:
      return {
        error: "Unknown tool",
        availableTools: TOOLS.map((t) => t.name),
      };
  }
};

// Export to-do store for potential UI access
export const getTodoStore = () => Array.from(todoStore.values());
