import React, { useEffect, useRef, useState } from 'react';

const ICONS = {
    error: '⚠️',
    info: 'ℹ️',
    success: '✅',
    warning: '📶',
    join: '👋',
    leave: '🚪'
};

/**
 * Toast – lightweight snackbar notification.
 *
 * Props:
 *   message  : string  – text to display
 *   type     : 'error' | 'info' | 'success' | 'warning' | 'join' | 'leave' – controls colour and icon
 *   onDone   : () => void  – called after the toast disappears
 *   duration : number (ms, default 3500)
 *   stacked  : boolean – rendered inside a stack (no fixed positioning, tap to dismiss)
 */
export default function Toast({ message, type = 'info', onDone, duration = 3500, stacked = false }) {
    const [visible, setVisible] = useState(false);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        if (!message) return;
        setVisible(true);
        // hide starts 400 ms before done to give the CSS fade-out animation time to finish
        const hide = setTimeout(() => setVisible(false), duration - 400);
        const done = setTimeout(() => {
            onDoneRef.current?.();
        }, duration);
        return () => {
            clearTimeout(hide);
            clearTimeout(done);
        };
    }, [message, duration]);

    if (!message) return null;

    return (
        <div
            className={`toast toast-${type} ${stacked ? 'toast-stacked' : ''} ${visible ? 'toast-show' : 'toast-hide'}`}
            role="status"
            aria-live="polite"
            onClick={stacked ? () => onDoneRef.current?.() : undefined}
        >
            <span className="toast-icon">{ICONS[type] || ICONS.info}</span>
            <span className="toast-text">{message}</span>
        </div>
    );
}
