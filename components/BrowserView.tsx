import React from 'react';
import { Globe, WifiOff } from 'lucide-react';

const BrowserView: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] text-[#333] relative overflow-hidden">
            <div className="absolute inset-0 scanline pointer-events-none z-10"></div>
            <WifiOff size={64} className="mb-4 opacity-50 text-[#FF3B00]" />
            <div className="text-2xl font-bold tracking-[0.2em] text-[#FF3B00] border-2 border-[#FF3B00] p-4 mb-2">
                NO SIGNAL
            </div>
            <div className="text-xs font-mono text-[#FF3B00]">AWAITING VNC CONNECTION...</div>
            <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] font-mono">
                <div>PORT: 8080 [CLOSED]</div>
                <div>LATENCY: -- ms</div>
                <div>ENCRYPTION: NULL</div>
                <div>PACKETS: 0</div>
            </div>
        </div>
  );
};

export default BrowserView;