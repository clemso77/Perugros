import React, { useEffect, useMemo, useState } from "react";

const rand = (min, max) => Math.random() * (max - min) + min;

export default function LiarResultOverlay({ visible, payload, onDone, durationMs = 4500 }) {
    const [tick, setTick] = useState(0);

    const sparks = useMemo(
        () =>
            Array.from({ length: 22 }).map((_, i) => ({
                id: i,
                left: rand(8, 92),
                top: rand(12, 88),
                delay: rand(0, 500),
                size: rand(4, 10),
                driftX: rand(-90, 90),
                driftY: rand(-90, 90),
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tick]
    );

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => onDone?.(), durationMs);
        return () => clearTimeout(t);
    }, [visible, durationMs, onDone]);

    useEffect(() => {
        if (visible) setTick((x) => x + 1);
    }, [visible]);

    if (!visible) return null;

    const challenger = payload?.challenger ?? "Quelqu’un";
    const diceCount = payload?.diceCount ?? "?";
    const diceValue = payload?.diceValue ?? "?";
    const success = !!payload?.success;
    const total = payload?.total ?? "?";

    return (
        <div
            className={`liar-overlay liar-result ${success ? "liar-success" : "liar-fail"}`}
            role="dialog"
            aria-label="Résultat menteur"
        >
            <div className="liar-backdrop" />
            <div className="liar-card">
                <div className="liar-title">{success ? "BIEN VU !" : "FAUX !"}</div>

                <div className="liar-sub">
                    <span className="liar-name">{challenger}</span>{" "}
                    {success ? "avait raison" : "s’est trompé"}
                </div>

                <div className="liar-bet">
                    <span className="liar-pill">{diceCount}</span>
                    <span className="liar-x">×</span>
                    <span className="liar-pill">{diceValue}</span>
                </div>

                <div className="liar-hint">
                    {success ? "Le pari était trop haut." : "Le pari était correct."}
                    <br></br>
                    Nombre de dés: {total}
                </div>

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
