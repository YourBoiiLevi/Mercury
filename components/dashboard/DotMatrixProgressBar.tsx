import React from 'react';

interface DotMatrixProgressBarProps {
    completed: number;
    total: number;
    showLabel?: boolean;
}

const DotMatrixProgressBar: React.FC<DotMatrixProgressBarProps> = ({
    completed,
    total,
    showLabel = true
}) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalDots = 20; // Number of dots in the bar
    const activeDots = Math.round((percentage / 100) * totalDots);

    // Create array of dots
    const dots = Array.from({ length: totalDots }, (_, i) => i < activeDots);

    return (
        <div className="flex flex-col gap-1 w-full">
            {/* The Dot Matrix Bar */}
            <div className="flex gap-[2px] h-3 w-full">
                {dots.map((isActive, idx) => (
                    <div
                        key={idx}
                        className={`flex-1 h-full transition-all duration-300 ${isActive
                                ? 'bg-mercury-orange'
                                : 'bg-gray-800'
                            }`}
                    />
                ))}
            </div>

            {/* Percentage Label */}
            {showLabel && (
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    <span>Processing</span>
                    <span className={percentage === 100 ? 'text-mercury-orange' : ''}>
                        {percentage}%
                    </span>
                </div>
            )}
        </div>
    );
};

export default DotMatrixProgressBar;
