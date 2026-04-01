import React, { useEffect, useState } from 'react';

/**
 * Toast – lightweight snackbar notification.
 *
 * Props:
 *   message  : string  – text to display
 *   type     : 'error' | 'info'  – controls colour
 *   onDone   : () => void  – called after the toast disappears
 *   duration : number (ms, default 3500)
 */
export default function Toast({ message, type = 'info', onDone, duration = 3500 }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) return;
        setVisible(true);
        // hide starts 400 ms before done to give the CSS fade-out animation time to finish
        const hide = setTimeout(() => setVisible(false), duration - 400);
        const done = setTimeout(() => {
            onDone?.();
        }, duration);
        return () => {
            clearTimeout(hide);
            clearTimeout(done);
        };
    }, [message, duration, onDone]);

    if (!message) return null;

    return (
        <div className={`toast toast-${type} ${visible ? 'toast-show' : 'toast-hide'}`} role="status" aria-live="polite">
            <span className="toast-icon">{type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span className="toast-text">{message}</span>
        </div>
    );
}
