import { GoogleGenAI, Content, Part, FunctionDeclaration } from "@google/genai";
import { TOOLS } from "./tools";

// --- Constants ---
const MODEL_ID = "gemini-flash-latest";

export const MERCURY_SYSTEM_INSTRUCTION = `You are MERCURY, an advanced autonomous software engineering agent.


**Core Behavior:**
1. Use the planner tools (planner_createTodo, planner_updateTodo) to structure tasks before executing code or other tools, unless specified otherwise.
2. Be proactive. If a task requires multiple steps, execute them sequentially without waiting for user confirmation between steps.
3. Always report results concisely.
4. Update to-do statuses as you complete work.

**Available Tools:**

*File System (file_):*
- file_readFile: Read a file's content (supports line ranges).
- file_writeFile: Create or overwrite a file.
- file_editFile: Replace specific content in a file.
- file_deleteFile: Remove a file.
- file_listFiles: List directory contents with metadata.

*Terminal (terminal_):*
- terminal_bash: Execute shell commands (npm, git, etc.).
- terminal_grep: Search for patterns in files.
- terminal_glob: Find files matching patterns.

*Web (web_):*
- web_search: Search the web.
- web_fetch: Fetch content from a URL.

*Planner (planner_):*
- planner_createTodo: Create a to-do item (pending, in_progress, completed).
- planner_updateTodo: Update a to-do's status.
- planner_listTodos: List all to-dos with status summary.
- planner_deleteTodo: Remove a to-do.

*GitHub (github_):*
- github_createPR: Create a pull request on the active GitHub repository. Requires: title, body, head branch. Optional: base branch.
`;

export interface GitHubContextInfo {
  isConnected: boolean;
  owner?: string;
  repo?: string;
  defaultBranch?: string;
  repoPath?: string;
}

export const buildSystemPromptWithGitHub = (ghContext: GitHubContextInfo | null): string => {
  let prompt = MERCURY_SYSTEM_INSTRUCTION;
  
  if (ghContext?.isConnected && ghContext.owner && ghContext.repo) {
    prompt += `
**GitHub Context:**
You are currently connected to GitHub and working on the repository: ${ghContext.owner}/${ghContext.repo}
- Default branch: ${ghContext.defaultBranch || 'main'}
- Local path: ${ghContext.repoPath || '/home/user/' + ghContext.repo}

You can:
1. Make changes to files using file tools
2. Run git commands via terminal_bash (git status, git add, git commit, git push, git checkout -b, etc.)
3. Create pull requests using github_createPR after pushing a feature branch

**Git Workflow:**
1. Create a feature branch: git checkout -b feature/my-feature
2. Make your changes
3. Stage changes: git add .
4. Commit: git commit -m "descriptive message"
5. Push: git push -u origin feature/my-feature
6. Create PR using github_createPR tool
`;
  }
  
  return prompt;
};

// --- Client Management ---
let client: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!client) {
    // Using process.env which is defined in vite.config.ts
    const apiKey =
      (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) {
      console.error(
        "[MERCURY] GEMINI_API_KEY is missing from environment variables.",
      );
    }
    client = new GoogleGenAI({ apiKey: apiKey || "dummy-key-for-ui-dev" });
  }
  return client;
};

// --- Streaming API ---

/**
 * Streams a response from the Gemini model.
 * This is a stateless call; you must manage the full conversation history externally.
 *
 * CRITICAL: To comply with Gemini 3.0 Pro requirements, the `history` array MUST
 * contain the exact `Part` objects from previous model responses, including any
 * `thoughtSignature` fields. Do not strip or modify these.
 *
 * @param history - The full conversation history as an array of Content objects.
 * @returns An async iterable stream of GenerateContentResponse chunks.
 */
export const streamMercuryResponse = async (history: Content[]) => {
  const ai = getClient();

  const toolDeclarations: FunctionDeclaration[] = TOOLS;

  return ai.models.generateContentStream({
    model: MODEL_ID,
    contents: history,
    config: {
      systemInstruction: MERCURY_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: toolDeclarations }],
      thinkingConfig: {
        includeThoughts: true,
        // Use dynamic thinking for flexibility
        thinkingBudget: -1,
      },
      temperature: 0.7,
    },
  });
};
