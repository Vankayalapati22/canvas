import { useState, useCallback, useEffect } from 'react';
import './App.css';
import type { DroppedItem, Connection, PaletteItem } from './types';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Controls from './components/Controls';
import HistoryPanel from './components/HistoryPanel';

// ── Zoom step constants ───────────────────────────────────────────────────────
const ZOOM_STEP = 0.1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4.0;

// ── Auto-align layout constants ───────────────────────────────────────────────
const ALIGN_START_X = 40;
const ALIGN_Y = 80;
const ALIGN_GAP = 150;

function App() {
    // ── Core state ──────────────────────────────────────────────────────────────
    // Stack of dropped items — LIFO ordering (push/pop for undo)
    const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);

    // Currently selected item id
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // All connections between items
    const [connections, setConnections] = useState<Connection[]>([]);

    // Connect mode — when true, clicking two items creates a connection
    const [connectMode, setConnectMode] = useState(false);

    // The first item picked during connect mode (waiting for second click)
    const [connectFirst, setConnectFirst] = useState<string | null>(null);

    // Canvas-level zoom scale (applies to the entire canvas view)
    const [canvasScale, setCanvasScale] = useState(1);

    // The currently selected connection line
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

    // Whether the History panel is open
    const [showHistory, setShowHistory] = useState(false);

    // Track the last dragged palette item for dim feedback (optional)
    const [, setDraggingPalette] = useState<PaletteItem | null>(null);

    // ── Derived ─────────────────────────────────────────────────────────────────
    const selectedItem = droppedItems.find(i => i.id === selectedId) ?? null;

    // Derive connection info for display (source label → target label + direction)
    const selectedConn = connections.find(c => c.id === selectedConnectionId) ?? null;
    const selectedConnInfo = selectedConn
        ? {
            connId: selectedConn.id,
            from: droppedItems.find(i => i.id === selectedConn.fromId)?.label ?? '?',
            to: droppedItems.find(i => i.id === selectedConn.toId)?.label ?? '?',
            direction: selectedConn.direction,
        }
        : null;

    // ── Keyboard shortcut: Ctrl+Z → Undo ────────────────────────────────────────
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [droppedItems]);

    // ── Drop new item from sidebar ────────────────────────────────────────────
    const handleDrop = useCallback((paletteItem: PaletteItem, x: number, y: number) => {
        setDroppedItems(prev => {
            const newItem: DroppedItem = {
                id: crypto.randomUUID(),
                type: paletteItem.type,
                label: paletteItem.label,
                color: paletteItem.color,
                emoji: paletteItem.emoji,
                x, y,
                size: 1,
                zoom: 1,
                dropOrder: prev.length + 1, // 1-based sequence number
            };
            setSelectedId(newItem.id);
            setSelectedConnectionId(null); // deselect connection on new drop
            return [...prev, newItem];
        });
    }, []);

    // ── Select an item (or handle connect-mode second click) ──────────────────
    const handleSelect = useCallback((id: string) => {
        if (connectMode) {
            if (!connectFirst) {
                // Pick first item
                setConnectFirst(id);
            } else if (connectFirst !== id) {
                // Pick second item — create connection if not already present
                const existingConn = connections.find(
                    c => (c.fromId === connectFirst && c.toId === id) ||
                        (c.fromId === id && c.toId === connectFirst)
                );

                if (!existingConn) {
                    const newConn: Connection = {
                        id: crypto.randomUUID(),
                        fromId: connectFirst,
                        toId: id,
                        direction: 'one-way',
                    };
                    setConnections(prev => [...prev, newConn]);
                    setSelectedConnectionId(newConn.id);
                    setSelectedId(null);
                } else {
                    // Already connected — select it so user can reverse/toggle
                    setSelectedConnectionId(existingConn.id);
                    setSelectedId(null);
                }
                // Reset for next pair
                setConnectFirst(null);
            }
        } else {
            // Normal selection
            setSelectedId(prev => (prev === id ? null : id));
        }
    }, [connectMode, connectFirst, connections]);

    const handleDeselect = useCallback(() => {
        if (!connectMode) setSelectedId(null);
    }, [connectMode]);

    // ── Move item within canvas ───────────────────────────────────────────────
    const handleMoveItem = useCallback((id: string, x: number, y: number) => {
        setDroppedItems(prev =>
            prev.map(item => item.id === id ? { ...item, x, y } : item)
        );
    }, []);

    // ── Delete a specific item ───────────────────────────────────────────────
    const handleDeleteItem = useCallback((id: string) => {
        setDroppedItems(prev => prev.filter(item => item.id !== id));
        setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
        if (selectedId === id) setSelectedId(null);
    }, [selectedId]);

    // ── Undo: remove last item (LIFO) ─────────────────────────────────────────
    const handleUndo = useCallback(() => {
        setDroppedItems(prev => {
            if (prev.length === 0) return prev;
            const removed = prev[prev.length - 1];
            setConnections(c => c.filter(cn => cn.fromId !== removed.id && cn.toId !== removed.id));
            if (selectedId === removed.id) setSelectedId(null);
            return prev.slice(0, -1);
        });
    }, [selectedId]);

    // ── Undo All: clear every item + all connections at once ─────────────────
    const handleUndoAll = useCallback(() => {
        setDroppedItems([]);
        setConnections([]);
        setSelectedId(null);
        setSelectedConnectionId(null);
    }, []);

    // ── Auto align: evenly space all items horizontally ───────────────────────
    const handleAutoAlign = useCallback(() => {
        setDroppedItems(prev =>
            prev.map((item, idx) => ({
                ...item,
                x: ALIGN_START_X + idx * ALIGN_GAP,
                y: ALIGN_Y,
            }))
        );
    }, []);

    // ── Zoom In / Out: scales the entire canvas view ──────────────────────────
    const handleZoomIn = useCallback(() => {
        setCanvasScale(prev => Math.min(MAX_SCALE, parseFloat((prev + ZOOM_STEP).toFixed(2))));
    }, []);

    const handleZoomOut = useCallback(() => {
        setCanvasScale(prev => Math.max(MIN_SCALE, parseFloat((prev - ZOOM_STEP).toFixed(2))));
    }, []);

    // ── Connect mode toggle ───────────────────────────────────────────────────
    const handleToggleConnectMode = useCallback(() => {
        setConnectMode(prev => !prev);
        setConnectFirst(null); // Reset partial connection
    }, []);

    // ── Clear all connections ─────────────────────────────────────────────────
    const handleClearConnections = useCallback(() => {
        setConnections([]);
    }, []);

    // ── Clear last connection (LIFO — removes the most recently added line) ──
    const handleClearLastConnection = useCallback(() => {
        setConnections(prev => prev.slice(0, -1)); // Pop last connection from stack
    }, []);

    // ── Select / deselect a connection line ───────────────────────────────
    const handleSelectConnection = useCallback((id: string | null) => {
        setSelectedConnectionId(id);
        if (id) setSelectedId(null); // Deselect item when a connection is picked
    }, []);

    // ── Toggle History panel ───────────────────────────────────────────────
    const handleToggleHistory = useCallback(() => {
        setShowHistory(prev => !prev);
    }, []);

    // ── Reverse a connection: swap fromId ⇄ toId ─────────────────────────
    const handleReverseConnection = useCallback((connId: string) => {
        setConnections(prev =>
            prev.map(c => c.id === connId
                ? { ...c, fromId: c.toId, toId: c.fromId }
                : c
            )
        );
    }, []);

    // ── Toggle direction: one-way ⇄ two-way ────────────────────────────
    const handleToggleConnectionDirection = useCallback((connId: string) => {
        setConnections(prev =>
            prev.map(c => c.id === connId
                // Treat any non-'two-way' value (incl. undefined from old data) as one-way
                ? { ...c, direction: c.direction === 'two-way' ? 'one-way' : 'two-way' }
                : c
            )
        );
    }, []);

    // ── Save canvas state as JSON file (client-side Blob download) ─────────
    const handleSave = useCallback(() => {
        const snapshot = {
            version: 1,
            savedAt: new Date().toISOString(),
            items: droppedItems,
            connections,
        };
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [droppedItems, connections]);

    // ── Load canvas state from imported JSON ──────────────────────────
    const handleLoadData = useCallback(
        (data: { items: typeof droppedItems; connections: typeof connections }) => {
            setDroppedItems(data.items);
            setConnections(data.connections);
            // Clear all transient selection state after loading
            setSelectedId(null);
            setSelectedConnectionId(null);
            setConnectFirst(null);
            setConnectMode(false);
            setCanvasScale(1);
        },
        []
    );

    // ── Render ───────────────────────────────────────────────────────────────────────────
    return (
        <div className="app">
            {/* ── Left Sidebar ─────────────────────────── */}
            <Sidebar
                onDragStart={setDraggingPalette}
                items={droppedItems}
                connections={connections}
            />

            {/* ── Right Panel (Controls + Canvas) ──────── */}
            <div className="right-panel">
                <Controls
                    selectedItem={selectedItem}
                    canUndo={droppedItems.length > 0}
                    connectMode={connectMode}
                    hasConnections={connections.length > 0}
                    canvasScale={canvasScale}
                    selectedConnInfo={selectedConnInfo}
                    showHistory={showHistory}
                    onUndo={handleUndo}
                    onUndoAll={handleUndoAll}
                    onAutoAlign={handleAutoAlign}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onToggleConnectMode={handleToggleConnectMode}
                    onClearConnections={handleClearConnections}
                    onClearLastConnection={handleClearLastConnection}
                    onToggleHistory={handleToggleHistory}
                    onSave={handleSave}
                    onLoadData={handleLoadData}
                    onReverseConnection={handleReverseConnection}
                    onToggleConnectionDirection={handleToggleConnectionDirection}
                />
                <div className="canvas-wrapper">
                    <Canvas
                        items={droppedItems}
                        selectedId={selectedId}
                        connections={connections}
                        connectMode={connectMode}
                        connectFirst={connectFirst}
                        canvasScale={canvasScale}
                        selectedConnectionId={selectedConnectionId}
                        onDrop={handleDrop}
                        onSelect={handleSelect}
                        onMoveItem={handleMoveItem}
                        onDeselect={handleDeselect}
                        onSelectConnection={handleSelectConnection}
                        onDeleteItem={handleDeleteItem}
                    />
                </div>

                {/* History panel — slides in over the canvas */}
                {showHistory && (
                    <HistoryPanel
                        items={droppedItems}
                        connections={connections}
                        onClose={() => setShowHistory(false)}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
