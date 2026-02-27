import React, { useState, useRef } from 'react';
import type { DroppedItem } from '../types';

const BASE_SIZE = 64;
const DB_TYPES = ['postgresql', 'azuresql', 'mysql', 'oracle'];

interface CanvasItemProps {
  item: DroppedItem;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDetail: (id: string) => void;
}

// ── Distinct Database SVG Icons ────────────────────────────────────────────────
function DbIcon({ type }: { type: string }) {
  const s = BASE_SIZE;
  if (type === 'postgresql') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#336791" />
        <rect x="10" y="20" width="60" height="36" fill="#255a7a" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#336791" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#pgTop)" />
        <path d="M34 26 Q28 38 32 50" stroke="#7ec8e3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M46 26 Q52 38 48 50" stroke="#7ec8e3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="40" y="44" textAnchor="middle" fontWeight="900" fontSize="14" fill="#fff" fontFamily="monospace">PG</text>
        <defs>
          <radialGradient id="pgTop" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#5ba3c9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#336791" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }
  if (type === 'mysql') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#00758F" />
        <rect x="10" y="20" width="60" height="36" fill="#005c6e" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#00758F" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#myTop)" />
        <path d="M52 30 Q62 24 58 36 Q55 42 48 40" stroke="#f7a800" strokeWidth="2" fill="#f7a800" fillOpacity="0.4" />
        <text x="38" y="48" textAnchor="middle" fontWeight="900" fontSize="13" fill="#fff" fontFamily="monospace">MY</text>
        <defs>
          <radialGradient id="myTop" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00758F" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }
  if (type === 'azuresql') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#0078D4" />
        <rect x="10" y="20" width="60" height="36" fill="#005a9e" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#0078D4" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#azTop)" />
        <path d="M32 48 L40 30 L48 48" stroke="#50e6ff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 43 L45 43" stroke="#50e6ff" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <radialGradient id="azTop" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#50e6ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0078D4" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }
  if (type === 'oracle') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#C0392B" />
        <rect x="10" y="20" width="60" height="36" fill="#96281b" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#C0392B" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#orTop)" />
        <circle cx="40" cy="40" r="11" stroke="#ff6b6b" strokeWidth="3" fill="none" />
        <circle cx="40" cy="40" r="5" fill="#ff6b6b" fillOpacity="0.5" />
        <defs>
          <radialGradient id="orTop" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C0392B" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }
  return null;
}

// ── Shape / image icon ────────────────────────────────────────────────────────
function ItemIcon({ item }: { item: DroppedItem }) {
  if (item.type === 'rect')
    return <svg width={BASE_SIZE} height={BASE_SIZE * 0.65}><rect x="2" y="2" width={BASE_SIZE - 4} height={BASE_SIZE * 0.65 - 4} rx="8" fill={item.color} /></svg>;
  if (item.type === 'circle')
    return <svg width={BASE_SIZE} height={BASE_SIZE}><circle cx={BASE_SIZE / 2} cy={BASE_SIZE / 2} r={BASE_SIZE / 2 - 2} fill={item.color} /></svg>;
  if (item.type === 'triangle')
    return <svg width={BASE_SIZE} height={BASE_SIZE * 0.86}><polygon points={`${BASE_SIZE / 2},2 ${BASE_SIZE - 2},${BASE_SIZE * 0.86 - 2} 2,${BASE_SIZE * 0.86 - 2}`} fill={item.color} /></svg>;
  if (item.type === 'text')
    return <span style={{ color: item.color, fontWeight: 800, fontSize: 22 }}>{item.label}</span>;
  if (item.type === 'image')
    return <span style={{ fontSize: 40, lineHeight: 1 }}>{item.emoji ?? '🖼️'}</span>;
  if (DB_TYPES.includes(item.type))
    return <DbIcon type={item.type} />;
  return null;
}

// ── CanvasItem Card ────────────────────────────────────────────────────────────
const CanvasItem: React.FC<CanvasItemProps> = ({ item, onSelect, onRemove, onDetail }) => {
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.dataTransfer.setData('text/move-id', item.id);
    e.dataTransfer.setData('text/offset-x', String(dragOffset.current.x));
    e.dataTransfer.setData('text/offset-y', String(dragOffset.current.y));
  };

  // Displayed label: "Star 2" if dropCount > 1, else just "Star"
  const displayName = item.dropCount > 1
    ? `${item.label} ${item.dropCount}`
    : item.label;

  return (
    <div
      className="canvas-item"
      style={{ left: item.x, top: item.y }}
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => { e.stopPropagation(); onSelect(item.id); onDetail(item.id); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ══ OUTER CARD ════════════════════════════════════════════════════════ */}
      <div className="item-card">

        {/* ── TOP BOX: just the item name (no order number here) ─────────── */}
        <div className="item-card-header">
          {/* ✔ tick at top-left of header — always visible */}
          <span className="item-sym-tick" title="Dropped successfully">✔</span>
          <span className="item-card-name">{item.label}</span>
        </div>

        {/* ── BOTTOM BOX: icon + name+count inside, ➜ arrow outside right ── */}
        <div className={`item-card-body ${hovered ? 'hovered' : ''}`}>

          {/* Icon centered */}
          <div className="item-card-icon" style={{ pointerEvents: 'none' }}>
            <ItemIcon item={item} />
          </div>

          {/* Name + count inside the body — e.g. "Star 2" */}
          <div className="item-card-body-label">{displayName}</div>

          {/* ✖ remove — top-right corner of the body, hover-only */}
          {hovered && (
            <button
              className="item-sym-remove"
              title="Remove"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            >
              ✖
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default CanvasItem;
