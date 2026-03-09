import React, { useState, useRef } from 'react';
import type { DroppedItem } from '../types';

interface DetailsPanelProps {
    item: DroppedItem;
    onClose: () => void;
    onRenameItem?: (id: string, newLabel: string) => void;
    onRemoveItem?: (id: string) => void;
}

// Property data structure
interface PropertyField {
    name: string;
    type: string;
    defaultValue: string | number;
    checked: boolean;
}

// ── DetailsPanel — slides in from the right when an item is selected ──────────
const DetailsPanel: React.FC<DetailsPanelProps> = ({ item, onClose, onRenameItem, onRemoveItem }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Property fields with checkboxes
    const [properties, setProperties] = useState<PropertyField[]>([
        { name: 'filename', type: 'string', defaultValue: 'sample.csv', checked: false },
        { name: 'noofitemsreceived', type: 'number', defaultValue: 0, checked: false },
        { name: 'filestatus', type: 'string', defaultValue: 'completed', checked: false  },
    ]);

    // Property name editing state
    const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);
    const [editingPropertyValue, setEditingPropertyValue] = useState('');
    const propertyInputRef = useRef<HTMLInputElement>(null);

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

    // Toggle checkbox for properties
    const togglePropertyCheck = (index: number) => {
        setProperties(prev => prev.map((prop, i) => 
            i === index ? { ...prop, checked: !prop.checked } : prop
        ));
    };

    // Delete property from list
    const deleteProperty = (index: number) => {
        setProperties(prev => prev.filter((_, i) => i !== index));
    };

    // Property name editing functions
    const startEditingProperty = (index: number, currentName: string) => {
        setEditingPropertyIndex(index);
        setEditingPropertyValue(currentName);
        setTimeout(() => propertyInputRef.current?.select(), 0);
    };

    const commitPropertyEdit = () => {
        if (editingPropertyIndex !== null && editingPropertyValue.trim()) {
            setProperties(prev => prev.map((prop, i) => 
                i === editingPropertyIndex ? { ...prop, name: editingPropertyValue.trim() } : prop
            ));
        }
        setEditingPropertyIndex(null);
    };

    const cancelPropertyEdit = () => {
        setEditingPropertyIndex(null);
    };

    const handlePropertyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); commitPropertyEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelPropertyEdit(); }
    };

    const handleDelete = () => {
        if (onRemoveItem && window.confirm(`Are you sure you want to delete "${displayName}"?`)) {
            onRemoveItem(item.id);
            onClose();
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
            <div className="details-panel-body" style={{ flexDirection: 'column', alignItems: 'stretch' }}>

                {/* Editable name row */}
                <div className="details-name-row">
                    <span className="details-name-label">Item Name</span>
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

                {/* Action Buttons */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => {
                            const exportData = {
                                itemName: displayName,
                                itemType: item.type,
                                properties: properties.filter(p => p.checked).map(p => ({
                                    name: p.name,
                                    type: p.type,
                                    defaultValue: p.defaultValue
                                }))
                            };
                            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${displayName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="details-save-btn"
                        style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'background 0.15s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
                        title="Save selected properties as JSON"
                    >
                        💾 Save
                    </button>
                    {onRemoveItem && (
                        <button
                            onClick={handleDelete}
                            className="details-delete-btn"
                            style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                        >
                            🗑️ Delete
                        </button>
                    )}
                </div>

                {/* Properties Table */}
                <div className="details-properties-section">
                    <h3 className="details-properties-title">
                        Properties
                    </h3>
                    
                    <table className="details-property-table">
                        <thead>
                            <tr>
                                <th>Select</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Default Value</th>
                                <th>Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {properties.map((prop, index) => (
                                <tr 
                                    key={index}
                                    className={prop.checked ? 'property-row-checked' : 'property-row-unchecked'}
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={prop.checked}
                                            onChange={() => togglePropertyCheck(index)}
                                            className="property-checkbox"
                                        />
                                    </td>
                                    <td className="property-name-cell">
                                        {editingPropertyIndex === index ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                    ref={propertyInputRef}
                                                    autoFocus
                                                    className="property-name-input"
                                                    value={editingPropertyValue}
                                                    onChange={(e) => setEditingPropertyValue(e.target.value)}
                                                    onKeyDown={handlePropertyKeyDown}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ flex: 1, minWidth: 0 }}
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); commitPropertyEdit(); }}
                                                    title="Save"
                                                    style={{ padding: '2px 6px', fontSize: '1px', color: '#10b981', border: '1px solid #10b981', background: 'white', borderRadius: '3px', cursor: 'pointer' }}
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); cancelPropertyEdit(); }}
                                                    title="Cancel"
                                                    style={{ padding: '2px 6px', fontSize: '1px', color: '#ef4444', border: '1px solid #ef4444', background: 'white', borderRadius: '3px', cursor: 'pointer' }}
                                                >
                                                    ✗
                                                </button>
                                            </div>
                                        ) : (
                                            <span 
                                                onDoubleClick={() => startEditingProperty(index, prop.name)}
                                                title="Double-click to edit"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {prop.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="property-type-cell">
                                        {prop.type}
                                    </td>
                                    <td className="property-value-cell">
                                        {typeof prop.defaultValue === 'string' ? `"${prop.defaultValue}"` : prop.defaultValue}
                                    </td>
                                    <td className="property-delete-cell">
                                        <button
                                            onClick={() => deleteProperty(index)}
                                            className="property-delete-btn"
                                            title={`Delete ${prop.name}`}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DetailsPanel;
