import React from 'react';
import { Button } from 'primereact/button';
import type { DatabaseType } from '../types';
import 'primeicons/primeicons.css';

interface PaletteBarProps {
    onSelectItem: (item: DatabaseType) => void;
}

interface PaletteItemConfig {
    id: string;
    display: string;
    icon: string;
    color: string;
    type?: DatabaseType;
}

// Database palette items with PrimeIcons
const DATABASE_ITEMS: PaletteItemConfig[] = [
    { id: 'postgresql', display: 'PostgreSQL', icon: 'pi pi-database', color: '#336791', type: 'postgresql' },
    { id: 'azuresql', display: 'Azure SQL', icon: 'pi pi-cloud', color: '#0078D4', type: 'azuresql' },
    { id: 'mysql', display: 'MySQL', icon: 'pi pi-circle-fill', color: '#00758F', type: 'mysql' },
    { id: 'oracle', display: 'Oracle', icon: 'pi pi-circle', color: '#F80000', type: 'oracle' },
];

const PaletteBar: React.FC<PaletteBarProps> = ({ onSelectItem }) => {
    const handleItemClick = (item: PaletteItemConfig) => {
        if (item.type) {
            onSelectItem(item.type);
        }
    };

    return (
        <div className="palette-bar">
            <div className="palette-bar-title">
                <h3>Database</h3>
            </div>
            <div className="palette-bar-items">
                {DATABASE_ITEMS.map((item) => (
                    <div
                        key={item.id}
                        className="palette-bar-item"
                        onClick={() => handleItemClick(item)}
                        title={item.display}
                    >
                        <Button
                            className="p-button-rounded p-button-text palette-bar-button"
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

export default PaletteBar;
