import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';

const CameraAnimated = (isConnected) => {
    const cameraRef = useRef();
    const [animationComplete, setAnimationComplete] = useState(false);
    const targetPosition = [0, 0, 10]; // Position cible de la caméra
    const position = isConnected? targetPosition : [0, 38, 48]
    useFrame(() => {
        if (!animationComplete && cameraRef.current && !isConnected) {
            const { position } = cameraRef.current;
            position.y = Math.max(position.y - 0.15, targetPosition[1]);
            position.z = Math.min(position.z + 0.15, targetPosition[2]);

            if (position.y <= targetPosition[1] && position.z >= targetPosition[2]) {
                setAnimationComplete(true);
            }
        }
    });

    return (
        <PerspectiveCamera
            makeDefault
            ref={cameraRef}
            position={position} 
            fov={70}
        />
    );
};

export default CameraAnimated;