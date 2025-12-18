import React, {
    createContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
    ReactNode
} from 'react';
import { Sandbox } from '@e2b/desktop';

export type E2BStatus = 'disconnected' | 'booting' | 'connected' | 'error';

export interface E2BContextState {
    sandbox: Sandbox | null;
    status: E2BStatus;
    error: string | null;
    sandboxId: string | null;
}

export interface E2BContextActions {
    connect: (apiKey: string) => Promise<void>;
    disconnect: () => Promise<void>;
}

export type E2BContextValue = E2BContextState & E2BContextActions;

export const E2BContext = createContext<E2BContextValue | null>(null);

interface E2BProviderProps {
    children: ReactNode;
}

export const E2BProvider: React.FC<E2BProviderProps> = ({ children }) => {
    const [sandbox, setSandbox] = useState<Sandbox | null>(null);
    const [status, setStatus] = useState<E2BStatus>('disconnected');
    const [error, setError] = useState<string | null>(null);
    const [sandboxId, setSandboxId] = useState<string | null>(null);

    const sandboxRef = useRef<Sandbox | null>(null);
    const connectingRef = useRef<boolean>(false);

    const connect = useCallback(async (apiKey: string) => {
        if (connectingRef.current || sandboxRef.current) {
            console.log('[E2B] Connection already in progress or established');
            return;
        }

        connectingRef.current = true;
        setStatus('booting');
        setError(null);

        console.log('[E2B] Connecting with key:', apiKey.slice(0, 8) + '...');

        try {
            const newSandbox = await Sandbox.create("mercury-vm-dev", {
                apiKey,
                timeoutMs: 10 * 60 * 1000,
            });

            // Launch Browser immediately so it's ready for VNC and tools
            console.log('[E2B] Launching Google Chrome...');
            try {
                await newSandbox.launch('google-chrome');
                console.log('[E2B] Google Chrome launched');
            } catch (launchErr) {
                console.warn('[E2B] Failed to launch Chrome:', launchErr);
                // Don't fail the whole connection if chrome fails, but warn
            }

            sandboxRef.current = newSandbox;
            setSandbox(newSandbox);
            setSandboxId(newSandbox.sandboxId);
            setStatus('connected');
            setError(null);

            console.log('[E2B] Connected. Sandbox ID:', newSandbox.sandboxId.slice(0, 8) + '...');
        } catch (err) {
            console.error('[E2B] Connection failed:', err);
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Connection failed');
            sandboxRef.current = null;
            setSandbox(null);
            setSandboxId(null);
        } finally {
            connectingRef.current = false;
        }
    }, []);

    const disconnect = useCallback(async () => {
        if (!sandboxRef.current) {
            console.log('[E2B] No active sandbox to disconnect');
            return;
        }

        console.log('[E2B] Disconnecting...');

        try {
            await sandboxRef.current.kill();
            console.log('[E2B] Sandbox terminated successfully');
        } catch (err) {
            console.warn('[E2B] Cleanup error:', err);
        } finally {
            sandboxRef.current = null;
            setSandbox(null);
            setSandboxId(null);
            setStatus('disconnected');
            setError(null);
        }
    }, []);

    useEffect(() => {
        if (status !== 'connected' || !sandboxRef.current) return;

        const keepAlive = setInterval(async () => {
            try {
                if (sandboxRef.current) {
                    await sandboxRef.current.setTimeout(10 * 60 * 1000);
                    console.log('[E2B] Keep-alive: timeout extended');
                }
            } catch (err) {
                console.warn('[E2B] Keep-alive failed:', err);
            }
        }, 4 * 60 * 1000);

        return () => clearInterval(keepAlive);
    }, [status]);

    useEffect(() => {
        return () => {
            if (sandboxRef.current) {
                console.log('[E2B] Unmounting: cleaning up sandbox...');
                sandboxRef.current.kill().catch(() => { });
            }
        };
    }, []);

    const contextValue = useMemo<E2BContextValue>(() => ({
        sandbox,
        status,
        error,
        sandboxId,
        connect,
        disconnect,
    }), [sandbox, status, error, sandboxId, connect, disconnect]);

    return (
        <E2BContext.Provider value={contextValue}>
            {children}
        </E2BContext.Provider>
    );
};
