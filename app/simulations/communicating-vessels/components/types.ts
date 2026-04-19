import React from 'react';

export interface LevelReturn {
    canProceed: boolean;
    reset: () => void;
    description: React.ReactNode;
    controls: React.ReactNode;
    svgContent: React.ReactNode;
}
