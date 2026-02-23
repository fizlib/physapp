"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Hammer, MapPin, RotateCcw, Crosshair, HelpCircle, PenTool, Trash2 } from 'lucide-react';

const GRID_COLS = 20;
const GRID_ROWS = 20;
const CELL_SIZE = 40;
const SVG_WIDTH = 880; // Grid is 800x800, leaving 40px padding on all sides
const SVG_HEIGHT = 880;

export default function CenterOfMassSimulation() {
    const [blocks, setBlocks] = useState<Record<string, boolean>>({});
    const [mode, setMode] = useState<'build' | 'hang'>('build');
    const [pin, setPin] = useState<{ x: number, y: number } | null>(null);
    const [markedLines, setMarkedLines] = useState<Array<{ x: number, y: number }>>([]);
    const [showCoM, setShowCoM] = useState(false);
    const [fallingBlocks, setFallingBlocks] = useState<Array<{ x: number, y: number, id: number }>>([]);

    const [isDragging, setIsDragging] = useState(false);
    const [dragAction, setDragAction] = useState<'adding' | 'removing'>('adding');

    const svgRef = useRef<SVGSVGElement>(null);
    const gridGroupRef = useRef<SVGGElement>(null);

    // Compute Center of Mass
    const { comX, comY, mass } = useMemo(() => {
        let cx = 0;
        let cy = 0;
        let m = 0;
        for (const key in blocks) {
            if (blocks[key]) {
                const [x, y] = key.split(',').map(Number);
                cx += x;
                cy += y;
                m++;
            }
        }
        if (m > 0) {
            cx /= m;
            cy /= m;
        }
        return { comX: cx, comY: cy, mass: m };
    }, [blocks]);

    // Compute transform for the object layer
    const { transformStr } = useMemo(() => {
        let rot = 0;
        if (mode === 'hang' && pin && mass > 0) {
            const dx = comX - pin.x;
            const dy = comY - pin.y;
            if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                rot = Math.PI / 2 - Math.atan2(dy, dx);
            }
        }

        const rotDeg = (rot * 180) / Math.PI;

        let transStr = "";
        // Grid padding inside the SVG
        const padX = 40;
        const padY = 40;

        if (mode === 'build' || !pin) {
            // Full view, large blocks for easy building/selecting pin
            transStr = `translate(${padX}px, ${padY}px) scale(1) rotate(0deg) translate(0px, 0px)`;
        } else {
            // Hung shape kept at scale 1 (no longer scales down)
            const pinScreenX = SVG_WIDTH / 2;
            const pinScreenY = SVG_HEIGHT / 3;
            const pxLocal = pin.x * CELL_SIZE + CELL_SIZE / 2;
            const pyLocal = pin.y * CELL_SIZE + CELL_SIZE / 2;
            transStr = `translate(${pinScreenX}px, ${pinScreenY}px) scale(1) rotate(${rotDeg}deg) translate(${-pxLocal}px, ${-pyLocal}px)`;
        }

        return { transformStr: transStr };
    }, [mode, pin, mass, comX, comY]);

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

        if (mode === 'hang') {
            const { x, y } = coords;
            if (blocks[`${x},${y}`]) {
                const connected = new Set<string>();
                const queue: [number, number][] = [[x, y]];
                connected.add(`${x},${y}`);

                let head = 0;
                while (head < queue.length) {
                    const [cx, cy] = queue[head++];
                    const neighbors = [
                        [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
                        [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]
                    ];
                    for (const [nx, ny] of neighbors) {
                        const key = `${nx},${ny}`;
                        if (blocks[key] && !connected.has(key)) {
                            connected.add(key);
                            queue.push([nx, ny]);
                        }
                    }
                }

                const nextBlocks: Record<string, boolean> = {};
                const newlyFalling: { x: number, y: number, id: number }[] = [];
                let fallId = Date.now();

                for (const key in blocks) {
                    if (blocks[key]) {
                        if (connected.has(key)) {
                            nextBlocks[key] = true;
                        } else {
                            const [fx, fy] = key.split(',').map(Number);
                            newlyFalling.push({ x: fx, y: fy, id: fallId++ });
                        }
                    }
                }

                setBlocks(nextBlocks);
                if (newlyFalling.length > 0) {
                    setFallingBlocks(prev => [...prev, ...newlyFalling]);
                }
                setPin({ x, y });
            }
            return;
        }

        // Build mode dragging logic
        setIsDragging(true);
        const key = `${coords.x},${coords.y}`;
        const isRemoving = !!blocks[key];
        setDragAction(isRemoving ? 'removing' : 'adding');
        setBlocks(prev => {
            const next = { ...prev };
            if (isRemoving) delete next[key];
            else next[key] = true;
            return next;
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || mode !== 'build') return;
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
                next[key] = true;
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

    const markPlumbLine = () => {
        if (mode === 'hang' && pin) {
            setMarkedLines(prev => [...prev, { x: pin.x, y: pin.y }]);
        }
    };

    const clearAll = () => {
        setBlocks({});
        setPin(null);
        setMarkedLines([]);
        setFallingBlocks([]);
        setMode('build');
    };

    return (
        <div className="flex flex-col h-screen min-h-[100dvh] bg-background text-foreground font-sans selection:bg-primary/20 overflow-hidden">

            {/* Compact Header */}
            <div className="flex-none bg-card p-4 border-b border-border shadow-sm z-10">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <Crosshair className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight leading-tight text-primary">Center of Mass</h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">Build shapes and find their balancing point.</p>
                    </div>
                </div>
            </div>

            {/* Canvas Area (Takes Available Space) */}
            <div className="flex-1 relative bg-secondary/30 w-full overflow-hidden flex items-center justify-center shadow-inner">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full cursor-crosshair touch-none select-none max-w-[800px] max-h-[800px]"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ userSelect: 'none', touchAction: 'none' }}
                >
                    <defs>
                        <pattern id="grid" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
                            <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="currentColor" strokeWidth="1" className="text-border/40" />
                        </pattern>
                        <filter id="shadow">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.25" />
                        </filter>
                        <style>{`
                            @keyframes dropOff {
                                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                                20% { opacity: 1; }
                                100% { transform: translateY(1500px) rotate(45deg); opacity: 0; }
                            }
                        `}</style>
                    </defs>

                    {/* Falling Blocks (Detach Effect) */}
                    <g style={{ transform: `translate(40px, 40px) scale(1)` }}>
                        {fallingBlocks.map((fb) => (
                            <rect
                                key={`falling-${fb.id}`}
                                x={fb.x * CELL_SIZE}
                                y={fb.y * CELL_SIZE}
                                width={CELL_SIZE}
                                height={CELL_SIZE}
                                fill="var(--primary)"
                                stroke="var(--background)"
                                strokeWidth="2"
                                style={{
                                    animation: 'dropOff 1.5s ease-in forwards',
                                    transformOrigin: `${fb.x * CELL_SIZE + CELL_SIZE / 2}px ${fb.y * CELL_SIZE + CELL_SIZE / 2}px`
                                }}
                                filter="url(#shadow)"
                            />
                        ))}
                    </g>

                    {/* Object Layer (Rotates and Translates) */}
                    <g ref={gridGroupRef} style={{ transform: transformStr, transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>

                        {/* Dynamic Grid Background matches exactly to local block space */}
                        <rect width={GRID_COLS * CELL_SIZE} height={GRID_ROWS * CELL_SIZE} fill="url(#grid)" />

                        {/* Draw blocks */}
                        {Array.from({ length: GRID_ROWS }).map((_, y) => (
                            Array.from({ length: GRID_COLS }).map((_, x) => {
                                const isSolid = !!blocks[`${x},${y}`];
                                return (
                                    <rect
                                        key={`${x}-${y}`}
                                        x={x * CELL_SIZE}
                                        y={y * CELL_SIZE}
                                        width={CELL_SIZE}
                                        height={CELL_SIZE}
                                        style={{
                                            fill: isSolid ? 'var(--primary)' : 'transparent',
                                            stroke: isSolid ? 'var(--background)' : 'transparent',
                                        }}
                                        strokeWidth="2"
                                        className={`transition-colors duration-200 ${mode === 'build' ? 'hover:fill-primary/20' : (isSolid && !pin ? 'hover:fill-primary/80 cursor-pointer' : '')}`}
                                        filter={isSolid ? "url(#shadow)" : ""}
                                    />
                                );
                            })
                        ))}

                        {/* Draw Marked Lines inside local space */}
                        {markedLines.map((ml, i) => {
                            const px = ml.x * CELL_SIZE + CELL_SIZE / 2;
                            const py = ml.y * CELL_SIZE + CELL_SIZE / 2;
                            const cx = comX * CELL_SIZE + CELL_SIZE / 2;
                            const cy = comY * CELL_SIZE + CELL_SIZE / 2;

                            const dx = cx - px;
                            const dy = cy - py;
                            const len = Math.sqrt(dx * dx + dy * dy);
                            let ex = px, ey = py + 3000;
                            if (len > 0.001) {
                                ex = px + (dx / len) * 3000;
                                ey = py + (dy / len) * 3000;
                            }

                            return (
                                <g key={i}>
                                    <line x1={px} y1={py} x2={ex} y2={ey} className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
                                    <line x1={px} y1={py} x2={px - (ex - px)} y2={py - (ey - py)} className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
                                </g>
                            )
                        })}

                        {/* Show Exact Center of Mass */}
                        {showCoM && mass > 0 && (
                            <g transform={`translate(${comX * CELL_SIZE + CELL_SIZE / 2}, ${comY * CELL_SIZE + CELL_SIZE / 2})`}>
                                <circle r="12" fill="var(--destructive)" />
                                <circle r="6" fill="var(--background)" />
                                <line x1="-20" y1="0" x2="20" y2="0" stroke="var(--destructive)" strokeWidth="3" />
                                <line x1="0" y1="-20" x2="0" y2="20" stroke="var(--destructive)" strokeWidth="3" />
                            </g>
                        )}

                        {/* Pin inside object local space */}
                        {mode === 'hang' && pin && (
                            <circle
                                cx={pin.x * CELL_SIZE + CELL_SIZE / 2}
                                cy={pin.y * CELL_SIZE + CELL_SIZE / 2}
                                r="10"
                                fill="var(--background)"
                                stroke="var(--foreground)"
                                strokeWidth="4"
                                filter="url(#shadow)"
                            />
                        )}
                    </g>

                    {/* World Space Plumb Line */}
                    {mode === 'hang' && pin && (
                        <g>
                            <line
                                x1={SVG_WIDTH / 2} y1={SVG_HEIGHT / 3}
                                x2={SVG_WIDTH / 2} y2={SVG_HEIGHT + 400}
                                className="stroke-red-500 opacity-80"
                                strokeWidth="3"
                                strokeDasharray="8,8"
                            />
                            <circle cx={SVG_WIDTH / 2} cy={SVG_HEIGHT / 3} r="6" className="fill-red-500" />
                        </g>
                    )}
                </svg>
            </div>

            {/* Bottom Toolbar Area */}
            <div className="flex-none bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20 pb-4 md:pb-6">
                <div className="max-w-4xl mx-auto flex flex-col gap-3 p-4">

                    {/* App-like Tabs */}
                    <div className="flex bg-secondary/50 p-1.5 rounded-xl border border-border/50">
                        <button
                            onClick={() => { setMode('build'); setPin(null); setFallingBlocks([]); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all duration-200 ${mode === 'build' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary/80'}`}
                        >
                            <Hammer className="w-5 h-5" />
                            Build Shape
                        </button>
                        <button
                            onClick={() => { if (mass > 0) setMode('hang'); }}
                            disabled={mass === 0}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all duration-200 ${mode === 'hang' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary/80'} ${mass === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                            <MapPin className="w-5 h-5" />
                            Hang Shape
                        </button>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {mode === 'build' && (
                            <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground bg-secondary/30 px-3 py-2.5 rounded-lg">
                                <HelpCircle className="w-5 h-5 shrink-0 text-primary" />
                                <span className="truncate">Swipe on grid to paint or erase blocks.</span>
                            </div>
                        )}

                        {mode === 'hang' && (
                            <button
                                onClick={markPlumbLine}
                                disabled={!pin}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition duration-200 disabled:opacity-50 font-medium"
                            >
                                <PenTool className="w-4 h-4" />
                                Mark Line
                            </button>
                        )}

                        <button
                            onClick={() => setShowCoM(!showCoM)}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-medium transition duration-200 ${showCoM ? 'bg-primary/10 border-primary text-primary' : 'border-border text-foreground hover:bg-secondary'}`}
                        >
                            <Crosshair className="w-4 h-4" />
                            <span className="whitespace-nowrap">Center Target</span>
                        </button>

                        <button
                            onClick={clearAll}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition duration-200 font-medium ml-auto"
                            title="Reset Area"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Clear All</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}