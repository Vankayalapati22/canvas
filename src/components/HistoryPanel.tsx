import React, { useState } from 'react';
import type { DroppedItem, Connection } from '../types';
import { ordinal } from '../utils';

// Type icons for display
const TYPE_ICON: Record<string, string> = {
    box: '📦',
    postgresql: '🟦',
    azuresql: '☁️',
    mysql: '🟦',
    oracle: '🔴',
    'if-else': '❓',
    'for-loop': '⟲',
    'for-each-loop': '∀',
};

interface HistoryPanelProps {
    items: DroppedItem[];
    connections: Connection[];
    onClose: () => void;
    onUpdateItemLabel: (itemId: string, newLabel: string) => void;
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────
const HistoryPanel: React.FC<HistoryPanelProps> = ({ items, connections, onClose, onUpdateItemLabel }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // Helper to get display name (customLabel or auto-generated)
    const getDisplayName = (item: DroppedItem) => 
        item.customLabel ?? (item.dropCount > 1 ? `${item.label} ${item.dropCount}` : item.label);

    // Build id → label map for showing connection labels
    const labelMap = new Map(items.map(i => [i.id, getDisplayName(i)]));

    const handleStartEdit = (item: DroppedItem) => {
        setEditingId(item.id);
        setEditValue(getDisplayName(item));
    };

    const handleSaveEdit = (itemId: string) => {
        if (editValue.trim()) {
            onUpdateItemLabel(itemId, editValue.trim());
        }
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent, itemId: string) => {
        if (e.key === 'Enter') {
            handleSaveEdit(itemId);
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

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
                                
                                {editingId === item.id ? (
                                    <div style={{ display: 'flex', gap: '4px', flex: 1, alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, item.id)}
                                            autoFocus
                                            style={{
                                                flex: 1,
                                                padding: '4px 8px',
                                                fontSize: '12px',
                                                border: '1px solid #4f46e5',
                                                borderRadius: '4px',
                                                background: '#1a1d27',
                                                color: '#e2e8f0',
                                                outline: 'none',
                                            }}
                                        />
                                        <button
                                            onClick={() => handleSaveEdit(item.id)}
                                            title="Save changes"
                                            style={{
                                                padding: '4px 8px',
                                                background: '#10b981',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✓
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            title="Cancel (restore default)"
                                            style={{
                                                padding: '4px 8px',
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✗
                                        </button>
                                    </div>
                                ) : (
                                    <span 
                                        className="history-item-label" 
                                        onClick={() => handleStartEdit(item)}
                                        style={{ cursor: 'pointer' }}
                                        title="Click to edit name"
                                    >
                                        {getDisplayName(item)}
                                        <span style={{ marginLeft: '6px', opacity: 0.5, fontSize: '10px' }}>✏️</span>
                                    </span>
                                )}
                                
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
