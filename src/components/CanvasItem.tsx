import React from 'react';
import type { DroppedItem } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_SIZE = 80; // pixels — base dimension for shapes

// ── Shape renderers ───────────────────────────────────────────────────────────
function ShapeRect({ size, color }: { size: number; color: string }) {
    const s = BASE_SIZE * size;
    return (
        <svg width={s} height={s * 0.65} style={{ display: 'block' }}>
            <defs>
                <linearGradient id={`rg-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.55" />
                </linearGradient>
            </defs>
            <rect
                x="2" y="2"
                width={s - 4} height={s * 0.65 - 4}
                rx="10"
                fill={`url(#rg-${color})`}
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.6"
            />
        </svg>
    );
}

function ShapeCircle({ size, color }: { size: number; color: string }) {
    const r = (BASE_SIZE * size) / 2;
    return (
        <svg width={r * 2} height={r * 2} style={{ display: 'block' }}>
            <defs>
                <radialGradient id={`cg-${color}`} cx="40%" cy="35%">
                    <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.9" />
                </radialGradient>
            </defs>
            <circle cx={r} cy={r} r={r - 2} fill={`url(#cg-${color})`} stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
        </svg>
    );
}

function ShapeTriangle({ size, color }: { size: number; color: string }) {
    const s = BASE_SIZE * size;
    const h = (s * Math.sqrt(3)) / 2;
    const pts = `${s / 2},2 ${s - 2},${h - 2} 2,${h - 2}`;
    return (
        <svg width={s} height={h} style={{ display: 'block' }}>
            <defs>
                <linearGradient id={`tg-${color}`} x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.5" />
                </linearGradient>
            </defs>
            <polygon points={pts} fill={`url(#tg-${color})`} stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
        </svg>
    );
}

function TextBox({ label, color, size }: { label: string; color: string; size: number }) {
    return (
        <div
            className="item-text-box"
            style={{
                borderColor: color,
                color: color,
                fontSize: 14 * size,
                padding: `${10 * size}px ${16 * size}px`,
                boxShadow: `0 0 12px ${color}33`,
            }}
        >
            {label}
        </div>
    );
}

function ImageItem({ emoji, size }: { emoji?: string; size: number }) {
    return (
        <span className="item-emoji" style={{ fontSize: 36 * size }}>
            {emoji ?? '🖼️'}
        </span>
    );
}

// ── CanvasItem ────────────────────────────────────────────────────────────────
interface CanvasItemProps {
    item: DroppedItem;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onMove: (id: string, x: number, y: number) => void;
    onDelete: (id: string) => void;
}

const CanvasItem: React.FC<CanvasItemProps> = ({ item, isSelected, onSelect, onDelete }) => {
    // Track where the pointer first grabbed the element (to compute delta on drop)
    const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const effectiveScale = item.size * item.zoom;

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation(); // Prevent canvas drop from also firing
        // Record offset within the item where user clicked
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        // Use a custom drag type to distinguish "move" from "new item" drops
        e.dataTransfer.setData('text/move-id', item.id);
        e.dataTransfer.setData('text/offset-x', String(dragOffset.current.x));
        e.dataTransfer.setData('text/offset-y', String(dragOffset.current.y));
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(item.id);
    };

    return (
        <div
            className={`canvas-item ${isSelected ? 'selected' : ''}`}
            style={{ left: item.x, top: item.y }}
            draggable
            onDragStart={handleDragStart}
            onClick={handleClick}
        >
            {/* Drop order badge — always visible in top-left corner */}
            <span className="item-order-badge" title={`Dropped ${item.dropOrder}${['th', 'st', 'nd', 'rd'][(item.dropOrder % 10 < 4 && (item.dropOrder % 100 - item.dropOrder % 10) !== 10) ? item.dropOrder % 10 : 0]} `}>
                {item.dropOrder}
            </span>

            <div className="item-inner" style={{ transform: `scale(${effectiveScale})`, transformOrigin: 'center top' }}>
                {item.type === 'rect' && <ShapeRect size={1} color={item.color} />}
                {item.type === 'circle' && <ShapeCircle size={1} color={item.color} />}
                {item.type === 'triangle' && <ShapeTriangle size={1} color={item.color} />}
                {item.type === 'text' && <TextBox label={item.label} color={item.color} size={1} />}
                {item.type === 'image' && <ImageItem emoji={item.emoji} size={1} />}
            </div>

            {item.type !== 'text' && (
                <span className="item-label" style={{ marginTop: 4 * effectiveScale }}>
                    {item.label}
                </span>
            )}

            {/* Delete button (only visible when selected) */}
            {isSelected && (
                <button
                    className="item-delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    title="Delete this item"
                >
                    ✖
                </button>
            )}
        </div>
    );
};

export default CanvasItem;
