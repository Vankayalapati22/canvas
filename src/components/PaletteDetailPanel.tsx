import React from 'react';
import type { PaletteItem } from '../types';

interface PaletteDetailPanelProps {
    item: PaletteItem;
    onClose: () => void;
}

const PaletteDetailPanel: React.FC<PaletteDetailPanelProps> = ({ item, onClose }) => {
    return (
        <div className="history-panel" style={{ borderLeft: `4px solid ${item.color}` }}>
            {/* Header */}
            <div className="history-panel-header">
                <span className="history-panel-title">{item.label}</span>
                <button className="history-close-btn" onClick={onClose} title="Close">✕</button>
            </div>

            {/* Content */}
            <div className="history-section">
                <div className="history-section-heading">
                    Details
                </div>
                <div style={{ padding: '16px', fontSize: '15px', color: '#5cdc07', lineHeight: '1.5' }}>
                    You selected <strong>{item.label}</strong>.
                </div>
            </div>
        </div>
    );
};

export default PaletteDetailPanel;
