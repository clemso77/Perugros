import React, { useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';

const BASE_FOV = 70;
const MAX_FOV = 95;
// Demi-largeur de la piste de dés (rayon 3 + marge) à garder visible, à la distance de la caméra
const TRAY_HALF_WIDTH = 4;
const TRAY_DISTANCE = 9;

/** Sur un écran étroit (téléphone en portrait), élargit le champ de vision pour garder toute la piste. */
function fovForAspect(aspect) {
    if (!aspect || !Number.isFinite(aspect)) return BASE_FOV;
    const needed = 2 * Math.atan(TRAY_HALF_WIDTH / TRAY_DISTANCE / aspect) * 180 / Math.PI;
    return Math.min(MAX_FOV, Math.max(BASE_FOV, needed));
}

const CameraAnimated = (({ isConnected, targetPosition }) => {
    const cameraRef = useRef();
    const [animationComplete, setAnimationComplete] = useState(false);
    const { size } = useThree();
    const fov = fovForAspect(size.width / size.height);

    useLayoutEffect(() => {
        const camera = cameraRef.current;
        if (!camera) return;
        camera.fov = fov;
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
    }, [fov, size.width, size.height]);

    useFrame(() => {
        if (!animationComplete && cameraRef.current) {
            const { position } = cameraRef.current;

            // Animate the camera towards the target position
            position.y = Math.max(position.y - 0.15, targetPosition[1]);
            position.z = Math.min(position.z + 0.15, targetPosition[2]);

            // Check if the animation is complete
            if (position.y <= targetPosition[1] && position.z >= targetPosition[2]) {
                setAnimationComplete(true);
            }
        }
    });

    return (
        <PerspectiveCamera
            makeDefault
            ref={cameraRef}
            position={isConnected ? targetPosition : [0, 38, 48]}
            fov={fov}
        />
    );
});

export default CameraAnimated;
