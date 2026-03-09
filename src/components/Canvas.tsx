import React, { useState, useRef } from 'react';
import type { DroppedItem, WorkflowItem, Connection, Group } from '../types';
import CanvasItem from './CanvasItem';
import ConnectionLayer from './ConnectionLayer';
import GroupContainer from './GroupContainer';

interface CanvasProps {
    items: DroppedItem[];
    connections: Connection[];
    connectMode: boolean;
    connectFirst: string | null;
    canvasScale: number;
    selectedConnectionId: string | null;
    selectedIds: string[];
    groups: Group[];
    onDrop: (workflowItem: WorkflowItem, x: number, y: number) => void;
    onSelect: (id: string, multiSelect?: boolean) => void;
    onMoveItem: (id: string, x: number, y: number) => void;
    onDeselect: () => void;
    onSelectConnection: (id: string | null) => void;
    onRemoveItem: (id: string) => void;
    onDetailItem: (id: string) => void;
    onMoveGroup: (groupId: string, x: number, y: number) => void;
    onUngroup: (groupId: string) => void;
    onDropIntoBox: (workflowItem: WorkflowItem, boxId: string) => void;
    onRenameItem: (id: string, newLabel: string) => void;
}

// ── Canvas Component ──────────────────────────────────────────────────────────
const Canvas: React.FC<CanvasProps> = ({
    items,
    connections,
    connectMode,
    connectFirst,
    canvasScale,
    selectedConnectionId,
    selectedIds,
    groups,
    onDrop,
    onSelect,
    onMoveItem,
    onDeselect,
    onSelectConnection,
    onRemoveItem,
    onDetailItem,
    onMoveGroup,
    onUngroup,
    onDropIntoBox,
    onRenameItem,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        // dropEffect must match effectAllowed set in dragstart:
        // - item/group moves use effectAllowed='move'
        // - workflow drops use effectAllowed='copy'
        const types = Array.from(e.dataTransfer.types);
        const isMove = types.includes('text/move-id') || types.includes('text/move-group-id');
        e.dataTransfer.dropEffect = isMove ? 'move' : 'copy';
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;

        const scrollLeft = wrapperRef.current?.scrollLeft ?? 0;
        const scrollTop = wrapperRef.current?.scrollTop ?? 0;

        // Moving a group
        const moveGroupId = e.dataTransfer.getData('text/move-group-id');
        if (moveGroupId) {
            const offsetX = parseFloat(e.dataTransfer.getData('text/offset-x')) || 0;
            const offsetY = parseFloat(e.dataTransfer.getData('text/offset-y')) || 0;
            const newX = (e.clientX - rect.left + scrollLeft - offsetX) / canvasScale;
            const newY = (e.clientY - rect.top + scrollTop - offsetY) / canvasScale;
            onMoveGroup(moveGroupId, Math.max(0, newX), Math.max(0, newY));
            return;
        }

        // Moving an item
        const moveId = e.dataTransfer.getData('text/move-id');
        if (moveId) {
            const offsetX = parseFloat(e.dataTransfer.getData('text/offset-x')) || 0;
            const offsetY = parseFloat(e.dataTransfer.getData('text/offset-y')) || 0;
            const newX = (e.clientX - rect.left + scrollLeft - offsetX) / canvasScale;
            const newY = (e.clientY - rect.top + scrollTop - offsetY) / canvasScale;
            onMoveItem(moveId, Math.max(0, newX), Math.max(0, newY));
            return;
        }

        // Dropping a new workflow item onto the canvas
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        try {
            const workflowItem: WorkflowItem = JSON.parse(raw);
            const x = (e.clientX - rect.left + scrollLeft - 40) / canvasScale;
            const y = (e.clientY - rect.top + scrollTop - 40) / canvasScale;
            onDrop(workflowItem, Math.max(0, x), Math.max(0, y));
        } catch { /* ignore */ }
    };

    const handleCanvasClick = () => {
        if (!connectMode) {
            onDeselect();
            onSelectConnection(null);
        }
    };

    const isEmpty = items.length === 0;

    // ── Separate top-level items from box children ────────────────────────────
    const topLevelItems = items.filter(i => !i.parentBoxId);

    // Build box → children map
    const boxChildrenMap = new Map<string, DroppedItem[]>();
    for (const item of items) {
        if (item.parentBoxId) {
            const arr = boxChildrenMap.get(item.parentBoxId) ?? [];
            arr.push(item);
            boxChildrenMap.set(item.parentBoxId, arr);
        }
    }

    // ── Split connections: top-level vs intra-box ─────────────────────────────
    // Intra-box: both fromId AND toId are children of the same box
    const childIdToBoxId = new Map<string, string>();
    for (const item of items) {
        if (item.parentBoxId) childIdToBoxId.set(item.id, item.parentBoxId);
    }

    const intraBoxConnsByBox = new Map<string, Connection[]>();
    const topLevelConnections: Connection[] = [];

    for (const conn of connections) {
        const fromBox = childIdToBoxId.get(conn.fromId);
        const toBox = childIdToBoxId.get(conn.toId);

        if (fromBox && toBox && fromBox === toBox) {
            // Both endpoints inside the SAME box → intra-box
            const arr = intraBoxConnsByBox.get(fromBox) ?? [];
            arr.push(conn);
            intraBoxConnsByBox.set(fromBox, arr);
        } else {
            // Everything else → main ConnectionLayer.
            // If an endpoint is a box-child, proxy it through its parent box
            // so the line always connects to a visible top-level border.
            const vFrom = fromBox ?? conn.fromId;
            const vTo = toBox ?? conn.toId;
            if (vFrom !== vTo) {
                topLevelConnections.push({ ...conn, fromId: vFrom, toId: vTo });
            }
        }
    }

    return (
        <div
            ref={wrapperRef}
            className={`canvas ${isDragOver ? 'drag-over' : ''} ${connectMode ? 'connect-mode' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleCanvasClick}
        >
            {isEmpty && !isDragOver && (
                <div className="canvas-empty-hint">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <rect x="8" y="8" width="48" height="48" rx="12" stroke="#4f46e5" strokeWidth="2" strokeDasharray="6 3" />
                        <path d="M32 22v20M22 32h20" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <p>Drag items from the sidebar and drop them here</p>
                </div>
            )}

            <div
                className="canvas-scaled"
                style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}
            >
                {/* Legacy GroupContainers (from old group system) */}
                {groups.map(group => (
                    <GroupContainer key={group.id} group={group} onUngroup={onUngroup} />
                ))}

                {/* Top-level items (not inside a box) */}
                {topLevelItems.map(item => {
                    const group = item.groupId ? groups.find(g => g.id === item.groupId) : null;
                    const absoluteX = group ? item.x + group.x : item.x;
                    const absoluteY = group ? item.y + group.y : item.y;
                    const boxChildren = item.type === 'box' ? (boxChildrenMap.get(item.id) ?? []) : [];
                    const intraConns = item.type === 'box' ? (intraBoxConnsByBox.get(item.id) ?? []) : [];

                    return (
                        <CanvasItem
                            key={item.id}
                            item={{ ...item, x: absoluteX, y: absoluteY }}
                            isSelected={selectedIds.includes(item.id)}
                            onSelect={onSelect}
                            onRemove={onRemoveItem}
                            onDetail={onDetailItem}
                            onRenameItem={onRenameItem}
                            children={boxChildren}
                            onDropIntoBox={onDropIntoBox}
                            connectMode={connectMode}
                            connectFirst={connectFirst}
                            intraBoxConnections={intraConns}
                            allConnections={connections}
                        />
                    );
                })}

                {/* Main connection layer — only top-level connections */}
                <ConnectionLayer
                    items={topLevelItems.map(item => {
                        const group = item.groupId ? groups.find(g => g.id === item.groupId) : null;
                        return group ? { ...item, x: item.x + group.x, y: item.y + group.y } : item;
                    })}
                    allItems={items}
                    connections={topLevelConnections}
                    selectedConnectionId={selectedConnectionId}
                    onSelectConnection={onSelectConnection}
                />
            </div>

            {/* Connect-mode first-pick indicator */}
            {connectMode && connectFirst && (
                <div style={{
                    position: 'absolute', bottom: 16, left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#4f46e5cc', color: '#fff',
                    padding: '6px 14px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    pointerEvents: 'none', zIndex: 200,
                }}>
                    ✓ First item selected — click another to connect
                </div>
            )}
        </div>
    );
};

export default Canvas;
