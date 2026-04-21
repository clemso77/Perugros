import React, { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const floorPosition = 1.3 - 5;
const VISIBLE_WIDTH = 6;
const SEGMENT_COUNT = 16;

const DiceRoll = ({ nb, socket, color, setIsLoading }) => {
    const diceArray = useRef([]);
    const worldRef = useRef(null);
    const [sceneReady, setSceneReady] = useState(false);
    const [, setDiceCount] = useState(0);
    const { scene: diceModel } = useGLTF('/model/dice/dice.glb');

    useEffect(() => {
        worldRef.current = new CANNON.World({
            allowSleep: true,
            gravity: new CANNON.Vec3(0, -10, 0),
        });

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.position.set(0, floorPosition, 0);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        worldRef.current.addBody(groundBody);

        createCircularWalls(worldRef.current, VISIBLE_WIDTH, SEGMENT_COUNT);
        setSceneReady(true);

        const loadingTimer = setTimeout(() => setIsLoading(false), 500);

        return () => {
            clearTimeout(loadingTimer);
            clearAllDice(worldRef.current, diceArray.current);
            worldRef.current?.bodies?.slice().forEach((body) => worldRef.current.removeBody(body));
            worldRef.current = null;
            setSceneReady(false);
        };
    }, [setIsLoading]);

    useEffect(() => {
        if (!worldRef.current || !diceModel) return;

        clearAllDice(worldRef.current, diceArray.current);
        const newDiceArray = [];
        for (let i = 0; i < nb; i++) {
            addDice(worldRef.current, newDiceArray, diceModel, i, '#ffffff');
        }
        diceArray.current = newDiceArray;
        setDiceCount(nb);
    }, [nb, diceModel]);

    useEffect(() => {
        if (diceArray.current?.length) {
            applyColorToDice(diceArray.current, color);
        }

        const onRollDice = (nextCount) => {
            const targetCount = Number(nextCount);
            if (!worldRef.current || !Number.isFinite(targetCount) || targetCount < 0) return;

            if (targetCount < diceArray.current.length) {
                for (let i = diceArray.current.length - 1; i >= targetCount; i--) {
                    removeSingleDie(worldRef.current, diceArray.current[i]);
                    diceArray.current.pop();
                }
            }
            for (let i = diceArray.current.length; i < targetCount; i++) {
                addDice(worldRef.current, diceArray.current, diceModel, i, color);
            }

            addDiceEvents(diceArray.current, socket);
            applyColorToDice(diceArray.current, color);
            throwDice(diceArray.current);
            setDiceCount(targetCount);
        };

        socket.on('rollDice', onRollDice);
        return () => {
            socket.off('rollDice', onRollDice);
        };
    }, [color, socket, diceModel]);

    useEffect(() => {
        const onClearDice = () => {
            clearAllDice(worldRef.current, diceArray.current);
            setDiceCount(0);
        };

        const onShowDice = (data) => {
            if (!worldRef.current || !diceModel) return;
            addDice(worldRef.current, diceArray.current, diceModel, diceArray.current.length, data.color);
            const dice = diceArray.current[diceArray.current.length - 1];
            showDice(dice, data.value);
            setDiceCount(diceArray.current.length);
        };

        socket.on('clearDice', onClearDice);
        socket.on('showDice', onShowDice);
        return () => {
            socket.off('clearDice', onClearDice);
            socket.off('showDice', onShowDice);
        };
    }, [socket, diceModel]);

    useFrame(() => {
        if (!worldRef.current || !sceneReady) return;
        worldRef.current.fixedStep();
        diceArray.current.forEach(({ mesh, body }) => {
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
            mesh.needsUpdate = true;
        });
    });

    return (
        <>
            {sceneReady &&
                diceArray.current.map((dice, index) => (
                    <primitive key={index} object={dice.mesh} scale={[1, 1, 1]} castShadow receiveShadow />
                ))}
        </>
    );
};

function createCircularWalls(world, visibleWidth, numWalls) {
    const radius = visibleWidth / 2;
    const angleStep = (2 * Math.PI) / numWalls;

    for (let i = 0; i < numWalls; i++) {
        const angle = i * angleStep;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        const wallShape = new CANNON.Plane();
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);
        wallBody.position.set(x, floorPosition, z);
        wallBody.quaternion.setFromEuler(0, -(angle + Math.PI / 2), 0);
        world.addBody(wallBody);
    }
}

function removeSingleDie(world, dice) {
    if (!dice) return;
    if (dice.rerollTimer) {
        clearTimeout(dice.rerollTimer);
        dice.rerollTimer = null;
    }
    if (world?.bodies?.includes(dice.body)) {
        world.removeBody(dice.body);
    }
    dice.mesh?.parent?.remove(dice.mesh);
}

function clearAllDice(world, diceList) {
    diceList.forEach((dice) => removeSingleDie(world, dice));
    diceList.length = 0;
}

function addDiceEvents(diceArray, socket) {
    diceArray.forEach((dice) => {
        if (dice.hasSleepListener) return;
        dice.hasSleepListener = true;

        dice.body.addEventListener('sleep', (event) => {
            dice.body.allowSleep = false;
            if (dice.rerollTimer) {
                clearTimeout(dice.rerollTimer);
                dice.rerollTimer = null;
            }

            const euler = new CANNON.Vec3();
            event.target.quaternion.toEuler(euler);
            const eps = 0.1;
            const isZero = (angle) => Math.abs(angle) < eps;
            const isHalfPi = (angle) => Math.abs(angle - 0.5 * Math.PI) < eps;
            const isMinusHalfPi = (angle) => Math.abs(0.5 * Math.PI + angle) < eps;
            const isPiOrMinusPi = (angle) => Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps;

            if (isZero(euler.z)) {
                if (isZero(euler.x)) socket.emit('diceRolled', 2);
                else if (isHalfPi(euler.x)) socket.emit('diceRolled', 6);
                else if (isMinusHalfPi(euler.x)) socket.emit('diceRolled', 5);
                else if (isPiOrMinusPi(euler.x)) socket.emit('diceRolled', 3);
                else throwDice([dice]);
            } else if (isHalfPi(euler.z)) {
                socket.emit('diceRolled', 1);
            } else if (isMinusHalfPi(euler.z)) {
                socket.emit('diceRolled', 4);
            } else {
                throwDice([dice]);
            }
        });
    });
}

function throwDice(diceArray) {
    diceArray.forEach((dice, idx) => {
        if (dice.rerollTimer) clearTimeout(dice.rerollTimer);
        dice.body.velocity.setZero();
        dice.body.angularFactor.set(1, 1, 1);
        dice.body.linearFactor.set(1, 1, 1);
        dice.body.position = new CANNON.Vec3(Math.random() - 0.5, idx * 1.5 + floorPosition + 10, Math.random() - 0.5);
        dice.mesh.position.copy(dice.body.position);

        const initialRotation = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dice.mesh.rotation.copy(initialRotation);
        dice.body.quaternion.copy(dice.mesh.quaternion);

        const force = 4 + Math.random() * 7.5;
        dice.body.allowSleep = true;
        dice.body.applyImpulse(new CANNON.Vec3(0, -force, 0));

        dice.rerollTimer = setTimeout(() => {
            if (dice.body.sleepState !== CANNON.Body.SLEEPING) {
                throwDice([dice]);
            }
        }, 6000);
    });
}

function addDice(world, diceArray, diceModel, i, color) {
    const diceMesh = diceModel.clone(true);
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, floorPosition + 0.25 + i * 0.5, 0),
    });
    const boundingBox = new THREE.Box3().setFromObject(diceMesh);
    let size = new THREE.Vector3();
    boundingBox.getSize(size);
    size = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    body.addShape(new CANNON.Box(size));
    body.sleep();
    world.addBody(body);

    diceMesh.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.color = new THREE.Color(color);
            child.needsUpdate = true;
        }
    });

    diceArray.push({ mesh: diceMesh, body, rerollTimer: null, hasSleepListener: false });
}

function showDice(dice, value) {
    dice.body.velocity.setZero();
    dice.body.angularVelocity.setZero();
    dice.body.position.set(Math.random() * 3 - 1.5, floorPosition + 15, Math.random() * 3 - 1.5);
    dice.mesh.position.copy(dice.body.position);

    const rot = eulerForFace(value);
    const q = new CANNON.Quaternion();
    q.setFromEuler(rot.x, rot.y, rot.z, 'XYZ');

    dice.body.quaternion.copy(q);
    dice.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    dice.body.angularFactor.set(0, 0, 0);
    dice.body.angularVelocity.set(0, 0, 0);
    dice.body.linearFactor.set(0, 1, 0);
    dice.body.allowSleep = false;
    dice.body.wakeUp();
    dice.body.applyImpulse(new CANNON.Vec3(0, -2, 0));
}

function eulerForFace(value) {
    switch (value) {
        case 2:
            return { x: 0, y: 0, z: 0 };
        case 6:
            return { x: +Math.PI / 2, y: 0, z: 0 };
        case 5:
            return { x: -Math.PI / 2, y: 0, z: 0 };
        case 3:
            return { x: Math.PI, y: 0, z: 0 };
        case 1:
            return { x: 0, y: 0, z: +Math.PI / 2 };
        case 4:
            return { x: 0, y: 0, z: -Math.PI / 2 };
        default:
            return { x: 0, y: 0, z: 0 };
    }
}

function applyColorToDice(dices, color) {
    dices.forEach((dice) => {
        dice.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.color.set(color);
                child.needsUpdate = true;
            }
        });
    });
}

export default DiceRoll;
