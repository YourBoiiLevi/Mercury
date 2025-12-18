import { FunctionDeclaration, Type } from "@google/genai";

// ============================================================================
// TOOL DECLARATIONS - LEAN TOOLSET
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

  // ---------------------------------------------------------------------------
  // TERMINAL TOOLS (BASH-HEAVY)
  // ---------------------------------------------------------------------------
  {
    name: "terminal_bash",
    description:
      "Execute a bash/shell command. Use for ALL exploration and operations: file listing (ls -la, ls -R), pattern search (grep -rn), file discovery (find . -name), git, npm, and all CLI tools.",
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

  // ---------------------------------------------------------------------------
  // WEB TOOLS (EXA-POWERED)
  // ---------------------------------------------------------------------------
  {
    name: "web_search",
    description:
      "Deep search for understanding documentation and complex topics. Use for how/why questions. Example: 'How do I implement auth with Supabase?'",
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
    name: "web_answer",
    description:
      "Get a quick factual answer to a question. Use for who/what/when/where questions. Example: 'What is the latest version of Next.js?'",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The question to answer.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description:
      "Fetch content from one or more URLs. Supports single URL or array of URLs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description:
            "The URL(s) to fetch. Can be a single URL string or an array of URLs.",
        },
      },
      required: ["url"],
    },
  },

  // ---------------------------------------------------------------------------
  // PLANNER TOOLS (FILE-BASED ARTIFACTS)
  // ---------------------------------------------------------------------------
  {
    name: "planner_createPlan",
    description:
      "Create or overwrite the project plan (.mercury/PLAN.md) with markdown content. Use for documenting the implementation approach.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description:
            "The complete markdown content for PLAN.md. Supports multi-line markdown with headers, lists, code blocks, etc.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "planner_readTodos",
    description:
      "Read the current TODO.md file contents. Returns the full markdown content of .mercury/TODO.md.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "planner_writeTodos",
    description:
      "Write the complete TODO.md file. This OVERWRITES the entire file. Use markdown checkbox syntax: '- [ ]' for pending, '- [x]' for completed. You must provide the full TODO.md content each time.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description:
            "The complete markdown content for TODO.md. Must include ALL tasks, not just updates. Example:\n# TODO\n\n- [x] Completed task\n- [ ] Pending task\n- [ ] Another pending task",
        },
      },
      required: ["content"],
    },
  },

  // ---------------------------------------------------------------------------
  // GITHUB TOOLS
  // ---------------------------------------------------------------------------
  {
    name: "github_createPR",
    description:
      "Create a pull request on the active GitHub repository. Use after committing and pushing changes to a feature branch.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "The title of the pull request.",
        },
        body: {
          type: Type.STRING,
          description:
            "The description/body of the pull request. Supports markdown.",
        },
        head: {
          type: Type.STRING,
          description:
            "The name of the branch containing the changes (e.g., 'feature-xyz').",
        },
        base: {
          type: Type.STRING,
          description:
            "The name of the branch to merge into. Defaults to the repository's default branch (usually 'main').",
        },
      },
      required: ["title", "body", "head"],
    },
  },
  // ---------------------------------------------------------------------------
  // BROWSER TOOLS (COMPUTER USE)
  // ---------------------------------------------------------------------------
  {
    name: "browser_navigate",
    description: "Navigate the remote browser to a URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to open." },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the remote browser/desktop.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "browser_leftClick",
    description: "Perform a left mouse click at the specified coordinates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: "X coordinate." },
        y: { type: Type.NUMBER, description: "Y coordinate." },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "browser_doubleClick",
    description: "Perform a double left mouse click at the specified coordinates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: "X coordinate." },
        y: { type: Type.NUMBER, description: "Y coordinate." },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "browser_rightClick",
    description: "Perform a right mouse click at the specified coordinates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: "X coordinate." },
        y: { type: Type.NUMBER, description: "Y coordinate." },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "browser_moveMouse",
    description: "Move the mouse cursor to specific coordinates without clicking.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER, description: "X coordinate." },
        y: { type: Type.NUMBER, description: "Y coordinate." },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "browser_type",
    description: "Type text at the current cursor position/focused input.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "The text to type." },
        delay: { type: Type.NUMBER, description: "Optional delay between keystrokes in ms (default: 10)." },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_press",
    description: "Press a specific key or combination of keys (e.g., 'Enter', 'Control+C').",
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: {
          type: Type.STRING,
          description: "The key or key combination to press. Can be a single key (e.g., 'Enter') or a combination (accepts direct SDK format)."
        },
      },
      required: ["key"],
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the page up or down.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: "Amount to scroll. Positive for UP, negative for DOWN." },
      },
      required: ["amount"],
    },
  },
  {
    name: "browser_drag",
    description: "Drag from one coordinate to another.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        startX: { type: Type.NUMBER, description: "Starting X coordinate." },
        startY: { type: Type.NUMBER, description: "Starting Y coordinate." },
        endX: { type: Type.NUMBER, description: "Ending X coordinate." },
        endY: { type: Type.NUMBER, description: "Ending Y coordinate." },
      },
      required: ["startX", "startY", "endX", "endY"],
    },
  },
];
