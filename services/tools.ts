import { FunctionDeclaration, Type } from '@google/genai';

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'readFile',
    description: 'Read the content of a file from the virtual file system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: 'The path of the file to read (e.g., src/App.tsx)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'listFiles',
    description: 'List all files in a directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: 'The directory path to list.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'executeCommand',
    description: 'Execute a shell command in the terminal.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: 'The command to execute.',
        },
      },
      required: ['command'],
    },
  },
];

// Mock execution handler - in a real app, this would modify state
export const executeToolMock = async (name: string, args: any): Promise<any> => {
  console.log(`[TOOL_EXEC] ${name}`, args);
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency
  
  switch (name) {
    case 'readFile':
      return { content: "// Mock file content for " + args.path };
    case 'listFiles':
      return { files: ['App.tsx', 'index.ts', 'styles.css'] };
    case 'executeCommand':
      return { stdout: `Executed ${args.command} successfully.`, exitCode: 0 };
    default:
      return { error: 'Unknown tool' };
  }
};