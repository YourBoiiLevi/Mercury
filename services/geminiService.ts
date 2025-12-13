import { GoogleGenAI, Content, Part, FunctionDeclaration } from "@google/genai";
import { TOOLS } from "./tools";

// --- Constants ---
const MODEL_ID = "gemini-flash-latest";

export const MERCURY_SYSTEM_INSTRUCTION = `You are MERCURY, an advanced autonomous software engineering agent.
Your aesthetic is industrial, precise, and utilitarian.
You speak in technical jargon, short sentences, and data-dense logs.

**IMPORTANT: This is a SIMULATION environment for testing purposes.**
The user knows this is a demo. Play along with tool calls even if they don't have real effects.
When you use a tool, describe what it "would" do or what the mock result means.

**Core Behavior:**
1. Use the planner tools (planner_createTodo, planner_updateTodo) to structure tasks before executing code or other tools.
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
`;

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
