import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    ReactNode
} from 'react';

export interface CommandEntry {
    id: string;
    command: string;
    stdout: string;
    stderr?: string;
    exitCode?: number;
    timestamp: number;
    cwd?: string;
}

export interface TerminalContextValue {
    commandHistory: CommandEntry[];
    addCommandEntry: (command: string, stdout: string, stderr?: string, exitCode?: number, cwd?: string) => void;
    clearHistory: () => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

interface TerminalProviderProps {
    children: ReactNode;
}

const generateId = () => `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
    const [commandHistory, setCommandHistory] = useState<CommandEntry[]>([]);

    const addCommandEntry = useCallback((
        command: string,
        stdout: string,
        stderr?: string,
        exitCode?: number,
        cwd?: string
    ) => {
        const entry: CommandEntry = {
            id: generateId(),
            command,
            stdout,
            stderr,
            exitCode,
            timestamp: Date.now(),
            cwd,
        };

        setCommandHistory(prev => [...prev, entry]);
        console.log('[Terminal] Command added:', command);
    }, []);

    const clearHistory = useCallback(() => {
        setCommandHistory([]);
    }, []);

    const value = useMemo(() => ({
        commandHistory,
        addCommandEntry,
        clearHistory,
    }), [commandHistory, addCommandEntry, clearHistory]);

    return (
        <TerminalContext.Provider value={value}>
            {children}
        </TerminalContext.Provider>
    );
};

export const useTerminal = (): TerminalContextValue | null => {
    return useContext(TerminalContext);
};

export const useTerminalRequired = (): TerminalContextValue => {
    const context = useContext(TerminalContext);
    if (!context) {
        throw new Error('useTerminalRequired must be used within TerminalProvider');
    }
    return context;
};
