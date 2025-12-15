import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import Exa from 'exa-js';

export interface ExaContextValue {
    exaClient: Exa | null;
    apiKey: string | null;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
    isReady: boolean;
}

const ExaContext = createContext<ExaContextValue | null>(null);

const EXA_API_KEY_STORAGE_KEY = 'mercury_exa_api_key';

interface ExaProviderProps {
    children: ReactNode;
}

export const ExaProvider: React.FC<ExaProviderProps> = ({ children }) => {
    const [apiKey, setApiKeyState] = useState<string | null>(() => {
        // Load from localStorage on mount
        return localStorage.getItem(EXA_API_KEY_STORAGE_KEY);
    });
    const [exaClient, setExaClient] = useState<Exa | null>(null);

    // Initialize Exa client when API key changes
    useEffect(() => {
        if (apiKey) {
            try {
                const client = new Exa(apiKey);
                setExaClient(client);
                console.log('[Exa] Client initialized');
            } catch (err) {
                console.error('[Exa] Failed to initialize client:', err);
                setExaClient(null);
            }
        } else {
            setExaClient(null);
        }
    }, [apiKey]);

    const setApiKey = useCallback((key: string) => {
        setApiKeyState(key);
        localStorage.setItem(EXA_API_KEY_STORAGE_KEY, key);
        console.log('[Exa] API key stored');
    }, []);

    const clearApiKey = useCallback(() => {
        setApiKeyState(null);
        setExaClient(null);
        localStorage.removeItem(EXA_API_KEY_STORAGE_KEY);
        console.log('[Exa] API key cleared');
    }, []);

    const value = useMemo(() => ({
        exaClient,
        apiKey,
        setApiKey,
        clearApiKey,
        isReady: exaClient !== null,
    }), [exaClient, apiKey, setApiKey, clearApiKey]);

    return (
        <ExaContext.Provider value={value}>
            {children}
        </ExaContext.Provider>
    );
};

export const useExa = (): ExaContextValue | null => {
    return useContext(ExaContext);
};

export const useExaRequired = (): ExaContextValue => {
    const context = useContext(ExaContext);
    if (!context) {
        throw new Error('useExaRequired must be used within ExaProvider');
    }
    return context;
};
