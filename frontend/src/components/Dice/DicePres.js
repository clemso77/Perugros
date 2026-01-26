import React, { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';


const DicePres = ({ face }) => {
    const [dice, setDice] = useState(null);
    const { scene: diceModel } = useGLTF('/model/dice/dice.glb');

    const rotationTargets = {
        4: new THREE.Euler(0, Math.PI / 2, 0), // Face 1
        3: new THREE.Euler(-Math.PI / 2, 0, 0), // Face 2
        6: new THREE.Euler(0, Math.PI, 0), // Face 3
        5: new THREE.Euler(0, 0, Math.PI / 2), // Face 4
        2: new THREE.Euler(Math.PI / 2, Math.PI, 0), // Face 5
        1: new THREE.Euler(0, -Math.PI / 2, 0), // Face 1
    };

    useEffect(() => {
        const clonedDice = diceModel.clone(true);
        setDice(clonedDice);
    }, [diceModel]);

    useFrame(() => {
        if (dice) {
            const targetRotation = rotationTargets[face];
            if (targetRotation) {
                // Smoothly interpolate to the target rotation
                dice.rotation.x += (targetRotation.x - dice.rotation.x) * 0.1;
                dice.rotation.y += (targetRotation.y - dice.rotation.y) * 0.1;
                dice.rotation.z += (targetRotation.z - dice.rotation.z) * 0.1;
            }
        }
    });

    return (
        <>
            {dice &&
                <primitive
                    object={dice}
                    position={[0,0,0]}
                    scale={[1, 1, 1]}
                    castShadow
                    receiveShadow />
            }
        </>
    );
};

export default DicePres;
