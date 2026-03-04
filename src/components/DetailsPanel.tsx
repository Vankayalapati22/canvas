import React, { useState, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import type { DroppedItem, IfElseConfig, ForLoopConfig, ForEachLoopConfig } from '../types';

interface DetailsPanelProps {
    item: DroppedItem;
    onClose: () => void;
    onRenameItem?: (id: string, newLabel: string) => void;
    onUpdateConditionConfig?: (itemId: string, config: IfElseConfig | ForLoopConfig | ForEachLoopConfig) => void;
}

// ── DetailsPanel — slides in from the right when an item is selected ──────────
const DetailsPanel: React.FC<DetailsPanelProps> = ({ item, onClose, onRenameItem, onUpdateConditionConfig }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Resolved display name: custom label wins over auto-generated
    const displayName = item.customLabel ?? (item.dropCount > 1 ? `${item.label} ${item.dropCount}` : item.label);

    const startEditing = () => {
        setEditValue(displayName);
        setIsEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const commitEdit = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== displayName && onRenameItem) {
            onRenameItem(item.id, trimmed);
        }
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    };

    // Condition configuration handlers
    const handleIfElseConditionChange = (value: string) => {
        if (onUpdateConditionConfig) {
            onUpdateConditionConfig(item.id, { condition: value });
        }
    };

    const handleForLoopIterationsChange = (value: number | null | undefined) => {
        if (onUpdateConditionConfig && value !== null && value !== undefined) {
            onUpdateConditionConfig(item.id, { 
                iterations: value,
                dataCount: item.forLoopConfig?.dataCount 
            });
        }
    };

    const handleForEachConditionChange = (value: string) => {
        if (onUpdateConditionConfig) {
            onUpdateConditionConfig(item.id, { 
                condition: value,
                processedCount: item.forEachLoopConfig?.processedCount 
            });
        }
    };

    return (
        <div className="details-panel" role="dialog" aria-label="Item details">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="details-panel-header">
                <span className="details-panel-title">
                    <span className="detail-icon-gap">ℹ️</span>
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

            {/* ── Body ───────────────────────────────────────────────────────── */}
            <div className="details-panel-body">

                {/* Editable name row */}
                <div className="details-name-row">
                    <span className="details-name-label">Name Of the Item</span>
                    {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <input
                                ref={inputRef}
                                autoFocus
                                className="details-name-input"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={commitEdit}
                                title="Save changes"
                                style={{ padding: '4px 8px', fontSize: '16px', color: '#10b981', border: '1px solid #10b981', background: 'white', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                ✓
                            </button>
                            <button
                                onClick={cancelEdit}
                                title="Cancel (restore default)"
                                style={{ padding: '4px 8px', fontSize: '16px', color: '#ef4444', border: '1px solid #ef4444', background: 'white', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                ✗
                            </button>
                        </div>
                    ) : (
                        <span
                            className="details-name-value"
                            title="Double-click to rename"
                            onDoubleClick={startEditing}
                        >
                            {displayName}
                            <span className="details-edit-hint"></span>
                        </span>
                    )}
                </div>

                <p className="details-rename-hint">Double-click the name to rename. Press Enter to save.</p>

                {/* Condition Configuration Section */}
                {item.type === 'if-else' && (
                    <div className="details-config-section">
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                            If/Else Configuration
                        </h3>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#6b7280' }}>
                                Condition Expression
                            </label>
                            <InputText
                                value={item.ifElseConfig?.condition || ''}
                                onChange={(e) => handleIfElseConditionChange(e.target.value)}
                                placeholder="e.g., record_count > 50"
                                style={{ width: '100%' }}
                            />
                            <small style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontSize: '11px' }}>
                                Enter the condition to evaluate (e.g., variable {'>'} value)
                            </small>
                        </div>
                    </div>
                )}

                {item.type === 'for-loop' && (
                    <div className="details-config-section">
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                            For Loop Configuration
                        </h3>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#6b7280' }}>
                                Number of Iterations
                            </label>
                            <InputNumber
                                value={item.forLoopConfig?.iterations || 0}
                                onValueChange={(e) => handleForLoopIterationsChange(e.value)}
                                min={0}
                                placeholder="e.g., 100"
                                style={{ width: '100%' }}
                            />
                            <small style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontSize: '11px' }}>
                                How many times should the loop execute?
                            </small>
                        </div>
                        {item.forLoopConfig?.dataCount !== undefined && (
                            <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>Data Processed:</strong> {item.forLoopConfig.dataCount} records
                            </div>
                        )}
                    </div>
                )}

                {item.type === 'for-each-loop' && (
                    <div className="details-config-section">
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                            For Each Loop Configuration
                        </h3>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#6b7280' }}>
                                Stop Condition
                            </label>
                            <InputText
                                value={item.forEachLoopConfig?.condition || ''}
                                onChange={(e) => handleForEachConditionChange(e.target.value)}
                                placeholder="e.g., item.status === 'complete'"
                                style={{ width: '100%' }}
                            />
                            <small style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontSize: '11px' }}>
                                When should the loop stop processing?
                            </small>
                        </div>
                        {item.forEachLoopConfig?.processedCount !== undefined && (
                            <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px' }}>
                                <strong>Items Processed:</strong> {item.forEachLoopConfig.processedCount}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailsPanel;
