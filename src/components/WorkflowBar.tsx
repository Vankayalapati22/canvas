import React from 'react';
import { Button } from 'primereact/button';
import type { DatabaseType } from '../types';
import 'primeicons/primeicons.css';

interface WorkflowBarProps {
    onSelectItem: (item: DatabaseType) => void;
}

interface WorkflowItemConfig {
    id: string;
    display: string;
    icon: string;
    color: string;
    type?: DatabaseType;
}

// Database workflow items with PrimeIcons
const DATABASE_ITEMS: WorkflowItemConfig[] = [
    { id: 'postgresql', display: 'PostgreSQL', icon: 'pi pi-database', color: '#336791', type: 'postgresql' },
    { id: 'azuresql', display: 'Azure SQL', icon: 'pi pi-cloud', color: '#0078D4', type: 'azuresql' },
    { id: 'mysql', display: 'MySQL', icon: 'pi pi-circle-fill', color: '#00758F', type: 'mysql' },
    { id: 'oracle', display: 'Oracle', icon: 'pi pi-circle', color: '#F80000', type: 'oracle' },
];

const WorkflowBar: React.FC<WorkflowBarProps> = ({ onSelectItem }) => {
    const handleItemClick = (item: WorkflowItemConfig) => {
        if (item.type) {
            onSelectItem(item.type);
        }
    };

    return (
        <div className="workflow-bar">
            <div className="workflow-bar-title">
                <h3>Database</h3>
            </div>
            <div className="workflow-bar-items">
                {DATABASE_ITEMS.map((item) => (
                    <div
                        key={item.id}
                        className="workflow-bar-item"
                        onClick={() => handleItemClick(item)}
                        title={item.display}
                    >
                        <Button
                            className="p-button-rounded p-button-text workflow-bar-button"
                            icon={item.icon}
                            style={{
                                color: item.color,
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            tooltip={item.display}
                            tooltipOptions={{ position: 'left' }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowBar;
