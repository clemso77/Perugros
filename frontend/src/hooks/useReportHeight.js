import { useCallback, useEffect, useRef } from 'react';

/**
 * Mesure en continu la hauteur d'un élément (ResizeObserver) et la transmet à `onHeight`.
 * Renvoie une ref callback à poser sur l'élément ; 0 est transmis quand il disparaît.
 */
export default function useReportHeight(onHeight) {
    const observerRef = useRef(null);
    const onHeightRef = useRef(onHeight);
    onHeightRef.current = onHeight;

    const ref = useCallback((node) => {
        const report = (value) => onHeightRef.current?.(Math.ceil(value));
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!node) {
            report(0);
            return;
        }
        report(node.getBoundingClientRect().height);
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => report(node.getBoundingClientRect().height));
        observer.observe(node);
        observerRef.current = observer;
    }, []);

    useEffect(() => () => {
        observerRef.current?.disconnect();
        onHeightRef.current?.(0);
    }, []);

    return ref;
}
