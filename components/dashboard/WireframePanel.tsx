import React from 'react';

interface WireframePanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    noPadding?: boolean;
}

const WireframePanel: React.FC<WireframePanelProps> = ({
    children,
    className = '',
    title,
    noPadding = false
}) => {
    return (
        <div className={`relative bg-mercury-carbon border border-gray-800 ${className}`}>
            {/* L-Brackets - White, 2px thick, positioned at corners */}
            {/* Top Left */}
            <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-l-2 border-t-2 border-white z-10" />
            {/* Top Right */}
            <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-r-2 border-t-2 border-white z-10" />
            {/* Bottom Left */}
            <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-l-2 border-b-2 border-white z-10" />
            {/* Bottom Right */}
            <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-r-2 border-b-2 border-white z-10" />

            {/* Optional Title embedded in border */}
            {title && (
                <div className="absolute -top-3 left-4 bg-mercury-carbon px-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">
                        {title}
                    </span>
                </div>
            )}

            {/* Content */}
            <div className={`h-full w-full ${noPadding ? '' : 'p-4'}`}>
                {children}
            </div>
        </div>
    );
};

export default WireframePanel;
