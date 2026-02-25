// ─── Shared TypeScript Types ─────────────────────────────────────────────────

/** Types of items available in the sidebar palette */
export type ItemType = 'rect' | 'circle' | 'triangle' | 'text' | 'image';

/** A palette item shown in the sidebar — draggable source */
export interface PaletteItem {
    type: ItemType;
    label: string;
    color: string;
    emoji?: string; // For image-type items
}

/** An item that has been dropped onto the canvas */
export interface DroppedItem {
    id: string;         // Unique identifier (crypto.randomUUID)
    type: ItemType;
    label: string;
    color: string;
    emoji?: string;
    x: number;         // Canvas-relative position
    y: number;
    size: number;      // Base size multiplier (default 1)
    zoom: number;      // Zoom multiplier (default 1)
    dropOrder: number; // 1-based drop sequence number
}

/** A directional connection between two canvas items */
export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    /** 'one-way' = single arrow A→B; 'two-way' = parallel arrows A↔B */
    direction: 'one-way' | 'two-way';
}
