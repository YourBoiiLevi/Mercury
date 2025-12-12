import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { TOOLS } from "./tools";

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    // CRITICAL: Ensure API key is available
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing from environment variables.");
      // Fallback or error handling handled by UI
    }
    client = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-ui-dev' });
  }
  return client;
};

export const createChatSession = (): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: 'gemini-flash-latest',
    config: {
      temperature: 0.7,
      systemInstruction: `You are MERCURY, an advanced autonomous software engineering agent. 
      Your aesthetic is industrial, precise, and utilitarian. 
      You speak in technical jargon, short sentences, and data-dense logs. 
      You have access to Google Search and a virtual file system.
      Always prioritize correctness and efficiency.`,
      tools: [
        { googleSearch: {} },
        { functionDeclarations: TOOLS }
      ],
      // Thinking budget for complex tasks
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });
};

export const sendMessageStream = async (chat: Chat, message: string) => {
  return await chat.sendMessageStream({ message });
};