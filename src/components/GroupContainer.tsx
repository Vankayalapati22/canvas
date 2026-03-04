import React, { useRef, useState } from 'react';
import type { Group } from '../types';

interface GroupContainerProps {
    group: Group;
    onUngroup: (groupId: string) => void;
}

const GroupContainer: React.FC<GroupContainerProps> = ({ group, onUngroup }) => {
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        e.dataTransfer.setData('text/move-group-id', group.id);
        e.dataTransfer.setData('text/offset-x', String(dragOffset.current.x));
        e.dataTransfer.setData('text/offset-y', String(dragOffset.current.y));
    };

    return (
        <div
            className="group-container"
            style={{
                position: 'absolute',
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.height,
            }}
            draggable
            onDragStart={handleDragStart}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Group header */}
            <div className="group-label">
                Group ({group.type})
            </div>

            {/* Ungroup button - shown on hover */}
            {hovered && (
                <button
                    className="group-ungroup-btn"
                    title="Ungroup"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUngroup(group.id);
                    }}
                >
                    ✖
                </button>
            )}
        </div>
    );
};

export default GroupContainer;
