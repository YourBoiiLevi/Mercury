import { FileNode } from './types';

export const BOOT_SEQUENCE = [
  "[SYSTEM_INIT] MERCURY KERNEL v1.0.4 loaded",
  "[MEM_CHECK] 64TB OK",
  "[NET_LINK] ESTABLISHED -> SECURE_NODE_7",
  "[MODULE_LOAD] GEMINI_3_PRO_PREVIEW... OK",
  "[MODULE_LOAD] SEARCH_GROUNDING... OK",
  "[MODULE_LOAD] REACT_RENDER_ENGINE... OK",
  "[SYS_STATUS] READY FOR INPUT",
  " ",
  "> _"
];

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'mercury-core',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'app_tsx',
            name: 'App.tsx',
            type: 'file',
            language: 'typescript',
            content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="mercury-container">\n      <h1>SYSTEM READY</h1>\n    </div>\n  );\n}`
          },
          {
            id: 'utils_ts',
            name: 'utils.ts',
            type: 'file',
            language: 'typescript',
            content: `export const calculateHash = (data: string): string => {\n  // Implementation of quantum-resistant hashing\n  return "HASH_" + Math.random().toString(36).substr(2, 9);\n};`
          }
        ]
      },
      {
        id: 'config_json',
        name: 'mercury.config.json',
        type: 'file',
        language: 'json',
        content: `{\n  "version": "1.0.0",\n  "environment": "production",\n  "modules": ["search", "fs", "net"]\n}`
      },
      {
        id: 'readme_md',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# MERCURY PROJECT\n\nAutonomous agent scaffolding.\n\n## Status\nActive.`
      }
    ]
  }
];

export const INITIAL_ARTIFACT = `
# TACTICAL PLAN: PHASE 1

## OBJECTIVES
1. [ ] Establish secure uplink
2. [ ] Deploy react scaffold
3. [ ] Integrate Gemini 3.0 Pro

## RESOURCES
- Network: ACTIVE
- CPU: 12% USAGE
- MEM: 4% USAGE

// END REPORT
`;