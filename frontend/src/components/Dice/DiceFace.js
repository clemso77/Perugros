import React from 'react';

const PIPS = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]]
};

function pipColor(hex) {
    const n = parseInt((hex || '#ffffff').slice(1), 16);
    const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return luminance > 0.55 ? '#222' : '#fff';
}

/**
 * Face de dé en SVG. Remplace le second <Canvas> 3D de l'écran de pari :
 * sur mobile (iOS surtout) chaque contexte WebGL coûte cher et en ouvrir/fermer
 * un à chaque tour peut faire planter l'onglet.
 */
export default function DiceFace({ value, color = '#ffffff', size = 56 }) {
    const pips = PIPS[value] || [];
    const fill = pipColor(color);
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={value ? `Dé ${value}` : 'Dé'}>
            <rect x="4" y="4" width="92" height="92" rx="20" fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="3" />
            {pips.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={value === 1 ? 13 : 9} fill={value === 1 ? '#d62828' : fill} />
            ))}
        </svg>
    );
}
