import React, { useEffect, useMemo, useState } from "react";

const rand = (min, max) => Math.random() * (max - min) + min;

export default function LiarOverlay({ visible, payload, onDone, durationMs = 5000 }) {
    const [tick, setTick] = useState(0);

    // Petites particules (CSS only)
    const sparks = useMemo(
        () =>
            Array.from({ length: 18 }).map((_, i) => ({
                id: i,
                left: rand(10, 90),
                top: rand(15, 85),
                delay: rand(0, 600),
                size: rand(4, 10),
                driftX: rand(-80, 80),
                driftY: rand(-80, 80),
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tick]
    );

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => onDone?.(), durationMs);
        return () => clearTimeout(t);
    }, [visible, durationMs, onDone]);

    // Re-roll particles each time overlay is shown
    useEffect(() => {
        if (visible) setTick((x) => x + 1);
    }, [visible]);

    if (!visible) return null;

    const challenger = payload?.challenger ?? "Quelqu’un";
    const diceCount = payload?.diceCount ?? "?";
    const diceValue = payload?.diceValue ?? "?";

    return (
        <div className="liar-overlay" role="dialog" aria-label="Menteur déclaré">
            <div className="liar-backdrop" />
            <div className="liar-card">
                <div className="liar-title">MENTEUR !</div>
                <div className="liar-sub">
                    <span className="liar-name">{challenger}</span> dénonce
                </div>
                <div className="liar-bet">
                    <span className="liar-pill">{diceCount}</span>
                    <span className="liar-x">×</span>
                    <span className="liar-pill">{diceValue}</span>
                </div>

                <div className="liar-hint">Révélation des dés…</div>

                <div className="liar-sparks">
                    {sparks.map((s) => (
                        <span
                            key={s.id}
                            className="liar-spark"
                            style={{
                                left: `${s.left}%`,
                                top: `${s.top}%`,
                                width: `${s.size}px`,
                                height: `${s.size}px`,
                                animationDelay: `${s.delay}ms`,
                                "--dx": `${s.driftX}px`,
                                "--dy": `${s.driftY}px`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
