import React from 'react';

import type { DroppedItem } from '../types';

interface DetailsPanelProps {
    item: DroppedItem;
    onClose: () => void;
}

// ── DetailsPanel — slides up from the bottom ──────────────────────────────────
const DetailsPanel: React.FC<DetailsPanelProps> = ({ item, onClose }) => {
    return (
        <div className="details-panel" role="dialog" aria-label="Item details">
            {/* Header */}
            <div className="details-panel-header">
                <span className="details-panel-title">
                    <span style={{ marginRight: 8, color: '#6366f1' }}>ℹ️</span>
                    Item Details
                </span>
                <button
                    className="details-close-btn"
                    onClick={onClose}
                    aria-label="Close details"
                    title="Close details"
                >
                    ✕
                </button>
            </div>

            {/* Body */}
            <div className="details-panel-body">
                <span className="details-panel-message">
                    Selected Item {' '}
                    <span className="details-panel-name">{item.label}</span>.
                </span>
                <span className="details-panel-meta">
                    Drop #{item.dropOrder} · type: {item.label}
                </span>
            </div>
        </div>
    );
};

export default DetailsPanel;
