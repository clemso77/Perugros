import React, { useEffect, useMemo } from "react";

const rand = (min, max) => Math.random() * (max - min) + min;

export default function EndScreenOverlay({ visible, payload, onDone, durationMs = 5000 }) {
    const isLose = !!payload?.lose;
    const name = payload?.name ?? "";

    // Confettis seulement en victoire
    const confettis = useMemo(() => {
        if (isLose) return [];
        return Array.from({ length: 90 }).map((_, i) => ({
            id: i,
            left: rand(0, 100),
            delay: rand(0, 600),
            size: rand(6, 12),
            spin: rand(320, 880),
            drift: rand(-220, 220),
            fall: rand(900, 1500),
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLose, visible]);

    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => onDone?.(), durationMs);
        return () => clearTimeout(t);
    }, [visible, durationMs, onDone]);

    if (!visible) return null;

    return (
        <div
            className={`end-overlay ${isLose ? "end-lose" : "end-win"}`}
            role="dialog"
            aria-label={isLose ? "Défaite" : "Victoire"}
        >
            <div className="end-backdrop" />

            {!isLose && (
                <div className="confetti-layer" aria-hidden="true">
                    {confettis.map((c) => (
                        <span
                            key={c.id}
                            className="confetti"
                            style={{
                                left: `${c.left}%`,
                                width: `${c.size}px`,
                                height: `${c.size * 0.6}px`,
                                animationDelay: `${c.delay}ms`,
                                "--drift": `${c.drift}px`,
                                "--fall": `${c.fall}px`,
                                "--spin": `${c.spin}deg`,
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="end-card">
                <div className="end-title">{isLose ? "DÉFAITE" : "VICTOIRE !"}</div>
                <div className="end-sub">
                    {isLose ? (
                        <>
                            <span className="end-name">{name}</span> a perdu…
                        </>
                    ) : (
                        <>
                            GG <span className="end-name">{name}</span> !
                        </>
                    )}
                </div>

                <div className="end-hint">
                    {isLose ? "On revient plus fort au prochain tour." : "Ça mérite une tournée de dés !"}
                </div>

                <button className="end-btn" onClick={onDone}>
                    {isLose ? "OK…" : "LET'S GO"}
                </button>
            </div>
        </div>
    );
}
