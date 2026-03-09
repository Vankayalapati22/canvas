import React, { useState, useRef } from 'react';
import type { DroppedItem, WorkflowItem, Connection } from '../types';

const BASE_SIZE = 64;
const DB_TYPES = ['postgresql', 'azuresql', 'mysql', 'oracle'];

// ── Mini-card grid constants (must match CSS) ─────────────────────────────────
const MINI_W = 76;
const MINI_H = 70;
const MINI_GAP = 8;
const MINI_COLS = 3;
const BOX_PAD = 10;

function getMiniCardCenter(index: number) {
  const col = index % MINI_COLS;
  const row = Math.floor(index / MINI_COLS);
  return {
    x: BOX_PAD + col * (MINI_W + MINI_GAP) + MINI_W / 2,
    y: BOX_PAD + row * (MINI_H + MINI_GAP) + MINI_H / 2,
  };
}

interface CanvasItemProps {
  item: DroppedItem;
  isSelected: boolean;
  onSelect: (id: string, multiSelect?: boolean) => void;
  onRemove: (id: string) => void;
  onDetail: (id: string) => void;
  onRenameItem?: (id: string, newLabel: string) => void;
  // Box-specific
  children?: DroppedItem[];
  onDropIntoBox?: (workflowItem: WorkflowItem, boxId: string) => void;
  // Connect-mode props (passed from Canvas)
  connectMode?: boolean;
  connectFirst?: string | null;
  intraBoxConnections?: Connection[];
  allConnections?: Connection[]; // All connections to check for status indicators
}

// ── Distinct Database SVG Icons ────────────────────────────────────────────────
function DbIcon({ type }: { type: string }) {
  const s = BASE_SIZE;
  if (type === 'postgresql') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#336791" />
        <rect x="10" y="20" width="60" height="36" fill="#255a7a" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#336791" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#pgTop)" />
        <path d="M34 26 Q28 38 32 50" stroke="#7ec8e3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M46 26 Q52 38 48 50" stroke="#7ec8e3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="40" y="44" textAnchor="middle" fontWeight="900" fontSize="14" fill="#fff" fontFamily="monospace">PG</text>
        <defs><radialGradient id="pgTop" cx="40%" cy="35%"><stop offset="0%" stopColor="#5ba3c9" stopOpacity="0.7" /><stop offset="100%" stopColor="#336791" stopOpacity="0" /></radialGradient></defs>
      </svg>
    );
  }
  if (type === 'mysql') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#00758F" />
        <rect x="10" y="20" width="60" height="36" fill="#005c6e" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#00758F" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#myTop)" />
        <path d="M52 30 Q62 24 58 36 Q55 42 48 40" stroke="#f7a800" strokeWidth="2" fill="#f7a800" fillOpacity="0.4" />
        <text x="38" y="48" textAnchor="middle" fontWeight="900" fontSize="13" fill="#fff" fontFamily="monospace">MY</text>
        <defs><radialGradient id="myTop" cx="40%" cy="35%"><stop offset="0%" stopColor="#00b4d8" stopOpacity="0.6" /><stop offset="100%" stopColor="#00758F" stopOpacity="0" /></radialGradient></defs>
      </svg>
    );
  }
  if (type === 'azuresql') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#0078D4" />
        <rect x="10" y="20" width="60" height="36" fill="#005a9e" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#0078D4" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#azTop)" />
        <path d="M32 48 L40 30 L48 48" stroke="#50e6ff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 43 L45 43" stroke="#50e6ff" strokeWidth="2.5" strokeLinecap="round" />
        <defs><radialGradient id="azTop" cx="40%" cy="35%"><stop offset="0%" stopColor="#50e6ff" stopOpacity="0.5" /><stop offset="100%" stopColor="#0078D4" stopOpacity="0" /></radialGradient></defs>
      </svg>
    );
  }
  if (type === 'oracle') {
    return (
      <svg width={s} height={s} viewBox="0 0 80 80">
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="#C0392B" />
        <rect x="10" y="20" width="60" height="36" fill="#96281b" />
        <ellipse cx="40" cy="56" rx="30" ry="10" fill="#C0392B" />
        <ellipse cx="40" cy="20" rx="30" ry="10" fill="url(#orTop)" />
        <circle cx="40" cy="40" r="11" stroke="#ff6b6b" strokeWidth="3" fill="none" />
        <circle cx="40" cy="40" r="5" fill="#ff6b6b" fillOpacity="0.5" />
        <defs><radialGradient id="orTop" cx="40%" cy="35%"><stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.5" /><stop offset="100%" stopColor="#C0392B" stopOpacity="0" /></radialGradient></defs>
      </svg>
    );
  }
  return null;
}

// ── Shape / image icon ────────────────────────────────────────────────────────
function ItemIcon({ item, mini = false }: { item: DroppedItem; mini?: boolean }) {
  const s = mini ? 32 : BASE_SIZE;
  
  // Database types
  if (DB_TYPES.includes(item.type))
    return <DbIcon type={item.type} />;
  
  // Condition nodes
  if (item.type === 'if-else') {
    // Diamond shape for If/Else
    const w = s;
    const h = s * 0.8;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polygon 
          points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} 
          fill={item.color}
          stroke="#fff"
          strokeWidth="2"
        />
        <text
          x={w/2}
          y={h/2}
          fill="#fff"
          fontSize={mini ? 10 : 14}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ?
        </text>
      </svg>
    );
  }
  
  if (item.type === 'for-loop') {
    // Rectangle with loop arrows
    const w = s;
    const h = s * 0.7;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <rect 
          x="2" 
          y="2" 
          width={w-4} 
          height={h-4} 
          rx="6" 
          fill={item.color}
          stroke="#fff"
          strokeWidth="2"
        />
        <text
          x={w/2}
          y={h/2}
          fill="#fff"
          fontSize={mini ? 12 : 16}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ⟲
        </text>
      </svg>
    );
  }
  
  if (item.type === 'for-each-loop') {
    // Rounded rectangle with iteration symbol
    const w = s;
    const h = s * 0.7;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <rect 
          x="2" 
          y="2" 
          width={w-4} 
          height={h-4} 
          rx="8" 
          fill={item.color}
          stroke="#fff"
          strokeWidth="2"
        />
        <text
          x={w/2}
          y={h/2}
          fill="#fff"
          fontSize={mini ? 10 : 14}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ∀
        </text>
      </svg>
    );
  }
  
  return null;
}

// ── Mini card rendered inside a box ───────────────────────────────────────────
interface MiniCardProps {
  child: DroppedItem;
  index: number;
  onRemoveChild: (id: string) => void;
  connectMode?: boolean;
  isConnectFirst?: boolean;
  onConnectClick?: (id: string) => void;
  onDetailChild?: (id: string) => void; // open details panel for this child
  allConnections?: Connection[]; // All connections to check for status
}

function MiniCard({ child, onRemoveChild, connectMode, isConnectFirst, onConnectClick, onDetailChild }: MiniCardProps) {
  const [hov, setHov] = useState(false);
  // Use customLabel if renamed, otherwise auto-generated label+count
  const displayName = child.customLabel ?? (child.dropCount > 1 ? `${child.label} ${child.dropCount}` : child.label);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectMode && onConnectClick) {
      onConnectClick(child.id);
    } else if (!connectMode && onDetailChild) {
      // Open the details panel so user can rename this child item
      onDetailChild(child.id);
    }
  };

  return (
    <div
      className={`box-mini-card${isConnectFirst ? ' connect-first' : ''}${connectMode ? ' connect-mode-hover' : ''}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={handleClick}
      title={connectMode ? `Click to ${isConnectFirst ? 'deselect' : 'connect'} "${displayName}"` : `Click to view/rename "${displayName}"`}
    >
      <div className="box-mini-icon">
        <ItemIcon item={child} mini />
      </div>
      <div className="box-mini-label">{displayName}</div>

      {/* ✖ remove — shows when hovered and NOT in connect mode */}
      {hov && !connectMode && (
        <button
          className="box-mini-remove"
          title={`Remove "${displayName}"`}
          onClick={(e) => { e.stopPropagation(); onRemoveChild(child.id); }}
        >✖</button>
      )}

      {/* Connect-first highlight ring */}
      {isConnectFirst && (
        <div className="box-mini-connect-ring" />
      )}
    </div>
  );
}

// ── Intra-box connection SVG ───────────────────────────────────────────────────
function IntraBoxSVG({
  children,
  connections,
  selectedConnectionId,
}: {
  children: DroppedItem[];
  connections: Connection[];
  selectedConnectionId?: string | null;
}) {
  if (connections.length === 0) return null;

  const idToIndex = new Map(children.map((c, i) => [c.id, i]));

  // Compute SVG dimensions based on grid
  const rows = Math.ceil(children.length / MINI_COLS);
  const svgW = BOX_PAD * 2 + MINI_COLS * (MINI_W + MINI_GAP) - MINI_GAP;
  const svgH = BOX_PAD * 2 + rows * (MINI_H + MINI_GAP) - MINI_GAP;

  // Helper: Get connection colors based on dataTransfer status
  const getIntraConnectionColors = (conn: Connection, isSelected: boolean) => {
    if (conn.dataTransfer === true) {
      return {
        stroke: isSelected ? '#34d399' : '#10b981',
        marker: isSelected ? 'url(#intra-arrow-green-sel)' : 'url(#intra-arrow-green)',
      };
    } else if (conn.dataTransfer === false) {
      return {
        stroke: isSelected ? '#f87171' : '#ef4444',
        marker: isSelected ? 'url(#intra-arrow-red-sel)' : 'url(#intra-arrow-red)',
      };
    } else {
      return {
        stroke: isSelected ? '#a5b4fc' : '#6366f1',
        marker: isSelected ? 'url(#intra-arrow-sel)' : 'url(#intra-arrow)',
      };
    }
  };

  return (
    <svg
      className="intra-svg-overlay"
      style={{ width: svgW, height: svgH }}
    >
      <defs>
        {/* Blue arrows (default) */}
        <marker id="intra-arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#6366f1" strokeWidth="1.5" />
        </marker>
        <marker id="intra-arrow-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#a5b4fc" strokeWidth="1.5" />
        </marker>
        {/* Green arrows (data transfer: true) */}
        <marker id="intra-arrow-green" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#10b981" strokeWidth="1.5" />
        </marker>
        <marker id="intra-arrow-green-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#34d399" strokeWidth="1.5" />
        </marker>
        {/* Red arrows (data transfer: false) */}
        <marker id="intra-arrow-red" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#ef4444" strokeWidth="1.5" />
        </marker>
        <marker id="intra-arrow-red-sel" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polyline points="0 0, 6 2, 0 4" fill="none" stroke="#f87171" strokeWidth="1.5" />
        </marker>
        <filter id="intra-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {connections.map(conn => {
        const fromIdx = idToIndex.get(conn.fromId);
        const toIdx = idToIndex.get(conn.toId);
        if (fromIdx === undefined || toIdx === undefined) return null;

        const p1 = getMiniCardCenter(fromIdx);
        const p2 = getMiniCardCenter(toIdx);
        const isSel = conn.id === selectedConnectionId;
        const isTwoWay = conn.direction === 'two-way';
        const colors = getIntraConnectionColors(conn, isSel);

        // Offset for two-way lanes
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const ox = (-dy / len) * 6;
        const oy = (dx / len) * 6;

        if (isTwoWay) {
          const a1 = { x: p1.x + ox, y: p1.y + oy };
          const a2 = { x: p2.x + ox, y: p2.y + oy };
          const b1 = { x: p2.x - ox, y: p2.y - oy };
          const b2 = { x: p1.x - ox, y: p1.y - oy };
          return (
            <g key={conn.id}>
              <path d={`M${a1.x} ${a1.y} L${a2.x} ${a2.y}`} stroke={colors.stroke} strokeWidth={isSel ? 2 : 1.5} fill="none" strokeLinecap="round" markerEnd={colors.marker} filter={isSel ? 'url(#intra-glow)' : undefined} opacity={isSel ? 1 : 0.8} />
              <path d={`M${b1.x} ${b1.y} L${b2.x} ${b2.y}`} stroke={isSel ? '#fb7185' : '#f43f5e'} strokeWidth={isSel ? 2 : 1.5} fill="none" strokeLinecap="round" markerEnd={isSel ? 'url(#intra-arrow-sel)' : 'url(#intra-arrow)'} filter={isSel ? 'url(#intra-glow)' : undefined} opacity={isSel ? 1 : 0.8} />
              <circle cx={p1.x} cy={p1.y} r={4} fill="white" stroke={colors.stroke} strokeWidth={1.5} />
              <circle cx={p2.x} cy={p2.y} r={4} fill="white" stroke="#f43f5e" strokeWidth={1.5} />
            </g>
          );
        }

        return (
          <g key={conn.id}>
            <path d={`M${p1.x} ${p1.y} L${p2.x} ${p2.y}`} stroke={colors.stroke} strokeWidth={isSel ? 2 : 1.5} fill="none" strokeLinecap="round" markerEnd={colors.marker} filter={isSel ? 'url(#intra-glow)' : undefined} opacity={isSel ? 1 : 0.8} />
            <circle cx={p1.x} cy={p1.y} r={4} fill="white" stroke={colors.stroke} strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
}

// ── CanvasItem Card ────────────────────────────────────────────────────────────
const CanvasItem: React.FC<CanvasItemProps> = ({
  item, isSelected, onSelect, onRemove, onDetail, onRenameItem,
  children = [],
  onDropIntoBox,
  connectMode = false,
  connectFirst = null,
  intraBoxConnections = [],
  allConnections = [],
}) => {
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [boxDragOver, setBoxDragOver] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const isBox = item.type === 'box';

  // Resolved display name: customLabel wins over auto-generated label+count
  const autoName = item.dropCount > 1 ? `${item.label} ${item.dropCount}` : item.label;
  const displayName = item.customLabel ?? autoName;

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectMode) return; // don't enter edit mode while connecting
    setEditValue(displayName);
    setIsEditingName(true);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (onRenameItem && editValue.trim()) {
      onRenameItem(item.id, editValue.trim());
    }
    setIsEditingName(false);
  };

  const cancelEdit = () => {
    setIsEditingName(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.dataTransfer.setData('text/move-id', item.id);
    e.dataTransfer.setData('text/offset-x', String(dragOffset.current.x));
    e.dataTransfer.setData('text/offset-y', String(dragOffset.current.y));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectMode) {
      // In connect mode any click selects this item for connection
      onSelect(item.id);
      return;
    }
    const multiSelect = e.ctrlKey || e.metaKey;
    onSelect(item.id, multiSelect);
    if (!multiSelect) onDetail(item.id);
  };

  // ── Box drop handlers ──────────────────────────────────────────────────────
  const handleBoxDragOver = (e: React.DragEvent) => {
    if (!isBox) return;
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/json')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setBoxDragOver(true);
    }
  };

  const handleBoxDragLeave = (e: React.DragEvent) => {
    if (!isBox) return;
    e.stopPropagation();
    setBoxDragOver(false);
  };

  const handleBoxDrop = (e: React.DragEvent) => {
    if (!isBox || !onDropIntoBox) return;
    // Only intercept workflow drops — move operations must bubble to the canvas
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes('application/json')) return; // let canvas handle moves
    e.preventDefault();
    e.stopPropagation();
    setBoxDragOver(false);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const workflowItem: WorkflowItem = JSON.parse(raw);
      if (workflowItem.type === 'box') return; // no box-in-box
      onDropIntoBox(workflowItem, item.id);
    } catch { /* ignore */ }
  };

  // ── BOX CARD ───────────────────────────────────────────────────────────────
  if (isBox) {
    const isConnectFirst = connectFirst === item.id;
    return (
      <div
        className={`canvas-item ${isSelected ? 'selected' : ``}`}
        style={{ left: item.x, top: item.y, transform: `scale(${item.size})`, transformOrigin: 'top left', cursor: connectMode ? 'pointer' : 'grab' }}
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={`box-card ${isSelected ? 'selected' : ''} ${boxDragOver ? 'drag-over' : ''} ${connectMode ? 'connect-mode-box' : ''} ${isConnectFirst ? 'connect-first-box' : ''}`}>

          {/* ── Header ─ double-click title to rename ── */}
          <div className="box-card-header">
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <input
                  ref={editInputRef}
                  autoFocus
                  className="item-rename-input"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  className="edit-action-btn edit-save-btn"
                  onClick={(e) => { e.stopPropagation(); commitEdit(); }}
                  title="Save changes"
                  style={{ padding: '2px 6px', fontSize: '14px', color: '#10b981', border: '1px solid #10b981', background: 'white', borderRadius: '3px', cursor: 'pointer' }}
                >
                  ✓
                </button>
                <button
                  className="edit-action-btn edit-cancel-btn"
                  onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                  title="Cancel (restore default)"
                  style={{ padding: '2px 6px', fontSize: '14px', color: '#ef4444', border: '1px solid #ef4444', background: 'white', borderRadius: '3px', cursor: 'pointer' }}
                >
                  ✗
                </button>
              </div>
            ) : (
              <span
                className="box-card-title"
                title="Double-click to rename"
                draggable={false}
                onMouseDown={e => e.stopPropagation()}
                onDoubleClick={startEditing}
              >{displayName}{/* getConnectionStatusIndicator() */}</span>
            )}
            <span className="box-card-count-badge">{children.length}</span>
            {connectMode && (
              <span className="box-connect-indicator" title="Click to connect this box">🔗</span>
            )}
            {hovered && !connectMode && !isEditingName && (
              <button
                className="box-remove-btn"
                title="Delete box and all its items"
                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              >✖</button>
            )}
          </div>

          {/* ── Body — drop zone for workflow items only ── */}
          <div
            className="box-card-body"
            onDragOver={handleBoxDragOver}
            onDragLeave={handleBoxDragLeave}
            onDrop={handleBoxDrop}
          >
            {children.length === 0 ? (
              <div
                className={`box-drop-hint ${boxDragOver ? 'active' : ''}`}
                draggable={false}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" />
                  <path d="M12 8v8M8 12h8" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Drop items here</span>
              </div>
            ) : (
              <div className="box-body-relative" draggable={false}>
                <IntraBoxSVG children={children} connections={intraBoxConnections} />
                <div className="box-card-grid" draggable={false}>
                  {children.map((child, idx) => (
                    <MiniCard
                      key={child.id}
                      child={child}
                      index={idx}
                      onRemoveChild={onRemove}
                      connectMode={connectMode}
                      isConnectFirst={connectFirst === child.id}
                      onConnectClick={onSelect}
                      onDetailChild={onDetail}  // click (non-connect) opens DetailsPanel
                      allConnections={allConnections}
                    />
                  ))}
                  <div className={`box-add-more ${boxDragOver ? 'active' : ''}`} draggable={false}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="1" width="14" height="14" rx="3" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3 2" />
                      <path d="M8 5v6M5 8h6" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── REGULAR CARD ───────────────────────────────────────────────────────────
  return (
    <div
      className={`canvas-item ${isSelected ? 'selected' : ''}`}
      style={{ left: item.x, top: item.y, cursor: 'pointer', transform: `scale(${item.size})`, transformOrigin: 'top left' }}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="item-card" style={{
        boxShadow: isSelected ? '0 0 0 3px #818cf8' : undefined,
        outline: isSelected ? '2px solid #818cf8' : undefined,
      }}>
        <div className="item-card-header">
          <span className="item-sym-tick" title="Dropped successfully">✔</span>
          <span className="item-card-name">{displayName}</span>
        </div>
        <div className={`item-card-body ${hovered ? 'hovered' : ''}`}>
          <div className="item-card-icon item-icon-wrap">
            <ItemIcon item={item} />
          </div>
          {/* Double-click the body label to rename */}
          {isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px' }}>
              <input
                ref={editInputRef}
                autoFocus
                className="item-rename-input"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                style={{ flex: 1, minWidth: 0 }}
              />
              <button
                className="edit-action-btn edit-save-btn"
                onClick={(e) => { e.stopPropagation(); commitEdit(); }}
                title="Save changes"
                style={{ padding: '2px 6px', fontSize: '14px', color: '#10b981', border: '1px solid #10b981', background: 'white', borderRadius: '3px', cursor: 'pointer' }}
              >
                ✓
              </button>
              <button
                className="edit-action-btn edit-cancel-btn"
                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                title="Cancel (restore default)"
                style={{ padding: '2px 6px', fontSize: '14px', color: '#ef4444', border: '1px solid #ef4444', background: 'white', borderRadius: '3px', cursor: 'pointer' }}
              >
                ✗
              </button>
            </div>
          ) : (
            <div
              className="item-card-body-label"
              title="Double-click to rename"
              draggable={false}
              onMouseDown={e => e.stopPropagation()}
              onDoubleClick={startEditing}
            >{displayName}{/* getConnectionStatusIndicator() */}</div>
          )}
          {hovered && !isEditingName && (
            <button
              className="item-sym-remove"
              title="Remove"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            >✖</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CanvasItem;
