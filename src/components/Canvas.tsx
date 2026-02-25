import React, { useState, useRef } from 'react';
import type { DroppedItem, PaletteItem, Connection } from '../types';
import CanvasItem from './CanvasItem';
import ConnectionLayer from './ConnectionLayer';

interface CanvasProps {
    items: DroppedItem[];
    selectedId: string | null;
    connections: Connection[];
    connectMode: boolean;
    connectFirst: string | null;
    canvasScale: number;
    selectedConnectionId: string | null;
    onDrop: (paletteItem: PaletteItem, x: number, y: number) => void;
    onSelect: (id: string) => void;
    onMoveItem: (id: string, x: number, y: number) => void;
    onDeselect: () => void;
    onSelectConnection: (id: string | null) => void;
    onDeleteItem: (id: string) => void;
}

// ── Canvas Component ──────────────────────────────────────────────────────────
const Canvas: React.FC<CanvasProps> = ({
    items,
    selectedId,
    connections,
    connectMode,
    connectFirst,
    canvasScale,
    selectedConnectionId,
    onDrop,
    onSelect,
    onMoveItem,
    onDeselect,
    onSelectConnection,
    onDeleteItem,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;

        const moveId = e.dataTransfer.getData('text/move-id');
        if (moveId) {
            const offsetX = parseFloat(e.dataTransfer.getData('text/offset-x')) || 0;
            const offsetY = parseFloat(e.dataTransfer.getData('text/offset-y')) || 0;
            const newX = (e.clientX - rect.left - offsetX) / canvasScale;
            const newY = (e.clientY - rect.top - offsetY) / canvasScale;
            onMoveItem(moveId, Math.max(0, newX), Math.max(0, newY));
            return;
        }

        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        try {
            const paletteItem: PaletteItem = JSON.parse(raw);
            const x = (e.clientX - rect.left - 40) / canvasScale;
            const y = (e.clientY - rect.top - 40) / canvasScale;
            onDrop(paletteItem, Math.max(0, x), Math.max(0, y));
        } catch { /* ignore */ }
    };

    // Clicking the canvas background deselects both items and connections
    const handleCanvasClick = () => {
        if (!connectMode) {
            onDeselect();
            onSelectConnection(null);
        }
    };

    const isEmpty = items.length === 0;

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

            {/* Scaled content wrapper — items + connections scale together */}
            <div
                className="canvas-scaled"
                style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                    transform: `scale(${canvasScale})`,
                    transformOrigin: 'top left',
                }}
            >
                {items.map(item => (
                    <CanvasItem
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        onSelect={onSelect}
                        onMove={onMoveItem}
                        onDelete={onDeleteItem}
                    />
                ))}

                <ConnectionLayer
                    items={items}
                    connections={connections}
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
