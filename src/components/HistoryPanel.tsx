import React from 'react';
import type { DroppedItem, Connection } from '../types';
import { ordinal } from '../utils';

// Type icons for display
const TYPE_ICON: Record<string, string> = {
    rect: '▭',
    circle: '◯',
    triangle: '△',
    text: 'T',
    image: '🖼',
    postgresql: '🟦',
    azuresql: '☁️',
    mysql: '🟦',
    oracle: '🔴',
};

interface HistoryPanelProps {
    items: DroppedItem[];
    connections: Connection[];
    onClose: () => void;
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────
const HistoryPanel: React.FC<HistoryPanelProps> = ({ items, connections, onClose }) => {
    // Build id → label map for showing connection labels with dropCount
    const labelMap = new Map(items.map(i => [i.id, i.dropCount > 1 ? `${i.label} ${i.dropCount}` : i.label]));

    return (
        <div className="history-panel">
            {/* Header */}
            <div className="history-panel-header">
                <span className="history-panel-title">📋 History</span>
                <button className="history-close-btn" onClick={onClose} title="Close">✕</button>
            </div>

            {/* ── Section 1: Dropped Items ─────────────────────────────────── */}
            <div className="history-section">
                <div className="history-section-heading">
                    Dropped Items
                    <span className="history-count">{items.length}</span>
                </div>

                {items.length === 0 ? (
                    <p className="history-empty">No items dropped yet</p>
                ) : (
                    <ul className="history-list">
                        {/* Show in drop order (1st, 2nd, 3rd…) */}
                        {[...items].sort((a, b) => a.dropOrder - b.dropOrder).map(item => (
                            <li key={item.id} className="history-row">
                                <span className="history-badge">{item.dropOrder}</span>
                                <span className="history-type-icon">{TYPE_ICON[item.type] ?? '?'}</span>
                                <span className="history-item-label">
                                    {item.dropCount > 1 ? `${item.label} ${item.dropCount}` : item.label}
                                </span>
                                <span className="history-meta">{ordinal(item.dropOrder)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="history-divider" />

            {/* ── Section 2: Connections ───────────────────────────────────── */}
            <div className="history-section">
                <div className="history-section-heading">
                    Connections
                    <span className="history-count">{connections.length}</span>
                </div>

                {connections.length === 0 ? (
                    <p className="history-empty">No connections made yet</p>
                ) : (
                    <ul className="history-list">
                        {connections.map((conn, idx) => {
                            const fromLabel = labelMap.get(conn.fromId) ?? '?';
                            const toLabel = labelMap.get(conn.toId) ?? '?';
                            return (
                                <li key={conn.id} className={`history-conn-card ${conn.direction === 'two-way' ? 'two-way' : ''}`}>
                                    <span className="history-badge">#{idx + 1}</span>
                                    <div className="history-conn-pair">
                                        {/* FROM box */}
                                        <div className="history-conn-node history-conn-node--from">
                                            <span className="history-conn-node-dot" />
                                            {fromLabel}
                                        </div>
                                        {/* Arrow (One-way or Two-way) */}
                                        <div className="history-conn-line">
                                            {conn.direction === 'two-way' && (
                                                <div className="history-conn-tip history-conn-tip--left">◀</div>
                                            )}
                                            <div className="history-conn-shaft" />
                                            <div className="history-conn-tip">▶</div>
                                        </div>
                                        {/* TO box */}
                                        <div className="history-conn-node history-conn-node--to">
                                            {toLabel}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;
