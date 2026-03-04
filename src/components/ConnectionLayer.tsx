import React from 'react';
import type { DroppedItem, Connection } from '../types';
import { CARD_W, CARD_H } from '../cardDimensions';

// ── Constants ─────────────────────────────────────────────────────────────────
const OFFSET = 12;   // perpendicular lane offset (px) for two-way connections

// ── Box card grid constants (must match CanvasItem.tsx / App.css) ─────────────
const MINI_W = 76;   // px — .box-mini-card width
const MINI_H = 70;   // px — .box-mini-card height
const MINI_GAP = 8;    // px — grid gap
const BOX_PAD = 10;   // px — grid padding
const BOX_HEADER = 36;   // px — approximate header height
const BOX_MIN_W = 200;  // px — min-width from CSS
const BOX_MAX_W = 340;  // px — max-width from CSS

/** Compute rendered w/h of a box card from its child count */
function getBoxDimensions(childCount: number): { w: number; h: number } {
    const slots = Math.max(childCount + 1, 1); // +1 for add-more slot
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(slots))));
    const rows = Math.ceil(slots / cols);
    const contentW = cols * MINI_W + (cols - 1) * MINI_GAP + 2 * BOX_PAD;
    const w = Math.max(BOX_MIN_W, Math.min(BOX_MAX_W, contentW));
    const h = BOX_HEADER + rows * MINI_H + (rows - 1) * MINI_GAP + 2 * BOX_PAD;
    return { w, h };
}

type Rect = { x: number; y: number; w: number; h: number };

/** Bounding box of any item in canvas-space, accounting for box card size */
function getItemRect(item: DroppedItem, childCount: number): Rect {
    if (item.type === 'box') {
        const { w, h } = getBoxDimensions(childCount);
        return { x: item.x, y: item.y, w, h };
    }
    return { x: item.x, y: item.y, w: CARD_W, h: CARD_H };
}

// ── Perpendicular offset vector ───────────────────────────────────────────────
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

// ── Edge-point helpers ────────────────────────────────────────────────────────
const leftEdge = (r: Rect) => ({ x: r.x, y: r.y + r.h / 2 });
const rightEdge = (r: Rect) => ({ x: r.x + r.w, y: r.y + r.h / 2 });
const topEdge = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y });
const bottomEdge = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h });

/** Pick the pair of edges with the shortest straight-line distance */
function getShortestConnection(
    rA: Rect,
    rB: Rect
): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
    const eA = [topEdge(rA), rightEdge(rA), bottomEdge(rA), leftEdge(rA)];
    const eB = [topEdge(rB), rightEdge(rB), bottomEdge(rB), leftEdge(rB)];

    let best = Infinity;
    let p1 = eA[0], p2 = eB[0];
    for (const a of eA) for (const b of eB) {
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < best) { best = d; p1 = a; p2 = b; }
    }
    return { p1, p2 };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ConnectionLayerProps {
    items: DroppedItem[];
    allItems: DroppedItem[];   // full item list (incl. children) for child counting
    connections: Connection[];
    selectedConnectionId: string | null;
    onSelectConnection: (id: string | null) => void;
}

// ── ConnectionLayer ───────────────────────────────────────────────────────────
const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
    items,
    allItems,
    connections,
    selectedConnectionId,
    onSelectConnection,
}) => {
    if (connections.length === 0) return null;

    const itemMap = new Map(items.map(i => [i.id, i]));

    // Count children per box from the full item list
    const childCount = new Map<string, number>();
    for (const i of allItems) {
        if (i.parentBoxId) {
            childCount.set(i.parentBoxId, (childCount.get(i.parentBoxId) ?? 0) + 1);
        }
    }

    // Helper: Get connection colors based on dataTransfer status
    const getConnectionColors = (conn: Connection, isSelected: boolean) => {
        if (conn.dataTransfer === true) {
            // Green for data transfer = true
            return {
                stroke: isSelected ? '#34d399' : '#10b981',
                marker: isSelected ? 'url(#arrow-green-sel)' : 'url(#arrow-green)',
            };
        } else if (conn.dataTransfer === false) {
            // Red for data transfer = false
            return {
                stroke: isSelected ? '#f87171' : '#ef4444',
                marker: isSelected ? 'url(#arrow-red-sel)' : 'url(#arrow-red)',
            };
        } else {
            // Blue for undefined/default
            return {
                stroke: isSelected ? '#a5b4fc' : '#6366f1',
                marker: isSelected ? 'url(#arrow-ab-sel)' : 'url(#arrow-ab)',
            };
        }
    };

    return (
        <svg
            className="svg-conn-layer connection-layer"
        >
            <defs>
                {/* Blue arrows (default) */}
                <marker id="arrow-ab" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.85" />
                </marker>
                <marker id="arrow-ab-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#a5b4fc" strokeWidth="2" />
                </marker>
                {/* Pink/Red arrows (two-way secondary) */}
                <marker id="arrow-ba" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.85" />
                </marker>
                <marker id="arrow-ba-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#fb7185" strokeWidth="2" />
                </marker>
                {/* Green arrows (data transfer: yes/true) */}
                <marker id="arrow-green" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.85" />
                </marker>
                <marker id="arrow-green-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#34d399" strokeWidth="2" />
                </marker>
                {/* Red arrows (data transfer: no/false) */}
                <marker id="arrow-red" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.85" />
                </marker>
                <marker id="arrow-red-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#f87171" strokeWidth="2" />
                </marker>
                <filter id="conn-glow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {connections.map(conn => {
                const from = itemMap.get(conn.fromId);
                const to = itemMap.get(conn.toId);
                if (!from || !to) return null;

                const rA = getItemRect(from, childCount.get(from.id) ?? 0);
                const rB = getItemRect(to, childCount.get(to.id) ?? 0);
                const { p1, p2 } = getShortestConnection(rA, rB);

                const isTwoWay = (conn.direction ?? 'one-way') === 'two-way';
                const isSelected = conn.id === selectedConnectionId;
                const colors = getConnectionColors(conn, isSelected);
                const onClickLine = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSelectConnection(isSelected ? null : conn.id);
                };

                if (isTwoWay) {
                    const { ox, oy } = perp(p1, p2, OFFSET);
                    const a1 = { x: p1.x + ox, y: p1.y + oy };
                    const a2 = { x: p2.x + ox, y: p2.y + oy };
                    const b1 = { x: p2.x - ox, y: p2.y - oy };
                    const b2 = { x: p1.x - ox, y: p1.y - oy };
                    return (
                        <g key={conn.id}>
                            <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                                fill="none" stroke="transparent" strokeWidth={24}
                                className="svg-hit-area"
                                onClick={onClickLine} />
                            <path d={`M ${a1.x} ${a1.y} L ${a2.x} ${a2.y}`}
                                fill="none" stroke={colors.stroke}
                                strokeWidth={isSelected ? 2.5 : 2} strokeLinecap="round"
                                opacity={isSelected ? 1 : 0.85}
                                filter={isSelected ? 'url(#conn-glow)' : undefined}
                                markerEnd={colors.marker}
                                className="svg-visual" />
                            <path d={`M ${b1.x} ${b1.y} L ${b2.x} ${b2.y}`}
                                fill="none" stroke={isSelected ? '#fb7185' : '#f43f5e'}
                                strokeWidth={isSelected ? 2.5 : 2} strokeLinecap="round"
                                opacity={isSelected ? 1 : 0.85}
                                filter={isSelected ? 'url(#conn-glow)' : undefined}
                                markerEnd={isSelected ? 'url(#arrow-ba-sel)' : 'url(#arrow-ba)'}
                                className="svg-visual" />
                            <circle cx={p1.x} cy={p1.y} r={isSelected ? 6 : 5}
                                fill="white" stroke={colors.stroke}
                                strokeWidth={isSelected ? 2 : 1.5} className="svg-visual" />
                            <circle cx={p2.x} cy={p2.y} r={isSelected ? 6 : 5}
                                fill="white" stroke={isSelected ? '#fb7185' : '#f43f5e'}
                                strokeWidth={isSelected ? 2 : 1.5} className="svg-visual" />
                        </g>
                    );
                }

                return (
                    <g key={conn.id}>
                        <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                            fill="none" stroke="transparent" strokeWidth={20}
                            className="svg-hit-area"
                            onClick={onClickLine} />
                        <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                            fill="none" stroke={colors.stroke}
                            strokeWidth={isSelected ? 2.5 : 2} strokeLinecap="round"
                            opacity={isSelected ? 1 : 0.85}
                            filter={isSelected ? 'url(#conn-glow)' : undefined}
                            markerEnd={colors.marker}
                            className="svg-visual" />
                        <circle cx={p1.x} cy={p1.y} r={isSelected ? 6 : 5}
                            fill="white" stroke={colors.stroke}
                            strokeWidth={isSelected ? 2 : 1.5} className="svg-visual" />
                    </g>
                );
            })}
        </svg>
    );
};

export default ConnectionLayer;
