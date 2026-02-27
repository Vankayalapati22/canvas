import React from 'react';
import type { DroppedItem, Connection } from '../types';
import { CARD_W, CARD_H } from '../cardDimensions';

// ── Constants ─────────────────────────────────────────────────────────────────
const OFFSET = 12; // perpendicular lane offset (px) for two-way connections

// ── Helper: perpendicular offset vector ───────────────────────────────────────
function perp(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    dist: number
): { ox: number; oy: number } {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    return { ox: (-dy / len) * dist, oy: (dx / len) * dist };
}

// ── Four precise edge-point helpers ──────────────────────────────────────────
// All coordinates are in canvas-space (item.x / item.y is the card's top-left).

/** Left-center edge of the card */
function getLeftEdge(item: DroppedItem): { x: number; y: number } {
    return { x: item.x, y: item.y + CARD_H / 2 };
}

/** Right-center edge of the card */
function getRightEdge(item: DroppedItem): { x: number; y: number } {
    return { x: item.x + CARD_W, y: item.y + CARD_H / 2 };
}

/** Top-center edge of the card */
function getTopEdge(item: DroppedItem): { x: number; y: number } {
    return { x: item.x + CARD_W / 2, y: item.y };
}

/** Bottom-center edge of the card */
function getBottomEdge(item: DroppedItem): { x: number; y: number } {
    return { x: item.x + CARD_W / 2, y: item.y + CARD_H };
}

/** Computes the shortest straight-line connection between two cards using their 4 edges */
function getShortestConnection(from: DroppedItem, to: DroppedItem): { p1: { x: number; y: number }, p2: { x: number; y: number } } {
    const edgesFrom = [getTopEdge(from), getRightEdge(from), getBottomEdge(from), getLeftEdge(from)];
    const edgesTo = [getTopEdge(to), getRightEdge(to), getBottomEdge(to), getLeftEdge(to)];

    let shortestDist = Infinity;
    let bestP1 = edgesFrom[0];
    let bestP2 = edgesTo[0];

    for (const p1 of edgesFrom) {
        for (const p2 of edgesTo) {
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (dist < shortestDist) {
                shortestDist = dist;
                bestP1 = p1;
                bestP2 = p2;
            }
        }
    }
    return { p1: bestP1, p2: bestP2 };
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
                <marker id="arrow-ab" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.85" />
                </marker>
                <marker id="arrow-ab-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#a5b4fc" strokeWidth="2" />
                </marker>

                {/* ── B→A (rose) arrowheads ───────────────────────────────── */}
                <marker id="arrow-ba" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.85" />
                </marker>
                <marker id="arrow-ba-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#fb7185" strokeWidth="2" />
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

                // Find the shortest connection between any of the 4 edges
                const { p1, p2 } = getShortestConnection(from, to);

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
