import React from 'react';
import type { WorkflowItem, ItemType, DroppedItem, Connection } from '../types';

// ── Workflow data ─────────────────────────────────────────────────────────────────────
const WORKFLOW_ITEMS: WorkflowItem[] = [
    // Container
    { type: 'box', label: 'Box', color: '#8b5cf6' },
    // Database Connectors
    { type: 'postgresql', label: 'PostgreSQL', color: '#336791' },
    { type: 'azuresql', label: 'Azure SQL', color: '#0078D4' },
    { type: 'mysql', label: 'MySQL', color: '#00758F' },
    { type: 'oracle', label: 'Oracle', color: '#F80000' },
    // Condition Nodes
    { type: 'if-else', label: 'If / Else', color: '#10b981' },
    { type: 'for-loop', label: 'For Loop', color: '#f59e0b' },
    { type: 'for-each-loop', label: 'For Each', color: '#8b5cf6' },
];

// ── Small shape preview SVGs ──────────────────────────────────────────────────
function ShapeIcon({ type, color }: { type: ItemType; color: string }) {
    // Box / Container Icon
    if (type === 'box') return (
        <svg width="22" height="20" viewBox="0 0 22 20">
            <rect x="1" y="1" width="20" height="18" rx="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" />
            <rect x="5" y="5" width="5" height="4" rx="1" fill={color} fillOpacity="0.5" />
            <rect x="12" y="5" width="5" height="4" rx="1" fill={color} fillOpacity="0.5" />
            <rect x="5" y="11" width="5" height="4" rx="1" fill={color} fillOpacity="0.5" />
        </svg>
    );
    // Database Icon
    if (['postgresql', 'azuresql', 'mysql', 'oracle'].includes(type)) {
        return (
            <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M9 2c4 0 7.5 1.5 7.5 3.5S13 9 9 9 1.5 7.5 1.5 5.5 5 2 9 2z" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.2" />
                <path d="M1.5 5.5v7c0 2 3.5 3.5 7.5 3.5s7.5-1.5 7.5-3.5v-7" fill="none" stroke={color} strokeWidth="1.2" />
                <path d="M1.5 9c0 2 3.5 3.5 7.5 3.5s7.5-1.5 7.5-3.5" fill="none" stroke={color} strokeWidth="1.2" />
            </svg>
        );
    }
    // If/Else Icon - Diamond
    if (type === 'if-else') {
        return (
            <svg width="20" height="20" viewBox="0 0 20 20">
                <polygon points="10,2 18,10 10,18 2,10" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
                <text x="10" y="13" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>?</text>
            </svg>
        );
    }
    // For Loop Icon - Rounded rectangle with loop arrow
    if (type === 'for-loop') {
        return (
            <svg width="20" height="18" viewBox="0 0 20 18">
                <rect x="1" y="1" width="18" height="16" rx="3" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
                <text x="10" y="12" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>⟲</text>
            </svg>
        );
    }
    // For Each Icon - Rounded rectangle with for-all symbol
    if (type === 'for-each-loop') {
        return (
            <svg width="20" height="18" viewBox="0 0 20 18">
                <rect x="1" y="1" width="18" height="16" rx="4" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
                <text x="10" y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>∀</text>
            </svg>
        );
    }
    return null;
}

interface SidebarProps {
    onDragStart: (item: WorkflowItem) => void;
    onItemClick: (item: WorkflowItem) => void;
    items: DroppedItem[];
    connections: Connection[];
}

// ── Sidebar Component ─────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({ onDragStart, onItemClick, items, connections }) => {
    const container = WORKFLOW_ITEMS.filter(i => i.type === 'box');
    const databases = WORKFLOW_ITEMS.filter(i => ['postgresql', 'azuresql', 'mysql', 'oracle'].includes(i.type));
    const conditions = WORKFLOW_ITEMS.filter(i => ['if-else', 'for-loop', 'for-each-loop'].includes(i.type));

    // Build id → label map for connections
    const labelMap = new Map(items.map(i => [i.id, i.dropCount > 1 ? `${i.label} ${i.dropCount}` : i.label]));

    const handleDragStart = (e: React.DragEvent, item: WorkflowItem) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(item);
    };

    const renderGroup = (title: string, groupItems: WorkflowItem[]) => (
        <div className="sidebar-group">
            <h2>{title}</h2>
            {groupItems.map((item, idx) => (
                <div
                    key={`${item.type}-${idx}`}
                    className="workflow-item"
                    draggable
                    onDragStart={e => handleDragStart(e, item)}
                    onClick={() => onItemClick(item)}
                >
                    <ShapeIcon type={item.type} color={item.color} />
                    {item.label}
                </div>
            ))}
        </div>
    );

    return (
        <aside className="sidebar">
            <h2 className="workflow-heading">
                📦 Workflow
            </h2>

            {renderGroup('Container', container)}
            {renderGroup('Databases', databases)}
            {renderGroup('Conditions', conditions)}

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
