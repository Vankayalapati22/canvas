import React from 'react';
import type { PaletteItem, ItemType, DroppedItem, Connection } from '../types';

// ── Palette data ─────────────────────────────────────────────────────────────
const PALETTE_ITEMS: PaletteItem[] = [
    // Shapes
    { type: 'rect', label: 'Rectangle', color: '#6366f1' },
    { type: 'circle', label: 'Circle', color: '#22d3ee' },
    { type: 'triangle', label: 'Triangle', color: '#f59e0b' },
    // Text items
    { type: 'text', label: 'Hello', color: '#34d399' },
    { type: 'text', label: 'Label', color: '#f472b6' },
    { type: 'text', label: 'Note', color: '#a78bfa' },
    // Image / emoji items
    { type: 'image', label: 'Picture', color: '#fb923c', emoji: '🖼️' },
    { type: 'image', label: 'Star', color: '#fbbf24', emoji: '⭐' },
    { type: 'image', label: 'Diamond', color: '#38bdf8', emoji: '🔷' },
    { type: 'image', label: 'Rocket', color: '#f87171', emoji: '🚀' },
    { type: 'image', label: 'Fire', color: '#fb923c', emoji: '🔥' },
];

// ── Small shape preview SVGs ──────────────────────────────────────────────────
function ShapeIcon({ type, color }: { type: ItemType; color: string }) {
    if (type === 'rect') return (
        <svg width="22" height="16" viewBox="0 0 22 16">
            <rect x="1" y="1" width="20" height="14" rx="3" fill={color} fillOpacity="0.85" />
        </svg>
    );
    if (type === 'circle') return (
        <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="9" r="8" fill={color} fillOpacity="0.85" />
        </svg>
    );
    if (type === 'triangle') return (
        <svg width="20" height="18" viewBox="0 0 20 18">
            <polygon points="10,1 19,17 1,17" fill={color} fillOpacity="0.85" />
        </svg>
    );
    if (type === 'text') return (
        <svg width="18" height="18" viewBox="0 0 18 18">
            <rect x="1" y="1" width="16" height="16" rx="3" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.2" />
            <text x="9" y="13" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>T</text>
        </svg>
    );
    return null;
}

interface SidebarProps {
    onDragStart: (item: PaletteItem) => void;
    items: DroppedItem[];
    connections: Connection[];
}

// ── Sidebar Component ─────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({ onDragStart, items, connections }) => {
    const shapes = PALETTE_ITEMS.filter(i => ['rect', 'circle', 'triangle'].includes(i.type));
    const texts = PALETTE_ITEMS.filter(i => i.type === 'text');
    const images = PALETTE_ITEMS.filter(i => i.type === 'image');

    // Build id → label map
    const labelMap = new Map(items.map(i => [i.id, i.label]));

    const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(item);
    };

    const renderGroup = (title: string, groupItems: PaletteItem[]) => (
        <div className="sidebar-group">
            <h2>{title}</h2>
            {groupItems.map((item, idx) => (
                <div
                    key={`${item.type}-${idx}`}
                    className="palette-item"
                    draggable
                    onDragStart={e => handleDragStart(e, item)}
                >
                    {item.type === 'image' ? (
                        <span className="palette-emoji">{item.emoji}</span>
                    ) : (
                        <ShapeIcon type={item.type} color={item.color} />
                    )}
                    {item.label}
                </div>
            ))}
        </div>
    );

    return (
        <aside className="sidebar">
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
                🎨 Palette
            </h2>

            {renderGroup('Shapes', shapes)}
            {renderGroup('Text', texts)}
            {renderGroup('Images', images)}

            {/* ── Live Connections Feed ─────────────────────────────────────── */}
            <div className="sidebar-connections">
                <h2 className="sidebar-connections-heading">
                    🔗 Connections
                    {connections.length > 0 && (
                        <span className="sidebar-conn-count">{connections.length}</span>
                    )}
                </h2>

                {connections.length === 0 ? (
                    <p className="sidebar-conn-empty">No connections yet</p>
                ) : (
                    <ul className="sidebar-conn-list">
                        {connections.map((conn, idx) => {
                            const from = labelMap.get(conn.fromId) ?? '?';
                            const to = labelMap.get(conn.toId) ?? '?';
                            return (
                                <li key={conn.id} className="sidebar-conn-item">
                                    {/* Index */}
                                    <span className="sidebar-conn-num">{idx + 1}</span>
                                    <div className="sidebar-conn-body">
                                        {/* FROM — white dot marks start */}
                                        <div className="sidebar-conn-from">
                                            <span className="sidebar-conn-dot" />
                                            {from}
                                        </div>
                                        {/* Straight arrow line */}
                                        <div className="sidebar-conn-arrow-line">
                                            <div className="sidebar-conn-shaft" />
                                            <span className="sidebar-conn-tip">▶</span>
                                        </div>
                                        {/* TO */}
                                        <div className="sidebar-conn-to">{to}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
