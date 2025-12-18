import React, { useEffect, useState, useRef } from 'react';
import { Globe, WifiOff, Loader2 } from 'lucide-react';
import { useE2B } from '../src/hooks/useE2B';

const BrowserView: React.FC = () => {
  const { sandbox, status } = useE2B();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of initialization to prevent double-init
  const initializedRef = useRef(false);

  useEffect(() => {
    if (status !== 'connected' || !sandbox) {
      setStreamUrl(null);
      initializedRef.current = false;
      return;
    }

    if (initializedRef.current) return;

    const initStream = async (retries = 3) => {
      setIsLoading(true);
      setError(null);

      // Wait a bit for the sandbox to be fully ready (e.g. Chrome launching)
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        // Ensure any previous stream is stopped (though SDK might handle this)
        try {
          await sandbox.stream.stop();
        } catch {
          // Ignore error if no stream was running
        }

        // Short pause after stop
        await new Promise(resolve => setTimeout(resolve, 500));

        // Start new stream
        await sandbox.stream.start({
          requireAuth: false // Simplify for internal view
        });

        const url = await sandbox.stream.getUrl();
        setStreamUrl(url);
        initializedRef.current = true;
        setIsLoading(false);
      } catch (err) {
        console.error(`[BrowserView] Failed to start stream (attempts left: ${retries}):`, err);
        if (retries > 0) {
          console.log('[BrowserView] Retrying in 2s...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return initStream(retries - 1);
        }
        setError(err instanceof Error ? err.message : 'Failed to start VNC stream');
        setIsLoading(false);
      }
    };

    initStream();

    return () => {
      // Optional: stop stream on unmount
      // sandbox.desktop.stream.stop().catch(console.error);
    };
  }, [sandbox, status]);

  if (status !== 'connected') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] text-[#333] relative overflow-hidden">
        <div className="absolute inset-0 scanline pointer-events-none z-10"></div>
        <WifiOff size={64} className="mb-4 opacity-50 text-[#FF3B00]" />
        <div className="text-2xl font-bold tracking-[0.2em] text-[#FF3B00] border-2 border-[#FF3B00] p-4 mb-2">
          SYSTEM OFFLINE
        </div>
        <div className="text-xs font-mono text-[#FF3B00]">WAITING FOR SANDBOX CONNECTION...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] text-[#333]">
        <Loader2 size={48} className="animate-spin text-[#00FF41] mb-4" />
        <div className="text-sm font-mono text-[#00FF41]">ESTABLISHING SECURE UPLINK...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] text-red-500 font-mono p-8 text-center">
        <div className="text-xl mb-2">STREAM ERROR</div>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black relative">
      {streamUrl ? (
        <iframe
          src={streamUrl}
          className="w-full h-full border-none block"
          allow="clipboard-read; clipboard-write"
          title="VNC Stream"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-[#333] font-mono">
          NO VIDEO FEED
        </div>
      )}

      {/* Overlay Status */}
      <div className="absolute top-2 right-2 bg-black/80 text-[#00FF41] text-[10px] font-mono px-2 py-1 rounded border border-[#00FF41]/30 pointer-events-none">
        LIVE FEED ●
      </div>
    </div>
  );
};

export default BrowserView;