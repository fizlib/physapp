"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Hammer, MapPin, RotateCcw, Crosshair, HelpCircle, PenTool } from 'lucide-react';

const GRID_COLS = 20;
const GRID_ROWS = 20;
const CELL_SIZE = 24;
const SVG_WIDTH = 800;
const SVG_HEIGHT = 600;

export default function CenterOfMassSimulation() {
    const [blocks, setBlocks] = useState<Record<string, boolean>>({});
    const [mode, setMode] = useState<'build' | 'hang'>('build');
    const [pin, setPin] = useState<{ x: number, y: number } | null>(null);
    const [markedLines, setMarkedLines] = useState<Array<{ x: number, y: number }>>([]);
    const [showCoM, setShowCoM] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [dragAction, setDragAction] = useState<'adding' | 'removing'>('adding');

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
        let rot = 0; // radians
        if (mode === 'hang' && pin && mass > 0) {
            const dx = comX - pin.x;
            const dy = comY - pin.y;
            if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                rot = Math.PI / 2 - Math.atan2(dy, dx);
            }
        }

        // Convert radians to degrees for CSS
        const rotDeg = (rot * 180) / Math.PI;

        let transStr = "";
        const objWidth = GRID_COLS * CELL_SIZE;
        const objHeight = GRID_ROWS * CELL_SIZE;

        if (mode === 'build') {
            transStr = `translate(${SVG_WIDTH / 2 - objWidth / 2}px, ${SVG_HEIGHT / 2 - objHeight / 2}px)`;
        } else {
            const pinScreenX = SVG_WIDTH / 2;
            const pinScreenY = SVG_HEIGHT / 3;

            if (pin) {
                const pxLocal = pin.x * CELL_SIZE + CELL_SIZE / 2;
                const pyLocal = pin.y * CELL_SIZE + CELL_SIZE / 2;
                transStr = `translate(${pinScreenX}px, ${pinScreenY}px) rotate(${rotDeg}deg) translate(${-pxLocal}px, ${-pyLocal}px)`;
            } else {
                transStr = `translate(${SVG_WIDTH / 2 - objWidth / 2}px, ${SVG_HEIGHT / 2 - objHeight / 2}px)`;
            }
        }

        return { transformStr: transStr };
    }, [mode, pin, mass, comX, comY]);

    const handlePointerDown = (x: number, y: number) => {
        if (mode === 'hang') {
            if (blocks[`${x},${y}`]) {
                setPin({ x, y });
            }
            return;
        }

        // Build mode
        setIsDragging(true);
        const key = `${x},${y}`;
        const isRemoving = !!blocks[key];
        setDragAction(isRemoving ? 'removing' : 'adding');
        setBlocks(prev => {
            const next = { ...prev };
            if (isRemoving) delete next[key];
            else next[key] = true;
            return next;
        });
    };

    const handlePointerEnter = (x: number, y: number) => {
        if (mode !== 'build' || !isDragging) return;
        const key = `${x},${y}`;
        setBlocks(prev => {
            const next = { ...prev };
            if (dragAction === 'removing') delete next[key];
            else next[key] = true;
            return next;
        });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
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
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-8 px-4 font-sans selection:bg-primary/20">

            {/* Header */}
            <div className="max-w-4xl w-full flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <Crosshair className="w-8 h-8" />
                        Center of Mass Explorer
                    </h1>
                    <p className="text-muted-foreground mt-1">Build shapes and observe their exact balancing point.</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-4 gap-6 relative">

                {/* Toolbar sidebar */}
                <div className="flex flex-col gap-4 bg-card border border-border rounded-xl p-5 shadow-sm h-fit">
                    <h2 className="text-lg font-semibold mb-2">Modes</h2>

                    <button
                        onClick={() => { setMode('build'); setPin(null); }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition duration-200 ${mode === 'build' ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-transparent border-border hover:bg-secondary'
                            }`}
                    >
                        <Hammer className="w-5 h-5" />
                        <span className="font-medium">Build Mode</span>
                    </button>

                    <button
                        onClick={() => {
                            if (mass > 0) setMode('hang');
                        }}
                        disabled={mass === 0}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition duration-200 ${mode === 'hang' ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-transparent border-border hover:bg-secondary'
                            } ${mass === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <MapPin className="w-5 h-5" />
                        <span className="font-medium">Hang Mode</span>
                    </button>

                    <div className="h-px bg-border my-2" />

                    <h2 className="text-lg font-semibold mb-2">Actions</h2>

                    {mode === 'hang' && (
                        <button
                            onClick={markPlumbLine}
                            disabled={!pin}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition duration-200 disabled:opacity-50"
                        >
                            <PenTool className="w-5 h-5" />
                            <span className="font-medium">Mark Plumb Line</span>
                        </button>
                    )}

                    <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary cursor-pointer transition">
                        <input
                            type="checkbox"
                            checked={showCoM}
                            onChange={e => setShowCoM(e.target.checked)}
                            className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                        />
                        <span className="font-medium">Show Exact Center</span>
                    </label>

                    <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition duration-200 mt-4"
                    >
                        <RotateCcw className="w-5 h-5" />
                        <span className="font-medium">Reset Grid</span>
                    </button>

                    <div className="mt-auto pt-6 text-sm text-muted-foreground bg-secondary/50 p-4 rounded-lg flex gap-3">
                        <HelpCircle className="w-5 h-5 shrink-0 text-primary" />
                        <p>{mode === 'build' ? 'Click and drag on the grid to create or erase blocks.' : 'Click on any filled block to hang the shape from it.'}</p>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="md:col-span-3 bg-secondary/30 border border-border rounded-xl aspect-[4/3] relative overflow-hidden shadow-inner">
                    <svg
                        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                        preserveAspectRatio="xMidYMid meet"
                        className="w-full h-full cursor-crosshair touch-none select-none"
                        onMouseLeave={() => setIsDragging(false)}
                        onDragStart={(e) => e.preventDefault()}
                        style={{ userSelect: 'none', touchAction: 'none' }}
                    >
                        {/* World Grid Layer */}
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/40" />
                            </pattern>
                            <filter id="shadow">
                                <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.2" />
                            </filter>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {/* Object Layer (Rotates and Translates) */}
                        <g style={{ transform: transformStr, transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                            {/* Draw blocks */}
                            {Array.from({ length: GRID_ROWS }).map((_, y) => (
                                Array.from({ length: GRID_COLS }).map((_, x) => {
                                    const isSolid = !!blocks[`${x},${y}`];
                                    const isPin = mode === 'hang' && pin?.x === x && pin?.y === y;

                                    return (
                                        <rect
                                            key={`${x}-${y}`}
                                            x={x * CELL_SIZE}
                                            y={y * CELL_SIZE}
                                            width={CELL_SIZE}
                                            height={CELL_SIZE}
                                            style={{
                                                fill: isSolid ? 'var(--primary)' : 'transparent',
                                                stroke: isSolid ? 'var(--background)' : (mode === 'build' ? 'var(--border)' : 'transparent')
                                            }}
                                            strokeWidth="1"
                                            className={`transition-colors duration-200 ${mode === 'build' ? 'hover:fill-primary/50' : (isSolid ? 'cursor-pointer hover:fill-primary/80' : '')}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handlePointerDown(x, y);
                                            }}
                                            onMouseEnter={() => handlePointerEnter(x, y)}
                                            filter={isSolid ? "url(#shadow)" : ""}
                                        />
                                    );
                                })
                            ))}

                            {/* Draw Marked Lines */}
                            {markedLines.map((ml, i) => {
                                const px = ml.x * CELL_SIZE + CELL_SIZE / 2;
                                const py = ml.y * CELL_SIZE + CELL_SIZE / 2;
                                const cx = comX * CELL_SIZE + CELL_SIZE / 2;
                                const cy = comY * CELL_SIZE + CELL_SIZE / 2;

                                const dx = cx - px;
                                const dy = cy - py;
                                const len = Math.sqrt(dx * dx + dy * dy);
                                let ex = px, ey = py + 2000;
                                if (len > 0.001) {
                                    ex = px + (dx / len) * 2000;
                                    ey = py + (dy / len) * 2000;
                                }

                                return (
                                    <g key={i}>
                                        <line
                                            x1={px} y1={py}
                                            x2={ex} y2={ey}
                                            className="stroke-red-500 dark:stroke-red-400"
                                            style={{ stroke: 'var(--destructive, #ef4444)' }}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                        <line
                                            x1={px} y1={py}
                                            x2={px - (ex - px)} y2={py - (ey - py)}
                                            className="stroke-red-500 dark:stroke-red-400"
                                            style={{ stroke: 'var(--destructive, #ef4444)' }}
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                    </g>
                                )
                            })}

                            {/* Show exact Center of Mass */}
                            {showCoM && mass > 0 && (
                                <g transform={`translate(${comX * CELL_SIZE + CELL_SIZE / 2}, ${comY * CELL_SIZE + CELL_SIZE / 2})`}>
                                    <circle r="8" fill="var(--destructive)" />
                                    <circle r="4" fill="var(--background)" />
                                    <line x1="-12" y1="0" x2="12" y2="0" stroke="var(--destructive)" strokeWidth="2" />
                                    <line x1="0" y1="-12" x2="0" y2="12" stroke="var(--destructive)" strokeWidth="2" />
                                </g>
                            )}

                            {/* Pin inside object local space (drawn on top) */}
                            {mode === 'hang' && pin && (
                                <circle
                                    cx={pin.x * CELL_SIZE + CELL_SIZE / 2}
                                    cy={pin.y * CELL_SIZE + CELL_SIZE / 2}
                                    r="6"
                                    fill="var(--background)"
                                    stroke="var(--foreground)"
                                    strokeWidth="3"
                                    filter="url(#shadow)"
                                />
                            )}
                        </g>

                        {/* World Space Plumb Line */}
                        {mode === 'hang' && pin && (
                            <g>
                                {/* The plumb string starting exactly from the world space pin location */}
                                <line
                                    x1={SVG_WIDTH / 2} y1={SVG_HEIGHT / 3}
                                    x2={SVG_WIDTH / 2} y2={SVG_HEIGHT + 200}
                                    stroke="var(--destructive, #ef4444)"
                                    className="stroke-red-500 dark:stroke-red-400"
                                    strokeWidth="2"
                                    strokeDasharray="6,6"
                                    opacity="0.8"
                                />
                                {/* Visual pin in world space connecting to the background */}
                                <circle cx={SVG_WIDTH / 2} cy={SVG_HEIGHT / 3} r="4" fill="var(--destructive, #ef4444)" className="fill-red-500 dark:fill-red-400" />
                            </g>
                        )}
                    </svg>
                </div>

            </div>
        </div>
    );
}
