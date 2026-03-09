import React, { useState, useRef, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import type { Connection, DroppedItem } from '../types';

interface ConnectionDetailsPanelProps {
    connection: Connection;
    fromLabel: string;
    toLabel: string;
    fromItem: DroppedItem;
    toItem: DroppedItem;
    allConnections: Connection[]; // To check if If/Else has both paths
    onClose: () => void;
    onUpdateDataTransfer: (connectionId: string, value: boolean | undefined) => void;
    onUpdateLoopConfig?: (connectionId: string, iterations: number, currentCount?: number, satisfied?: boolean, message?: string) => void;
    onUpdateConnectionPath?: (connectionId: string, pathType: 'true-path' | 'false-path') => void;
    onEvaluateCondition?: (fromItemId: string, condition: string, testValue: number) => void;
    onPipelineTrigger?: (startNodeId: string, testValue: number) => void;
}

// ── ConnectionDetailsPanel — shows when a connection line is selected ─────────
const ConnectionDetailsPanel: React.FC<ConnectionDetailsPanelProps> = ({
    connection,
    fromLabel,
    toLabel,
    fromItem,
    allConnections,
    // toItem not used currently, but kept in props for future use
    onClose,
    onUpdateDataTransfer,
    onUpdateLoopConfig,
    onPipelineTrigger,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [loopIterations, setLoopIterations] = useState<number>(connection.loopIterations || 1);
    const [conditionInput, setConditionInput] = useState(fromItem.ifElseConfig?.condition || '');
    const [testValue, setTestValue] = useState<number>(0);
    const [evalResult, setEvalResult] = useState<boolean | null>(null);
    const [showStopMessage, setShowStopMessage] = useState(false);
    const [forEachItemCount, setForEachItemCount] = useState(fromItem.forEachLoopConfig?.processedCount || 0);
    const [isLoopRunning, setIsLoopRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countRef = useRef(connection.loopCurrentCount || 0);

    // Determine if the connection is from a condition node
    const isFromIfElse = fromItem.type === 'if-else';
    const isFromForLoop = fromItem.type === 'for-loop';
    const isFromForEachLoop = fromItem.type === 'for-each-loop';
    const isFromCondition = isFromIfElse || isFromForLoop || isFromForEachLoop;

    // Check if If/Else node has both connections
    const connectionsFromThisNode = allConnections.filter(c => c.fromId === fromItem.id);
    const hasTruePath = connectionsFromThisNode.some(c => c.pathType === 'true-path');
    const hasFalsePath = connectionsFromThisNode.some(c => c.pathType === 'false-path');
    const hasRequiredPaths = hasTruePath && hasFalsePath;
    const currentPathType = connection.pathType;

    // Simple condition evaluator
    const evaluateCondition = (condition: string, val: number): boolean | null => {
        try {
            const match = condition.match(/(\w+)\s*([><=!]+)\s*(\d+)/);
            if (!match) return null;
            const [, , operator, threshold] = match;
            const t = parseInt(threshold, 10);
            switch (operator) {
                case '>': return val > t;
                case '<': return val < t;
                case '>=': return val >= t;
                case '<=': return val <= t;
                case '==': return val === t;
                case '!=': return val !== t;
                default: return null;
            }
        } catch { return null; }
    };

    const [evalError, setEvalError] = useState<string | null>(null);

    // Auto-evaluate: enter condition + value → both paths update automatically
    const handleEvaluate = () => {
        if (!conditionInput) {
            setEvalError("Please enter a condition first.");
            return;
        }
        const result = evaluateCondition(conditionInput, testValue);
        if (result === null) {
            setEvalError("Invalid condition format! Please use a valid format like: count > 3");
            setEvalResult(null);
            return;
        }
        setEvalError(null);
        setEvalResult(result);

        // Update ALL connections from this if/else node
        connectionsFromThisNode.forEach(conn => {
            if (conn.pathType === 'true-path') {
                onUpdateDataTransfer(conn.id, result);     // true-path gets the condition result
                if (result && onPipelineTrigger) {
                    onPipelineTrigger(conn.toId, testValue);
                }
            } else if (conn.pathType === 'false-path') {
                onUpdateDataTransfer(conn.id, !result);    // false-path gets the opposite
                if (!result && onPipelineTrigger) {
                    onPipelineTrigger(conn.toId, testValue);
                }
            }
        });
    };

    const handleForEachProcess = () => {
        setForEachItemCount(prev => prev + 1);
        onUpdateDataTransfer(connection.id, true);
        setShowStopMessage(false);
    };

    const handleForEachStop = () => {
        if (onUpdateLoopConfig) {
            onUpdateLoopConfig(
                connection.id,
                0,
                forEachItemCount,
                false,
                'Condition satisfied successfully'
            );
            onUpdateDataTransfer(connection.id, false);
            setShowStopMessage(true);
        }
    };

    const handleSubmit = () => {
        const trimmed = inputValue.trim().toLowerCase();
        if (trimmed === 'yes' || trimmed === 'true') {
            onUpdateDataTransfer(connection.id, true);
            setShowStopMessage(false);
        } else if (trimmed === 'no' || trimmed === 'false') {
            onUpdateDataTransfer(connection.id, false);
            setShowStopMessage(true);
        }
        setInputValue('');
    };

    // Auto-iterate: start loop runs through all iterations automatically
    const stopLoop = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsLoopRunning(false);
    };

    const handleLoopStart = () => {
        if (!onUpdateLoopConfig || loopIterations <= 0) return;
        // Reset and start
        countRef.current = 0;
        onUpdateLoopConfig(connection.id, loopIterations, 0, true, '');
        onUpdateDataTransfer(connection.id, true);
        setShowStopMessage(false);
        setIsLoopRunning(true);

        // Auto-iterate with 500ms delay between each step
        intervalRef.current = setInterval(() => {
            countRef.current += 1;
            const c = countRef.current;
            if (c >= loopIterations) {
                // Loop completed
                onUpdateLoopConfig(connection.id, loopIterations, c, false, 'Loop completed - all iterations done');
                onUpdateDataTransfer(connection.id, false);
                setShowStopMessage(true);
                stopLoop();
            } else {
                onUpdateLoopConfig(connection.id, loopIterations, c, true, '');
                onUpdateDataTransfer(connection.id, true);
            }
        }, 500);
    };

    const handleLoopStop = () => {
        stopLoop();
        if (onUpdateLoopConfig) {
            onUpdateLoopConfig(
                connection.id,
                loopIterations,
                countRef.current,
                false,
                'Loop stopped manually'
            );
            onUpdateDataTransfer(connection.id, false);
            setShowStopMessage(true);
        }
    };

    // Clean up interval on unmount
    useEffect(() => {
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="details-panel" role="dialog" aria-label="Connection details">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="details-panel-header">
                <span className="details-panel-title">
                    <span className="detail-icon-gap">🔗</span>
                    Connection Details
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
                {/* Connection info */}
                <div className="details-name-row">
                    <span className="details-name-label">From</span>
                    <span className="details-name-value">{fromLabel}</span>
                </div>

                <div className="details-name-row">
                    <span className="details-name-label">To</span>
                    <span className="details-name-value">{toLabel}</span>
                </div>

                <div className="details-name-row">
                    <span className="details-name-label">Direction</span>
                    <span className="details-name-value">
                        {connection.direction === 'one-way' ? 'One-Way →' : 'Two-Way ↔'}
                    </span>
                </div>

                <div style={{ height: '20px' }} />

                {/* IF/ELSE CONDITION NODE */}
                {isFromIfElse && (
                    <div className="details-config-section">
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                            If/Else - Condition Check
                        </h3>

                        {/* This connection's path type */}
                        {currentPathType && (
                            <div style={{
                                padding: '8px 12px',
                                background: currentPathType === 'true-path' ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${currentPathType === 'true-path' ? '#86efac' : '#fecaca'}`,
                                borderRadius: '6px',
                                marginBottom: '12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: currentPathType === 'true-path' ? '#166534' : '#991b1b',
                            }}>
                                This connection: {currentPathType === 'true-path' ? '✅ True (If) Path' : '❌ False (Else) Path'}
                            </div>
                        )}

                        {/* Missing path warning */}
                        {!hasRequiredPaths && (
                            <Message
                                severity="warn"
                                text={!hasTruePath && !hasFalsePath
                                    ? 'No paths assigned yet. Connect two items from this If/Else node.'
                                    : hasTruePath
                                        ? '⚠️ Missing False (Else) path — add a second connection from this node.'
                                        : '⚠️ Missing True (If) path — add a second connection from this node.'}
                                style={{ marginBottom: '12px', width: '100%' }}
                            />
                        )}

                        {/* Path Status */}
                        <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '6px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                <div style={{ color: hasTruePath ? '#10b981' : '#9ca3af' }}>
                                    {hasTruePath ? '✅' : '○'} True Path
                                </div>
                                <div style={{ color: hasFalsePath ? '#10b981' : '#9ca3af' }}>
                                    {hasFalsePath ? '✅' : '○'} False Path
                                </div>
                            </div>
                        </div>

                        {/* Condition input — only show when both paths exist */}
                        {hasRequiredPaths && (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                        Enter Condition
                                    </label>
                                    <InputText
                                        value={conditionInput}
                                        onChange={(e) => setConditionInput(e.target.value)}
                                        placeholder="e.g., count > 10"
                                        style={{ width: '100%' }}
                                    />
                                    <small style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontSize: '11px' }}>
                                        Supported: {'>'}, {'<'}, {'>='},  {'<='}, ==, !=
                                    </small>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                        Enter Value to Test
                                    </label>
                                    <InputNumber
                                        value={testValue}
                                        onValueChange={(e) => setTestValue(e.value || 0)}
                                        placeholder="Enter value"
                                        style={{ width: '100%' }}
                                        showButtons
                                    />
                                </div>

                                <Button
                                    label="Evaluate Condition"
                                    icon="pi pi-bolt"
                                    onClick={handleEvaluate}
                                    className="p-button-primary"
                                    style={{ width: '100%', marginBottom: '12px' }}
                                    disabled={!conditionInput}
                                />

                                {evalError && (
                                    <Message
                                        severity="error"
                                        text={evalError}
                                        style={{ width: '100%', marginBottom: '12px', padding: '10px' }}
                                    />
                                )}

                                {/* Result display */}
                                {evalResult !== null && (
                                    <div style={{
                                        padding: '12px',
                                        background: evalResult ? '#f0fdf4' : '#fef2f2',
                                        border: `1px solid ${evalResult ? '#86efac' : '#fecaca'}`,
                                        borderRadius: '6px',
                                        marginBottom: '12px',
                                    }}>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: evalResult ? '#166534' : '#991b1b', marginBottom: '4px' }}>
                                            Result: {evalResult ? '✅ TRUE' : '❌ FALSE'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                                            • True paths → <strong style={{ color: evalResult ? '#10b981' : '#ef4444' }}>{evalResult ? 'GREEN (data flows)' : 'RED (blocked)'}</strong><br />
                                            • False paths → <strong style={{ color: !evalResult ? '#10b981' : '#ef4444' }}>{!evalResult ? 'GREEN (data flows)' : 'RED (blocked)'}</strong>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* FOR LOOP NODE */}
                {isFromForLoop && (
                    <div className="details-config-section">
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                            For Loop - Iteration Control
                        </h3>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#6b7280' }}>
                                Number of Iterations
                            </label>
                            <InputNumber
                                value={loopIterations}
                                onValueChange={(e) => setLoopIterations(e.value || 1)}
                                min={1}
                                max={1000}
                                style={{ width: '100%' }}
                                showButtons
                                disabled={connection.loopCurrentCount !== undefined && connection.loopCurrentCount > 0}
                            />
                            <small style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontSize: '11px' }}>
                                Data will be sent one by one, {loopIterations} times
                            </small>
                        </div>

                        {/* Iteration Progress */}
                        {connection.loopCurrentCount !== undefined && (
                            <div style={{ padding: '12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '6px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                                    Iteration Counters: {connection.loopCurrentCount} / {connection.loopIterations || loopIterations}
                                </div>
                                <div style={{
                                    height: '10px',
                                    background: '#dbeafe',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
                                        width: `${((connection.loopCurrentCount || 0) / (connection.loopIterations || loopIterations)) * 100}%`,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {connection.loopCurrentCount >= (connection.loopIterations || loopIterations)
                                        ? '✓ All iterations completed'
                                        : `${(connection.loopIterations || loopIterations) - connection.loopCurrentCount} remaining`
                                    }
                                </div>
                            </div>
                        )}

                        {/* Control Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            {!isLoopRunning ? (
                                <Button
                                    label="▶ Start Loop"
                                    icon="pi pi-play"
                                    onClick={handleLoopStart}
                                    className="p-button-success"
                                    style={{ flex: 1 }}
                                    disabled={connection.loopCurrentCount !== undefined && connection.loopCurrentCount >= loopIterations}
                                />
                            ) : (
                                <Button
                                    label="⏹ Stop Loop"
                                    icon="pi pi-stop"
                                    onClick={handleLoopStop}
                                    className="p-button-danger"
                                    style={{ flex: 1 }}
                                />
                            )}
                        </div>

                    </div>
                )}

                {/* FOR EACH LOOP NODE */}
                {isFromForEachLoop && (
                    <div className="details-config-section">
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                            For Each Loop - Item Processing
                        </h3>

                        {fromItem.forEachLoopConfig?.condition && (
                            <div style={{ padding: '10px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>
                                    <strong>Stop Condition:</strong>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#78350f' }}>
                                    {fromItem.forEachLoopConfig.condition}
                                </div>
                            </div>
                        )}

                        {/* Item Counter */}
                        <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '6px' }}>
                                Items Processed: {forEachItemCount}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Processing items sequentially until condition is satisfied
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <Button
                                label="Process Next Item"
                                icon="pi pi-arrow-right"
                                onClick={handleForEachProcess}
                                className="p-button-success"
                                style={{ flex: 1 }}
                            />
                        </div>

                        <Button
                            label="Stop - Condition Satisfied"
                            icon="pi pi-check-circle"
                            onClick={handleForEachStop}
                            className="p-button-warning p-button-outlined"
                            style={{ width: '100%', marginBottom: '12px' }}
                        />


                    </div>
                )}

                {/* REGULAR CONNECTION (not from condition node) */}
                {!isFromCondition && (
                    <>
                        <div className="details-name-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                            <span className="details-name-label" style={{ fontSize: '14px', fontWeight: '600' }}>
                                Is data being transferred?
                            </span>
                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                                Enter "yes" or "true" for green line, "no" or "false" for red line.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <InputText
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="yes/no or true/false"
                                style={{ flex: 1 }}
                            />
                            <Button
                                label="Set"
                                onClick={handleSubmit}
                                style={{ minWidth: '60px' }}
                            />
                        </div>
                    </>
                )}

                {/* STOP MESSAGE */}
                {showStopMessage && connection.stopMessage && (
                    <Message
                        severity="warn"
                        text={connection.stopMessage}
                        style={{ marginTop: '16px', width: '100%' }}
                    />
                )}

                {!connection.stopMessage && showStopMessage && (
                    <Message
                        severity="error"
                        text="Condition not satisfied - data will not transfer"
                        style={{ marginTop: '16px', width: '100%' }}
                    />
                )}
            </div>
        </div>
    );
};

export default ConnectionDetailsPanel;
