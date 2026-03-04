// ─── Shared TypeScript Types ─────────────────────────────────────────────────

/** Types of items available in the sidebar palette */
export type ItemType = 'postgresql' | 'azuresql' | 'mysql' | 'oracle' | 'box'
    | 'if-else' | 'for-loop' | 'for-each-loop';

/** Types of database/service items available in the palette bar */
export type DatabaseType = 'postgresql' | 'azuresql' | 'mysql' | 'oracle';

/** Types of condition/logic nodes */
export type ConditionType = 'if-else' | 'for-loop' | 'for-each-loop';

/** Configuration for If/Else condition node */
export interface IfElseConfig {
    condition: string; // e.g., "data_count > 10"
}

/** Configuration for For Loop node */
export interface ForLoopConfig {
    iterations: number; // Number of times to repeat
    dataCount?: number; // Track how many times data was processed
}

/** Configuration for For Each Loop node */
export interface ForEachLoopConfig {
    condition: string; // e.g., "record_count < 100"
    processedCount?: number; // Track processed items
}

/** A palette item shown in the sidebar — draggable source */
export interface PaletteItem {
    type: ItemType;
    label: string;
    color: string;
}

/** An item that has been dropped onto the canvas */
export interface DroppedItem {
    id: string;         // Unique identifier (crypto.randomUUID)
    type: ItemType;
    label: string;
    customLabel?: string; // User-set display name (overrides label + dropCount)
    color: string;
    x: number;         // Canvas-relative position
    y: number;
    size: number;      // Base size multiplier (default 1)
    zoom: number;      // Zoom multiplier (default 1)
    dropOrder: number; // 1-based drop sequence number (global, immutable)
    dropCount: number; // 1-based count of same-label drops (e.g. Star 1, Star 2)
    groupId?: string;  // Optional ID of the group this item belongs to
    parentBoxId?: string; // Optional ID of a box card this item lives inside
    // Condition node configurations
    ifElseConfig?: IfElseConfig;
    forLoopConfig?: ForLoopConfig;
    forEachLoopConfig?: ForEachLoopConfig;
}

/** A directional connection between two canvas items */
export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    /** 'one-way' = single arrow A→B; 'two-way' = parallel arrows A↔B */
    direction: 'one-way' | 'two-way';
    /** Whether data is being transferred: true/yes = green line, false/no = red line */
    dataTransfer?: boolean;
    /** For If/Else nodes: identifies if this is the true or false path */
    pathType?: 'true-path' | 'false-path' | null;
    /** For loop connections: how many times to send data */
    loopIterations?: number;
    /** For loop connections: current iteration count */
    loopCurrentCount?: number;
    /** For loop connections: whether condition is satisfied */
    conditionSatisfied?: boolean;
    /** Message when condition is not satisfied */
    stopMessage?: string;
}

/** A group container that holds multiple items of the same type */
export interface Group {
    id: string;        // Unique identifier
    type: ItemType;    // All items in this group must have this type
    x: number;         // Group position
    y: number;
    width: number;     // Group dimensions
    height: number;
}
