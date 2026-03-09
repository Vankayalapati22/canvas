import React, { useRef } from 'react';
import type { DroppedItem, Connection } from '../types';
import { ordinal } from '../utils';

// ── Shape of the JSON file loaded from disk ────────────────────────────────────
interface CanvasSnapshot {
    version: number;
    savedAt?: string;
    items: DroppedItem[];
    connections: Connection[];
}

// ── Extended connection info passed down from App ─────────────────────────────
interface ConnInfo {
    connId: string;
    from: string;
    to: string;
    direction: 'one-way' | 'two-way';
}

interface ControlsProps {
    selectedItem: DroppedItem | null;
    selectedItemsCount: number;
    canGroup: boolean;
    canUndo: boolean;
    connectMode: boolean;
    hasConnections: boolean;
    canvasScale: number;
    selectedConnInfo: ConnInfo | null;
    theme: 'light' | 'dark';
    onUndo: () => void;
    onUndoAll: () => void;
    onAutoAlign: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onToggleConnectMode: () => void;
    onClearConnections: () => void;
    onClearLastConnection: () => void;
    showHistory: boolean;
    onToggleHistory: () => void;
    onSave: () => void;
    onLoadData: (data: { items: DroppedItem[]; connections: Connection[] }) => void;
    onReverseConnection: (connId: string) => void;
    onToggleConnectionDirection: (connId: string) => void;
    onCreateGroup: () => void;
    onToggleTheme: () => void;
}

// ── Controls Component ────────────────────────────────────────────────────────
const Controls: React.FC<ControlsProps> = ({
    selectedItem,
    selectedItemsCount,
    canGroup,
    canUndo,
    connectMode,
    hasConnections,
    canvasScale,
    selectedConnInfo,
    theme,
    onUndo,
    onUndoAll,
    onAutoAlign,
    onZoomIn,
    onZoomOut,
    onToggleConnectMode,
    onClearConnections,
    onClearLastConnection,
    showHistory,
    onToggleHistory,
    onSave,
    onLoadData,
    onReverseConnection,
    onToggleConnectionDirection,
    onCreateGroup,
    onToggleTheme,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const raw = evt.target?.result as string;
                const data = JSON.parse(raw) as CanvasSnapshot;
                if (!Array.isArray(data.items) || !Array.isArray(data.connections)) {
                    alert('Invalid canvas file — missing items or connections.');
                    return;
                }

                // ── v2 hierarchical format: flatten children back into the flat list ──
                // Each top-level item may have a `children` array (v2) or a `parentBoxId` (v1)
                type HierarchicalItem = DroppedItem & { children?: DroppedItem[] };
                const flatItems: DroppedItem[] = [];

                for (const topItem of data.items as HierarchicalItem[]) {
                    const { children, ...item } = topItem;
                    flatItems.push(item as DroppedItem);
                    if (Array.isArray(children)) {
                        // v2: restore parentBoxId on each child
                        for (const child of children) {
                            flatItems.push({ ...child, parentBoxId: item.id });
                        }
                    }
                }

                onLoadData({ items: flatItems, connections: data.connections });
            } catch {
                alert('Failed to parse the JSON file. Please choose a valid canvas save file.');
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };


    return (
        <div className="controls">
            {/* ── Undo / Undo All ─────────────────────── */}
            <button className="ctrl-btn danger" onClick={onUndo} disabled={!canUndo} title="Remove last added item">
                ↩ Undo
            </button>
            {canUndo && (
                <button className="ctrl-btn danger" onClick={onUndoAll} title="Remove ALL items and connections">
                    ↩↩ Undo All
                </button>
            )}

            {/* ── Layout ───────────────────────────────── */}
            <button className="ctrl-btn" onClick={onAutoAlign} title="Auto-align all items in a row">
                ⊞ Auto Align
            </button>

            {/* ── Group selected items ─────────────────── */}
            <button
                className="ctrl-btn group-btn"
                onClick={onCreateGroup}
                disabled={!canGroup}
                title={canGroup
                    ? `Group all items of the same type as selected item`
                    : "Select an item to group all items of that type"}
            >
                📦 Group
            </button>

            {/* ── History panel toggle ─────────────────── */}
            <button
                className={`ctrl-btn ${showHistory ? 'active' : ''}`}
                onClick={onToggleHistory}
                title="Show dropped items and connections history"
            >
                📋 History
            </button>

            <div className="controls-divider" />

            {/* ── Theme toggle ──────────────────────────── */}
            <button
                className="ctrl-btn theme-btn"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>

            <div className="controls-divider" />

            {/* ── Save & Load ──────────────────────────── */}
            <button className="ctrl-btn save-btn" onClick={onSave} title="Save canvas as JSON file">
                💾 Save
            </button>
            <button
                className="ctrl-btn load-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Load a previously saved canvas JSON file"
            >
                📂 Load
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="d-none"
                onChange={handleFileChange}
            />

            <div className="controls-divider" />

            {/* ── Canvas Zoom ───────────────────────────── */}
            <button className="ctrl-btn" onClick={onZoomOut} title="Zoom out canvas">
                − Zoom Out
            </button>
            <span className="ctrl-zoom-label">
                {Math.round(canvasScale * 100)}%
            </span>
            <button className="ctrl-btn" onClick={onZoomIn} title="Zoom in canvas">
                + Zoom In
            </button>

            <div className="controls-divider" />

            {/* ── Connect mode ──────────────────────────── */}
            <button
                className={`ctrl-btn ${connectMode ? 'active' : ''}`}
                onClick={onToggleConnectMode}
                title="Enable connect mode — click two items to join them"
            >
                🔗 {connectMode ? 'Connecting…' : 'Connect'}
            </button>

            {hasConnections && (
                <>
                    <button className="ctrl-btn danger" onClick={onClearLastConnection} title="Remove the last connection added">
                        Clear One
                    </button>
                    <button className="ctrl-btn danger" onClick={onClearConnections} title="Remove all connection lines">
                        Clear All
                    </button>
                </>
            )}

            {/* ── Selected connection actions ───────────── */}
            {selectedConnInfo && (
                <>
                    <div className="controls-divider" />
                    <button
                        className="ctrl-btn conn-reverse-btn"
                        onClick={() => onReverseConnection(selectedConnInfo.connId)}
                        title="Swap the A→B direction to B→A"
                    >
                        ⇋ Reverse
                    </button>
                    <button
                        className={`ctrl-btn conn-dir-btn ${selectedConnInfo.direction === 'two-way' ? 'active' : ''}`}
                        onClick={() => onToggleConnectionDirection(selectedConnInfo.connId)}
                        title={selectedConnInfo.direction === 'two-way'
                            ? 'Make one-way (A → B)'
                            : 'Make two-way (A ↔ B)'}
                    >
                        {selectedConnInfo.direction === 'two-way' ? '→ Make One-Way' : '⇄ Make Two-Way'}
                    </button>
                </>
            )}

            <div className="controls-divider" />

            {/* ── Info panel: selected item OR selected connection ──────────── */}
            <div className="selected-info">
                {selectedConnInfo ? (
                    <>
                        {/* Direction indicator: → for one-way, ↔ for two-way */}
                        <span className={`conn-dir-badge ${selectedConnInfo.direction}`}>
                            {selectedConnInfo.direction === 'one-way' ? '→' : '↔'}
                        </span>
                        &nbsp;
                        <span>{selectedConnInfo.from}</span>
                        <span className="ctrl-conn-sep">
                            {selectedConnInfo.direction === 'one-way' ? '→' : '↔'}
                        </span>
                        <span>{selectedConnInfo.to}</span>
                    </>
                ) : selectedItemsCount > 1 ? (
                    <>
                        Selected: <span className="ctrl-sel-count">{selectedItemsCount} items</span>
                        &nbsp;
                        <span className="ctrl-meta">
                            (Ctrl+Click to multi-select)
                        </span>
                    </>
                ) : selectedItem ? (
                    <>
                        Selected: <span>{selectedItem.label}</span>
                        &nbsp;
                        <span className="ctrl-meta">
                            ({ordinal(selectedItem.dropOrder)} dropped)
                        </span>
                    </>
                ) : (
                    <span className="ctrl-no-sel">No item selected</span>
                )}
            </div>
        </div>
    );
};

export default Controls;
