import React, { useEffect, useState, useRef, useMemo } from 'react';
import { BOOT_SEQUENCE } from '../constants';
import { useTerminal, CommandEntry } from '../src/contexts/TerminalContext';

interface TerminalLine {
  type: 'boot' | 'command' | 'stdout' | 'stderr' | 'divider';
  content: string;
  timestamp?: string;
}

const TerminalView: React.FC = () => {
  const terminalContext = useTerminal();
  const commandHistory = terminalContext?.commandHistory || [];
  
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootComplete, setBootComplete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < BOOT_SEQUENCE.length) {
        setBootLines(prev => [...prev, BOOT_SEQUENCE[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setBootComplete(true);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  const terminalLines = useMemo((): TerminalLine[] => {
    const lines: TerminalLine[] = [];

    bootLines.forEach(line => {
      lines.push({ type: 'boot', content: line });
    });

    if (bootComplete && commandHistory.length > 0) {
      lines.push({ type: 'divider', content: '─'.repeat(60) });
      lines.push({ type: 'boot', content: '// AGENT_COMMAND_HISTORY' });
      lines.push({ type: 'divider', content: '' });
    }

    commandHistory.forEach((entry: CommandEntry) => {
      lines.push({ 
        type: 'command', 
        content: entry.command,
        timestamp: formatTimestamp(entry.timestamp)
      });

      if (entry.stdout) {
        entry.stdout.split('\n').forEach(line => {
          if (line.trim()) {
            lines.push({ type: 'stdout', content: line });
          }
        });
      }

      if (entry.stderr) {
        entry.stderr.split('\n').forEach(line => {
          if (line.trim()) {
            lines.push({ type: 'stderr', content: line });
          }
        });
      }

      if (entry.exitCode !== undefined && entry.exitCode !== 0) {
        lines.push({ type: 'stderr', content: `[exit code: ${entry.exitCode}]` });
      }

      lines.push({ type: 'divider', content: '' });
    });

    return lines;
  }, [bootLines, bootComplete, commandHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const renderLine = (line: TerminalLine, idx: number) => {
    switch (line.type) {
      case 'boot':
        return (
          <div key={idx} className="mb-1 break-all">
            <span className="opacity-50 mr-2">
              {`[${new Date().toLocaleTimeString('en-US', {hour12: false})}.${Math.floor(Math.random() * 999).toString().padStart(3, '0')}]`}
            </span>
            {line.content}
          </div>
        );
      case 'command':
        return (
          <div key={idx} className="mb-1 break-all text-green-400">
            <span className="opacity-50 mr-2 text-mercury-orange/50">[{line.timestamp}]</span>
            <span className="text-mercury-orange mr-1">$</span>
            {line.content}
          </div>
        );
      case 'stdout':
        return (
          <div key={idx} className="mb-0.5 break-all text-gray-300 pl-4">
            {line.content}
          </div>
        );
      case 'stderr':
        return (
          <div key={idx} className="mb-0.5 break-all text-red-400 pl-4">
            {line.content}
          </div>
        );
      case 'divider':
        return (
          <div key={idx} className="mb-1 text-mercury-orange/20">
            {line.content}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full bg-mercury-black p-4 font-mono text-sm overflow-y-auto font-bold text-mercury-orange/80">
      <div className="mb-4 text-xs text-mercury-orange/40 border-b border-mercury-orange/20 pb-2 flex items-center justify-between">
        <span>// KERNEL_LOG_OUTPUT</span>
        {commandHistory.length > 0 && (
          <span className="text-mercury-orange/30">{commandHistory.length} commands</span>
        )}
      </div>
      {terminalLines.map((line, idx) => renderLine(line, idx))}
      <div ref={bottomRef} />
    </div>
  );
};

export default TerminalView;
