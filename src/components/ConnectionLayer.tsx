import React from 'react';
import type { DroppedItem, Connection } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────
const OFFSET = 12; // perpendicular lane offset (px) for two-way connections

// ── Helper: visual centre of an item ─────────────────────────────────────────
function getCenter(item: DroppedItem): { x: number; y: number } {
    const scale = item.size * item.zoom;
    let w = 80, h = 52;
    if (item.type === 'circle') { w = 80; h = 80; }
    if (item.type === 'triangle') { w = 80; h = 69; }
    if (item.type === 'text') { w = 80; h = 44; }
    if (item.type === 'image') { w = 44; h = 44; }
    return { x: item.x + (w * scale) / 2, y: item.y + (h * scale) / 2 };
}

// ── Helper: perpendicular offset vector ───────────────────────────────────────
function perp(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    dist: number
): { ox: number; oy: number } {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { ox: (-dy / len) * dist, oy: (dx / len) * dist };
}

interface ConnectionLayerProps {
    items: DroppedItem[];
    connections: Connection[];
    selectedConnectionId: string | null;
    onSelectConnection: (id: string | null) => void;
}

// ── ConnectionLayer ───────────────────────────────────────────────────────────
const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
    items,
    connections,
    selectedConnectionId,
    onSelectConnection,
}) => {
    if (connections.length === 0) return null;

    const itemMap = new Map(items.map(i => [i.id, i]));

    return (
        /*
         * SVG background: pointer-events:none so canvas clicks aren't blocked.
         * Individual path elements opt in via pointerEvents:'stroke'.
         */
        <svg
            className="connection-layer"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
            <defs>
                {/* ── A→B (indigo) arrowheads ─────────────────────────────── */}
                <marker id="arrow-ab" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" opacity="0.85" />
                </marker>
                <marker id="arrow-ab-sel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#a5b4fc" />
                </marker>

                {/* ── B→A (rose) arrowheads ───────────────────────────────── */}
                <marker id="arrow-ba" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" opacity="0.85" />
                </marker>
                <marker id="arrow-ba-sel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#fb7185" />
                </marker>

                {/* ── Glow filter for selected lines ───────────────────────── */}
                <filter id="conn-glow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {connections.map(conn => {
                const from = itemMap.get(conn.fromId);
                const to = itemMap.get(conn.toId);
                if (!from || !to) return null;

                const p1 = getCenter(from); // A (FROM)
                const p2 = getCenter(to);   // B (TO)

                const isTwoWay = (conn.direction ?? 'one-way') === 'two-way';
                const isSelected = conn.id === selectedConnectionId;

                const onClickLine = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelectConnection(isSelected ? null : conn.id);
                };

                // ── Two-way: two offset parallel lanes ────────────────────
                if (isTwoWay) {
                    const { ox, oy } = perp(p1, p2, OFFSET);

                    // A→B lane shifted by +offset
                    const a1 = { x: p1.x + ox, y: p1.y + oy };
                    const a2 = { x: p2.x + ox, y: p2.y + oy };

                    // B→A lane shifted by -offset (drawn p2→p1 so arrow points at p1)
                    const b1 = { x: p2.x - ox, y: p2.y - oy };
                    const b2 = { x: p1.x - ox, y: p1.y - oy };

                    return (
                        <g key={conn.id}>
                            {/* Wide invisible hit area */}
                            <path
                                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                                fill="none" stroke="transparent" strokeWidth={24}
                                style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                                onClick={onClickLine}
                            />

                            {/* A→B lane — indigo */}
                            <path
                                d={`M ${a1.x} ${a1.y} L ${a2.x} ${a2.y}`}
                                fill="none"
                                stroke={isSelected ? '#a5b4fc' : '#6366f1'}
                                strokeWidth={isSelected ? 2.5 : 2}
                                strokeLinecap="round"
                                opacity={isSelected ? 1 : 0.85}
                                filter={isSelected ? 'url(#conn-glow)' : undefined}
                                markerEnd={isSelected ? 'url(#arrow-ab-sel)' : 'url(#arrow-ab)'}
                                style={{ pointerEvents: 'none' }}
                            />

                            {/* B→A lane — rose */}
                            <path
                                d={`M ${b1.x} ${b1.y} L ${b2.x} ${b2.y}`}
                                fill="none"
                                stroke={isSelected ? '#fb7185' : '#f43f5e'}
                                strokeWidth={isSelected ? 2.5 : 2}
                                strokeLinecap="round"
                                opacity={isSelected ? 1 : 0.85}
                                filter={isSelected ? 'url(#conn-glow)' : undefined}
                                markerEnd={isSelected ? 'url(#arrow-ba-sel)' : 'url(#arrow-ba)'}
                                style={{ pointerEvents: 'none' }}
                            />

                            {/* White dot at A end (FROM — indigo ring) */}
                            <circle cx={p1.x} cy={p1.y} r={isSelected ? 6 : 5}
                                fill="white" stroke={isSelected ? '#a5b4fc' : '#6366f1'}
                                strokeWidth={isSelected ? 2 : 1.5} opacity={isSelected ? 1 : 0.9}
                                style={{ pointerEvents: 'none' }} />

                            {/* White dot at B end (TO — rose ring) */}
                            <circle cx={p2.x} cy={p2.y} r={isSelected ? 6 : 5}
                                fill="white" stroke={isSelected ? '#fb7185' : '#f43f5e'}
                                strokeWidth={isSelected ? 2 : 1.5} opacity={isSelected ? 1 : 0.9}
                                style={{ pointerEvents: 'none' }} />
                        </g>
                    );
                }

                // ── One-way: single indigo line ───────────────────────────
                return (
                    <g key={conn.id}>
                        <path
                            d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                            fill="none" stroke="transparent" strokeWidth={20}
                            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                            onClick={onClickLine}
                        />
                        <path
                            d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                            fill="none"
                            stroke={isSelected ? '#a5b4fc' : '#6366f1'}
                            strokeWidth={isSelected ? 2.5 : 2}
                            strokeLinecap="round"
                            opacity={isSelected ? 1 : 0.85}
                            filter={isSelected ? 'url(#conn-glow)' : undefined}
                            markerEnd={isSelected ? 'url(#arrow-ab-sel)' : 'url(#arrow-ab)'}
                            style={{ pointerEvents: 'none' }}
                        />
                        {/* White start dot (FROM) */}
                        <circle cx={p1.x} cy={p1.y} r={isSelected ? 6 : 5}
                            fill="white" stroke={isSelected ? '#a5b4fc' : '#6366f1'}
                            strokeWidth={isSelected ? 2 : 1.5} opacity={isSelected ? 1 : 0.9}
                            style={{ pointerEvents: 'none' }} />
                    </g>
                );
            })}
        </svg>
    );
};

export default ConnectionLayer;
