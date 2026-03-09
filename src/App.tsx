import { useState, useCallback, useEffect } from 'react';
import './App.css';
import type { DroppedItem, Connection, WorkflowItem, Group } from './types';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Controls from './components/Controls';
import HistoryPanel from './components/HistoryPanel';
import WorkflowDetailPanel from './components/WorkflowDetailPanel';
import DetailsPanel from './components/DetailsPanel';
import ConnectionDetailsPanel from './components/ConnectionDetailsPanel';

// ── Zoom step constants ───────────────────────────────────────────────────────
const ZOOM_STEP = 0.1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4.0;

// ── Auto-align layout constants ───────────────────────────────────────────────
const ALIGN_START_X = 40;
const ALIGN_Y = 80;
const ALIGN_GAP = 150;

function App() {
    // ── Theme state ─────────────────────────────────────────────────────────────
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // ── Core state ──────────────────────────────────────────────────────────────
    // Stack of dropped items — LIFO ordering (push/pop for undo)
    const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);

    // Currently selected item ids (supports multi-select)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Groups containing multiple items
    const [groups, setGroups] = useState<Group[]>([]);

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

    // Currently selected workflow item for detail view
    const [detailItem, setDetailItem] = useState<WorkflowItem | null>(null);

    // ID of the canvas item whose ➜ arrow was clicked (shows bottom DetailsPanel)
    const [detailItemId, setDetailItemId] = useState<string | null>(null);

    // If/Else prompt — tracks an if/else node that needs a second connection
    const [pendingIfElsePrompt, setPendingIfElsePrompt] = useState<string | null>(null);

    // ── Derived ─────────────────────────────────────────────────────────────────
    const selectedItems = droppedItems.filter(i => selectedIds.includes(i.id));
    const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

    // Group button: need ≥1 selected, ≥2 same-type ungrouped items, not already in a box, not a box itself
    const canGroup = selectedIds.length >= 1 &&
        selectedItems.length >= 1 &&
        selectedItems[0] &&
        !selectedItems[0].parentBoxId &&
        selectedItems[0].type !== 'box' &&
        droppedItems.filter(item =>
            item.type === selectedItems[0]?.type && !item.parentBoxId
        ).length >= 2;

    // Derive connection info for display (source label → target label + direction)
    const selectedConn = connections.find(c => c.id === selectedConnectionId) ?? null;
    const getDisplayName = (item: typeof droppedItems[0]) =>
        item.customLabel ?? (item.dropCount > 1 ? `${item.label} ${item.dropCount}` : item.label);
    const selectedConnInfo = selectedConn
        ? {
            connId: selectedConn.id,
            from: (() => { const i = droppedItems.find(i => i.id === selectedConn.fromId); return i ? getDisplayName(i) : '?'; })(),
            to: (() => { const i = droppedItems.find(i => i.id === selectedConn.toId); return i ? getDisplayName(i) : '?'; })(),
            direction: selectedConn.direction,
        }
        : null;

    // ── Remove a specific item by ID (used by the ✖ button on each item) ────
    const handleRemoveItem = useCallback((id: string) => {
        // Find the item being removed
        const removedItem = droppedItems.find(i => i.id === id);
        // If it's a box, also remove all children (items with parentBoxId === id)
        const childIds = removedItem?.type === 'box'
            ? droppedItems.filter(i => i.parentBoxId === id).map(i => i.id)
            : [];
        const idsToRemove = new Set([id, ...childIds]);

        setDroppedItems(prev => prev.filter(item => !idsToRemove.has(item.id)));
        setConnections(c => c.filter(cn => !idsToRemove.has(cn.fromId) && !idsToRemove.has(cn.toId)));
        setSelectedIds(prev => prev.filter(i => !idsToRemove.has(i)));
        if (detailItemId && idsToRemove.has(detailItemId)) setDetailItemId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [droppedItems, selectedIds, detailItemId]);

    // ── Show details panel for the clicked item ───────────────────────────────
    const handleDetailItem = useCallback((id: string) => {
        setDetailItemId(id);
    }, []);

    // ── Rename an item — sets a custom display label ──────────────────────────
    const handleRenameItem = useCallback((id: string, newLabel: string) => {
        const trimmed = newLabel.trim();
        if (!trimmed) return; // ignore empty
        setDroppedItems(prev => prev.map(item =>
            item.id === id ? { ...item, customLabel: trimmed } : item
        ));
    }, []);

    // ── Undo: remove last item (LIFO) ─────────────────────────────────────────
    const handleUndo = useCallback(() => {
        setDroppedItems(prev => {
            if (prev.length === 0) return prev;
            const removed = prev[prev.length - 1];
            setConnections(c => c.filter(cn => cn.fromId !== removed.id && cn.toId !== removed.id));
            if (selectedIds.includes(removed.id)) setSelectedIds(p => p.filter(i => i !== removed.id));
            if (detailItemId === removed.id) setDetailItemId(null);
            return prev.slice(0, -1);
        });
    }, [selectedIds, detailItemId]);

    // ── Apply theme to document ────────────────────────────────────────────────
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

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
    }, [handleUndo]);

    // ── Drop new item from sidebar ────────────────────────────────────────────
    const handleDrop = useCallback((workflowItem: WorkflowItem, x: number, y: number) => {
        // Count how many items with the same label already exist
        const sameLabel = droppedItems.filter(i => i.label === workflowItem.label).length;
        const newItem: DroppedItem = {
            id: crypto.randomUUID(),
            type: workflowItem.type,
            label: workflowItem.label,
            color: workflowItem.color,
            x, y,
            size: 1,
            zoom: 1,
            dropOrder: droppedItems.length + 1, // global 1-based sequence (immutable)
            dropCount: sameLabel + 1,   // per-label count: Star 1, Star 2 …
        };
        setDroppedItems(prev => [...prev, newItem]);
        setSelectedIds([newItem.id]);
        setSelectedConnectionId(null);
    }, [droppedItems]);

    // ── Select an item (or handle connect-mode second click) ──────────────────
    const handleSelect = useCallback((id: string, multiSelect = false) => {
        if (connectMode) {
            if (!connectFirst) {
                setConnectFirst(id);
            } else if (connectFirst !== id) {
                // Pick second item — create connection if not already present
                const existingConn = connections.find(
                    c => (c.fromId === connectFirst && c.toId === id) ||
                        (c.fromId === id && c.toId === connectFirst)
                );
                if (!existingConn) {
                    // Check if the first item is an if/else node
                    const firstItem = droppedItems.find(i => i.id === connectFirst);
                    const isIfElse = firstItem?.type === 'if-else';

                    // Count existing connections from this if/else node
                    const existingFromIfElse = isIfElse
                        ? connections.filter(c => c.fromId === connectFirst)
                        : [];
                    const hasTruePath = existingFromIfElse.some(c => c.pathType === 'true-path');
                    const hasFalsePath = existingFromIfElse.some(c => c.pathType === 'false-path');

                    // Auto-assign pathType for if/else nodes
                    let autoPathType: 'true-path' | 'false-path' | undefined;
                    if (isIfElse) {
                        if (!hasTruePath) autoPathType = 'true-path';
                        else if (!hasFalsePath) autoPathType = 'false-path';
                    }

                    const newConn: Connection = {
                        id: crypto.randomUUID(),
                        fromId: connectFirst,
                        toId: id,
                        direction: 'one-way',
                        ...(autoPathType ? { pathType: autoPathType } : {}),
                    };
                    setConnections(prev => [...prev, newConn]);
                    setSelectedConnectionId(newConn.id);
                    setSelectedIds([]);

                    // For if/else: if this was the first path (true), keep connect mode
                    // active so the user is prompted to connect the second path (false)
                    if (isIfElse && autoPathType === 'true-path' && !hasFalsePath) {
                        // Stay in connect mode with same source, prompting for false-path
                        setConnectFirst(connectFirst); // keep source
                        setPendingIfElsePrompt(connectFirst); // show toast
                        return; // don't clear connectFirst
                    }

                    // If this was the false path, clear the prompt
                    if (isIfElse && autoPathType === 'false-path') {
                        setPendingIfElsePrompt(null);
                    }
                } else {
                    setSelectedConnectionId(existingConn.id);
                    setSelectedIds([]);
                }
                setConnectFirst(null);
            }
        } else {
            // Multi-select mode (Ctrl/Cmd + click)
            if (multiSelect) {
                setSelectedIds(prev => {
                    if (prev.includes(id)) {
                        // Deselect if already selected
                        return prev.filter(i => i !== id);
                    } else {
                        // Add to selection
                        return [...prev, id];
                    }
                });
            } else {
                // Single select
                setSelectedIds(prev => (prev.length === 1 && prev[0] === id ? [] : [id]));
            }
        }
    }, [connectMode, connectFirst, connections, droppedItems]);

    const handleDeselect = useCallback(() => {
        if (!connectMode) setSelectedIds([]);
    }, [connectMode]);

    // ── Move item within canvas ───────────────────────────────────────────────
    const handleMoveItem = useCallback((id: string, x: number, y: number) => {
        setDroppedItems(prev =>
            prev.map(item => item.id === id ? { ...item, x, y } : item)
        );
    }, []);

    // ── Drop item INTO a box card ─────────────────────────────────────────────
    const handleDropIntoBox = useCallback((workflowItem: WorkflowItem, boxId: string) => {
        const sameLabel = droppedItems.filter(i => i.label === workflowItem.label).length;
        const newItem: DroppedItem = {
            id: crypto.randomUUID(),
            type: workflowItem.type,
            label: workflowItem.label,
            color: workflowItem.color,
            x: 0,
            y: 0,
            size: 1,
            zoom: 1,
            dropOrder: droppedItems.length + 1,
            dropCount: sameLabel + 1,
            parentBoxId: boxId,
        };
        setDroppedItems(prev => [...prev, newItem]);
    }, [droppedItems]);


    // ── Undo All: clear every item + all connections at once ─────────────────
    const handleUndoAll = useCallback(() => {
        setDroppedItems([]);
        setConnections([]);
        setSelectedIds([]);
        setSelectedConnectionId(null);
        setDetailItemId(null);
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
        if (id) setSelectedIds([]); // Deselect item when a connection is picked
    }, []);

    // ── Toggle History panel ───────────────────────────────────────────────
    const handleToggleHistory = useCallback(() => {
        setShowHistory(prev => !prev);
        setDetailItem(null); // Close detail panel if opening history
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
                // Also reset dataTransfer to undefined (removes color coding and status indicators)
                ? { ...c, direction: c.direction === 'two-way' ? 'one-way' : 'two-way', dataTransfer: undefined }
                : c
            )
        );
    }, []);

    // ── Update connection data transfer status ────────────────────────────
    const handleUpdateConnectionDataTransfer = useCallback((connId: string, value: boolean | undefined) => {
        setConnections(prev =>
            prev.map(c => c.id === connId
                ? { ...c, dataTransfer: value }
                : c
            )
        );
    }, []);

    // ── Update connection loop configuration ───────────────────────────────
    const handleUpdateLoopConfig = useCallback((
        connId: string,
        iterations: number,
        currentCount?: number,
        satisfied?: boolean,
        message?: string
    ) => {
        setConnections(prev =>
            prev.map(c => c.id === connId
                ? {
                    ...c,
                    loopIterations: iterations,
                    loopCurrentCount: currentCount,
                    conditionSatisfied: satisfied,
                    stopMessage: message
                }
                : c
            )
        );
    }, []);

    // ── Update connection path type (for If/Else nodes) ────────────────────
    const handleUpdateConnectionPath = useCallback((connId: string, pathType: 'true-path' | 'false-path') => {
        setConnections(prev =>
            prev.map(c => c.id === connId
                ? { ...c, pathType }
                : c
            )
        );
    }, []);

    // ── Handle condition evaluation (for If/Else nodes) ────────────────────
    const handleEvaluateCondition = useCallback((itemId: string, condition: string, testValue: number) => {
        // This is called when a condition is evaluated
        // You can add additional logic here if needed (e.g., logging, analytics)
        console.log(`Condition evaluated for item ${itemId}: ${condition} with value ${testValue}`);
    }, []);

    // ── Automated Pipeline Execution Engine ────────────────────────────────
    const handlePipelineTrigger = useCallback((startNodeId: string, passedValue: number) => {
        console.log(`[Pipeline] Triggered from startNodeId=${startNodeId} with value=${passedValue}`);
        // 1. Light up connections OUT of the startNode (e.g. Postgres)
        const outConns = connections.filter(c => c.fromId === startNodeId);
        console.log(`[Pipeline] Found ${outConns.length} outbound connections from ${startNodeId}`);

        outConns.forEach(outConn => {
            console.log(`[Pipeline] Lighting up connection ${outConn.id}`);
            handleUpdateConnectionDataTransfer(outConn.id, true);

            const nextNode = droppedItems.find(i => i.id === outConn.toId);
            console.log(`[Pipeline] nextNode is ${nextNode?.type} (${nextNode?.id})`);

            // 2. If it hits a For Loop, auto-iterate!
            if (nextNode && nextNode.type === 'for-loop') {
                const loopConnections = connections.filter(c => c.fromId === nextNode.id);
                console.log(`[Pipeline] Found ${loopConnections.length} loop connections from for-loop ${nextNode.id}`);

                loopConnections.forEach(loopConn => {
                    console.log(`[Pipeline] Starting interval for loopConn ${loopConn.id}`);
                    // Start an interval in App.tsx!
                    let count = 0;
                    handleUpdateLoopConfig(loopConn.id, passedValue, count, true, '');
                    handleUpdateConnectionDataTransfer(loopConn.id, true);

                    const interval = setInterval(() => {
                        count++;
                        console.log(`[Pipeline] Interval tick ${count}/${passedValue}`);
                        if (count >= passedValue) {
                            clearInterval(interval);
                            handleUpdateLoopConfig(loopConn.id, passedValue, count, true, 'Pipeline completed successfully');
                            handleUpdateConnectionDataTransfer(loopConn.id, true);
                        } else {
                            handleUpdateLoopConfig(loopConn.id, passedValue, count, true, '');
                            handleUpdateConnectionDataTransfer(loopConn.id, true);
                        }
                    }, 500);
                });
            }
        });
    }, [connections, droppedItems, handleUpdateConnectionDataTransfer, handleUpdateLoopConfig]);

    // ── Save canvas state as hierarchical JSON (backend-readable) ──────────
    const handleSave = useCallback(() => {
        // Build a map of boxId → children
        const childrenByBox = new Map<string, typeof droppedItems>();
        for (const item of droppedItems) {
            if (item.parentBoxId) {
                const arr = childrenByBox.get(item.parentBoxId) ?? [];
                arr.push(item);
                childrenByBox.set(item.parentBoxId, arr);
            }
        }

        // Build the hierarchical items array:
        // - Box items get a `children` array of their nested items (parentBoxId stripped)
        // - Standalone items get `children: []`
        // - Child items (parentBoxId set) are omitted at the top level (they live inside their parent)
        type ExportItem = Omit<typeof droppedItems[0], 'parentBoxId'> & {
            children: Omit<typeof droppedItems[0], 'parentBoxId'>[];
        };

        const exportItems: ExportItem[] = droppedItems
            .filter(item => !item.parentBoxId)  // only top-level items
            .map(item => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { parentBoxId: _omit, ...rest } = item;
                const rawChildren = childrenByBox.get(item.id) ?? [];
                const children = rawChildren.map(child => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { parentBoxId: _c, ...childRest } = child;
                    return childRest;
                });
                return { ...rest, children };
            });

        const snapshot = {
            version: 2,
            savedAt: new Date().toISOString(),
            items: exportItems,
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
            setSelectedIds([]);
            setSelectedConnectionId(null);
            setConnectFirst(null);
            setConnectMode(false);
            setCanvasScale(1);
        },
        []
    );

    // ── Handle Workflow Item Click ────────────────────────────────────────────────
    const handleWorkflowClick = useCallback((item: WorkflowItem) => {
        setDetailItem(item);
        setShowHistory(false); // Close history if opening detail
    }, []);

    // ── Update item label (from History panel) ───────────────────────────
    const handleUpdateItemLabel = useCallback((itemId: string, newLabel: string) => {
        setDroppedItems(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, customLabel: newLabel } : item
            )
        );
    }, []);

    // ── Create Group: package same-type items into a Box card ─────────────────
    const handleCreateGroup = useCallback(() => {
        if (selectedIds.length < 1) return;

        const firstItem = droppedItems.find(i => i.id === selectedIds[0]);
        if (!firstItem) return;

        const targetType = firstItem.type;
        if (targetType === 'box') return;

        // All top-level (ungrouped) same-type items
        const itemsToGroup = droppedItems.filter(
            item => item.type === targetType && !item.parentBoxId
        );

        if (itemsToGroup.length < 2) {
            alert(`Need at least 2 ${targetType} items to group. Found: ${itemsToGroup.length}.`);
            return;
        }

        // Place the box near the centroid of the selected items
        const avgX = itemsToGroup.reduce((s, i) => s + i.x, 0) / itemsToGroup.length;
        const avgY = itemsToGroup.reduce((s, i) => s + i.y, 0) / itemsToGroup.length;

        const boxId = crypto.randomUUID();
        const typeName = targetType.charAt(0).toUpperCase() + targetType.slice(1);

        const boxItem: DroppedItem = {
            id: boxId,
            type: 'box',
            label: `${typeName} Group`,
            color: '#8b5cf6',
            x: Math.max(0, avgX - 110),
            y: Math.max(0, avgY - 50),
            size: 1,
            zoom: 1,
            dropOrder: droppedItems.length + 1,
            dropCount: droppedItems.filter(i => i.type === 'box').length + 1,
        };

        setDroppedItems(prev => {
            // Remove ungrouped same-type items from top-level, re-add as children
            const others = prev.filter(i => !(i.type === targetType && !i.parentBoxId));
            const children = itemsToGroup.map(i => ({ ...i, parentBoxId: boxId }));
            return [...others, boxItem, ...children];
        });

        setSelectedIds([boxId]);
    }, [selectedIds, droppedItems]);

    // ── Ungroup: remove items from group ──────────────────────────────────
    const handleUngroup = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        // Update items: remove groupId and restore absolute positions and size
        setDroppedItems(prev =>
            prev.map(item => {
                if (item.groupId === groupId) {
                    return {
                        ...item,
                        groupId: undefined,
                        x: item.x + group.x,
                        y: item.y + group.y,
                        size: 1.0, // Restore original size
                    };
                }
                return item;
            })
        );

        // Remove group
        setGroups(prev => prev.filter(g => g.id !== groupId));
    }, [groups]);

    // ── Move group (and all its items) ───────────────────────────────────
    const handleMoveGroup = useCallback((groupId: string, x: number, y: number) => {
        setGroups(prev =>
            prev.map(g => g.id === groupId ? { ...g, x, y } : g)
        );
    }, []);

    // ── Toggle theme ─────────────────────────────────────────────────────
    const handleToggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────────────────
    return (
        <div className="app">
            {/* ── Sidebar (position toggled) ─────────── */}
            <Sidebar
                onDragStart={() => { }} // This prop is required by Sidebar but its state was unused.
                items={droppedItems}
                connections={connections}
                onItemClick={handleWorkflowClick}
            />

            {/* ── Right Panel (Controls + Canvas) ──────── */}
            <div className="right-panel">
                <Controls
                    selectedItem={selectedItem}
                    selectedItemsCount={selectedIds.length}
                    canGroup={canGroup}
                    canUndo={droppedItems.length > 0}
                    connectMode={connectMode}
                    hasConnections={connections.length > 0}
                    canvasScale={canvasScale}
                    selectedConnInfo={selectedConnInfo}
                    showHistory={showHistory}
                    theme={theme}
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
                    onCreateGroup={handleCreateGroup}
                    onToggleTheme={handleToggleTheme}
                />
                <div className="canvas-wrapper">
                    <Canvas
                        items={droppedItems}
                        connections={connections}
                        connectMode={connectMode}
                        connectFirst={connectFirst}
                        canvasScale={canvasScale}
                        selectedConnectionId={selectedConnectionId}
                        selectedIds={selectedIds}
                        groups={groups}
                        onDrop={handleDrop}
                        onSelect={handleSelect}
                        onMoveItem={handleMoveItem}
                        onDeselect={handleDeselect}
                        onSelectConnection={handleSelectConnection}
                        onRemoveItem={handleRemoveItem}
                        onDetailItem={handleDetailItem}
                        onMoveGroup={handleMoveGroup}
                        onUngroup={handleUngroup}
                        onDropIntoBox={handleDropIntoBox}
                        onRenameItem={handleRenameItem}
                    />

                    {/* If/Else prompt — floating toast asking for second path */}
                    {pendingIfElsePrompt && (
                        <div className="ifelse-prompt-toast">
                            <span className="ifelse-prompt-icon">❓</span>
                            <div className="ifelse-prompt-text">
                                <strong>If/Else needs two paths!</strong>
                                <span>✅ True path connected. Now click the target for the <strong>False (Else)</strong> path.</span>
                            </div>
                            <button
                                className="ifelse-prompt-skip"
                                onClick={() => { setPendingIfElsePrompt(null); setConnectFirst(null); }}
                            >
                                Skip
                            </button>
                        </div>
                    )}
                </div>

                {/* History panel — slides in over the canvas */}
                {showHistory && (
                    <HistoryPanel
                        items={droppedItems}
                        connections={connections}
                        onClose={() => setShowHistory(false)}
                        onUpdateItemLabel={handleUpdateItemLabel}
                    />
                )}

                {/* Workflow Detail panel — similar to History panel */}
                {detailItem && (
                    <WorkflowDetailPanel
                        item={detailItem}
                        onClose={() => setDetailItem(null)}
                    />
                )}

                {/* ── Canvas item details panel (bottom, shown on ➜ click) ── */}
                {detailItemId && (() => {
                    const found = droppedItems.find(i => i.id === detailItemId);
                    return found ? (
                        <DetailsPanel
                            item={found}
                            onClose={() => setDetailItemId(null)}
                            onRenameItem={handleRenameItem}
                            onRemoveItem={handleRemoveItem}
                        />
                    ) : null;
                })()}

                {/* ── Connection details panel (bottom, shown when connection is selected) ── */}
                {selectedConnectionId && (() => {
                    const conn = connections.find(c => c.id === selectedConnectionId);
                    if (!conn) return null;
                    const fromItem = droppedItems.find(i => i.id === conn.fromId);
                    const toItem = droppedItems.find(i => i.id === conn.toId);
                    if (!fromItem || !toItem) return null;
                    return (
                        <ConnectionDetailsPanel
                            connection={conn}
                            fromLabel={getDisplayName(fromItem)}
                            toLabel={getDisplayName(toItem)}
                            fromItem={fromItem}
                            toItem={toItem}
                            allConnections={connections}
                            onClose={() => setSelectedConnectionId(null)}
                            onUpdateDataTransfer={handleUpdateConnectionDataTransfer}
                            onUpdateLoopConfig={handleUpdateLoopConfig}
                            onUpdateConnectionPath={handleUpdateConnectionPath}
                            onEvaluateCondition={handleEvaluateCondition}
                            onPipelineTrigger={handlePipelineTrigger}
                        />
                    );
                })()}
            </div>


        </div>
    );
}

export default App;
