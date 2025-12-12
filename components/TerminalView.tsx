import React, { useEffect, useState, useRef } from 'react';
import { BOOT_SEQUENCE } from '../constants';

const TerminalView: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < BOOT_SEQUENCE.length) {
        setLines(prev => [...prev, BOOT_SEQUENCE[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="h-full w-full bg-mercury-black p-4 font-mono text-sm overflow-y-auto font-bold text-mercury-orange/80">
      <div className="mb-4 text-xs text-mercury-orange/40 border-b border-mercury-orange/20 pb-2">
        // KERNEL_LOG_OUTPUT
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="mb-1 break-all">
          <span className="opacity-50 mr-2">
             {`[${new Date().toLocaleTimeString('en-US', {hour12: false})}.${Math.floor(Math.random() * 999)}]`}
          </span>
          {line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default TerminalView;