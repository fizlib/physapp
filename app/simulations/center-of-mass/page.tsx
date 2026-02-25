"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, ArrowRight, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const GRID_COLS = 20;
const GRID_ROWS = 20;
const CELL_SIZE = 40;
const SVG_WIDTH = 880;
const SVG_HEIGHT = 880;

const BLOCK_COLORS: Record<number, string> = {
    1: 'hsl(221, 83%, 53%)',  // Blue for 1 kg
    2: 'hsl(142, 71%, 45%)',  // Green for 2 kg
};

const BLOCK_STROKE_COLORS: Record<number, string> = {
    1: 'hsl(221, 83%, 40%)',
    2: 'hsl(142, 71%, 32%)',
};

export default function CenterOfMassSimulation() {
    // blocks now stores mass value (1 or 2) instead of boolean
    const [blocks, setBlocks] = useState<Record<string, number>>({});
    const [level, setLevel] = useState(1);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isTeacher, setIsTeacher] = useState(false);
    const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
    const [selectedWeight, setSelectedWeight] = useState(1);
    const [zoom, setZoom] = useState(1);

    const MAX_LEVEL = 3;

    const [isDragging, setIsDragging] = useState(false);
    const [dragAction, setDragAction] = useState<'adding' | 'removing'>('adding');

    const svgRef = useRef<SVGSVGElement>(null);
    const gridGroupRef = useRef<SVGGElement>(null);

    // Reset selected weight when changing levels
    const hasWeightSelector = level >= 3;

    // Compute Center of Mass (weighted)
    const { comX, comY, totalMass } = useMemo(() => {
        let cx = 0;
        let cy = 0;
        let m = 0;
        for (const key in blocks) {
            const w = blocks[key];
            if (w) {
                const [x, y] = key.split(',').map(Number);
                cx += x * w;
                cy += y * w;
                m += w;
            }
        }
        if (m > 0) {
            cx /= m;
            cy /= m;
        }
        return { comX: cx, comY: cy, totalMass: m };
    }, [blocks]);

    // Check if Center of Mass is at least 0.5 grid units away from every block
    const isComOutside = useMemo(() => {
        if (totalMass === 0) return false;
        const MIN_DIST = 0.5;
        for (const key in blocks) {
            if (!blocks[key]) continue;
            const [bx, by] = key.split(',').map(Number);
            const dx = Math.max(bx - comX, 0, comX - (bx + 1));
            const dy = Math.max(by - comY, 0, comY - (by + 1));
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MIN_DIST) return false;
        }
        return true;
    }, [blocks, comX, comY, totalMass]);

    const getCoordinates = (e: React.PointerEvent) => {
        if (!svgRef.current || !gridGroupRef.current) return null;

        let pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;

        const ctm = gridGroupRef.current.getScreenCTM();
        if (!ctm) return null;

        const localPt = pt.matrixTransform(ctm.inverse());
        const x = Math.floor(localPt.x / CELL_SIZE);
        const y = Math.floor(localPt.y / CELL_SIZE);

        if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
            return { x, y };
        }
        return null;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        const coords = getCoordinates(e);
        if (!coords) return;

        setIsDragging(true);
        const key = `${coords.x},${coords.y}`;
        const isRemoving = !!blocks[key];
        setDragAction(isRemoving ? 'removing' : 'adding');
        setBlocks(prev => {
            const next = { ...prev };
            if (isRemoving) delete next[key];
            else next[key] = selectedWeight;
            return next;
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const coords = getCoordinates(e);
        if (!coords) return;

        const key = `${coords.x},${coords.y}`;
        setBlocks(prev => {
            if (dragAction === 'removing' && prev[key]) {
                const next = { ...prev };
                delete next[key];
                return next;
            } else if (dragAction === 'adding' && !prev[key]) {
                const next = { ...prev };
                next[key] = selectedWeight;
                return next;
            }
            return prev;
        });
    };

    const handlePointerUp = () => setIsDragging(false);

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('pointerup', handleGlobalMouseUp);
        return () => window.removeEventListener('pointerup', handleGlobalMouseUp);
    }, []);

    // Check if user is a teacher
    useEffect(() => {
        const checkRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profile?.role === 'teacher') setIsTeacher(true);
        };
        checkRole();
    }, []);

    const clearAll = () => {
        setBlocks({});
    };

    const canProceed = totalMass > 0 && (level !== 2 || isComOutside);

    return (
        <div className="flex flex-col h-screen min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20">

            {/* Legend Bar */}
            <div className="flex-none bg-card/80 backdrop-blur-sm px-4 py-3 border-b border-border/50 z-10">
                <div className="max-w-4xl mx-auto flex items-center gap-6">
                    {!hasWeightSelector && (
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm shadow-sm" style={{ backgroundColor: BLOCK_COLORS[1], border: `2px solid ${BLOCK_STROKE_COLORS[1]}` }} />
                            <span className="text-sm font-medium text-foreground">= 1 kg</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="8" fill="var(--destructive)" />
                            <circle cx="12" cy="12" r="4" fill="var(--background)" />
                            <line x1="4" y1="12" x2="20" y2="12" stroke="var(--destructive)" strokeWidth="2" />
                            <line x1="12" y1="4" x2="12" y2="20" stroke="var(--destructive)" strokeWidth="2" />
                        </svg>
                        <span className="text-sm font-medium text-foreground">= Center of Mass</span>
                    </div>

                    {/* Teacher Level Switcher */}
                    {isTeacher && (
                        <div className="ml-auto relative">
                            <button
                                onClick={() => setLevelDropdownOpen(prev => !prev)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-sm font-medium text-foreground hover:bg-secondary transition duration-150"
                            >
                                Level {level}
                                <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${levelDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {levelDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[120px] py-1">
                                    {Array.from({ length: MAX_LEVEL }).map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => {
                                                setLevel(i + 1);
                                                setBlocks({});
                                                setFeedback(null);
                                                setSelectedWeight(1);
                                                setLevelDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition duration-150 ${level === i + 1
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-foreground hover:bg-secondary/60'
                                                }`}
                                        >
                                            Level {i + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Level Task Description */}
            <div className="flex-none text-center py-2 px-4 bg-secondary/40 border-b border-border/30">
                {level === 1 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Level 1:</span> Draw any shape using the 1 kg blocks
                    </p>
                )}
                {level === 2 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Level 2:</span> Draw a shape whose center of mass is <span className="font-semibold text-destructive">outside</span> the object
                    </p>
                )}
                {level === 3 && (
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Level 3:</span> Draw any shape using both 1 kg and 2 kg blocks
                    </p>
                )}
                {feedback && (
                    <p className="text-sm text-destructive font-medium mt-1 animate-pulse">{feedback}</p>
                )}
            </div>

            {/* Block Weight Selector (Level 3+) */}
            {hasWeightSelector && (
                <div className="flex-none flex justify-center gap-2 py-2 px-4 bg-secondary/20 border-b border-border/20">
                    <button
                        onClick={() => setSelectedWeight(1)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition duration-150 ${selectedWeight === 1
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'border-border/50 text-muted-foreground hover:bg-secondary/40'
                            }`}
                    >
                        <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[1] }} />
                        1 kg
                    </button>
                    <button
                        onClick={() => setSelectedWeight(2)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition duration-150 ${selectedWeight === 2
                            ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 shadow-sm'
                            : 'border-border/50 text-muted-foreground hover:bg-secondary/40'
                            }`}
                    >
                        <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[2] }} />
                        2 kg
                    </button>
                </div>
            )}

            {/* Canvas Area */}
            <div className="flex-1 min-h-0 relative bg-secondary/30 w-full overflow-hidden flex items-center justify-center shadow-inner">
                <svg
                    ref={svgRef}
                    viewBox={`${(SVG_WIDTH - SVG_WIDTH / zoom) / 2} ${(SVG_HEIGHT - SVG_HEIGHT / zoom) / 2} ${SVG_WIDTH / zoom} ${SVG_HEIGHT / zoom}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full cursor-crosshair touch-none select-none max-w-[800px]"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ userSelect: 'none', touchAction: 'none' }}
                >
                    <defs>
                        <pattern id="grid" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
                            <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50" />
                        </pattern>
                        <filter id="shadow">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.25" />
                        </filter>
                    </defs>

                    {/* Object Layer */}
                    <g ref={gridGroupRef} style={{ transform: `translate(40px, 40px) scale(1)` }}>

                        {/* Grid Background */}
                        <rect width={GRID_COLS * CELL_SIZE} height={GRID_ROWS * CELL_SIZE} fill="url(#grid)" />

                        {/* Draw blocks */}
                        {Array.from({ length: GRID_ROWS }).map((_, y) => (
                            Array.from({ length: GRID_COLS }).map((_, x) => {
                                const blockMass = blocks[`${x},${y}`];
                                const isSolid = !!blockMass;
                                return (
                                    <rect
                                        key={`${x}-${y}`}
                                        x={x * CELL_SIZE}
                                        y={y * CELL_SIZE}
                                        width={CELL_SIZE}
                                        height={CELL_SIZE}
                                        style={{
                                            fill: isSolid ? BLOCK_COLORS[blockMass] : 'transparent',
                                            stroke: isSolid ? 'var(--background)' : 'transparent',
                                        }}
                                        strokeWidth="2"
                                        className={`transition-colors duration-200 hover:fill-primary/20`}
                                        filter={isSolid ? "url(#shadow)" : ""}
                                    />
                                );
                            })
                        ))}

                        {/* Always show Center of Mass when blocks exist */}
                        {totalMass > 0 && (
                            <g transform={`translate(${comX * CELL_SIZE + CELL_SIZE / 2}, ${comY * CELL_SIZE + CELL_SIZE / 2})`}>
                                <circle r="12" fill="var(--destructive)" />
                                <circle r="6" fill="var(--background)" />
                                <line x1="-20" y1="0" x2="20" y2="0" stroke="var(--destructive)" strokeWidth="3" />
                                <line x1="0" y1="-20" x2="0" y2="20" stroke="var(--destructive)" strokeWidth="3" />
                            </g>
                        )}
                    </g>
                </svg>

                {/* Zoom Controls */}
                <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
                    <button
                        onClick={() => setZoom(z => Math.min(z + 0.25, 2.5))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-card/90 border border-border shadow-md hover:bg-card transition duration-150"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-card/90 border border-border shadow-md hover:bg-card transition duration-150"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar Area */}
            <div className="flex-none bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 pb-4 md:pb-6">
                <div className="max-w-4xl mx-auto flex items-center gap-3 p-4">
                    <button
                        onClick={clearAll}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition duration-200 font-medium"
                        title="Clear All"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Clear All</span>
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={() => {
                            setFeedback(null);
                            setBlocks({});
                            setSelectedWeight(1);
                            setLevel(prev => prev + 1);
                        }}
                        disabled={!canProceed}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition duration-200 ${canProceed ? 'bg-primary text-primary-foreground shadow-md hover:opacity-90' : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'}`}
                    >
                        Next Level
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

        </div>
    );
}