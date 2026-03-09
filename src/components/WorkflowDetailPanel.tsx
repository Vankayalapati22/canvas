import React from 'react';
import type { WorkflowItem } from '../types';

interface WorkflowDetailPanelProps {
    item: WorkflowItem;
    onClose: () => void;
}

const WorkflowDetailPanel: React.FC<WorkflowDetailPanelProps> = ({ item, onClose }) => {
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
                <div className="workflow-detail-info-text">
                    You selected <strong>{item.label}</strong>.
                </div>
            </div>
        </div>
    );
};

export default WorkflowDetailPanel;
