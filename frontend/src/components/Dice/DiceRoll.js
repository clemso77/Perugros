import React, {useEffect, useRef, useState} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const floorPosition=1.3-5
const VISIBLE_WIDTH = 6;
const SEGMENT_COUNT = 16;


const DiceRoll = ({ nb, socket, color, setIsLoading}) => {
  const diceArray = useRef([]);  // Utilisé pour stocker la référence aux dés
  const worldRef = useRef(null); // Stocker le monde Cannon.js
  const [sceneReady, setSceneReady] = useState(false); // Indiquer si les dés sont prêts
  const { scene: diceModel } = useGLTF('/model/dice/dice.glb'); // Charger le modèle GLB
  useEffect(() => {
      worldRef.current = new CANNON.World({
        allowSleep: true,
        gravity: new CANNON.Vec3(0, -10, 0),
    });

    // Sol à y = 1.3
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, floorPosition, 0);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Plan horizontal
    worldRef.current.addBody(groundBody);


    const createCircularWalls = (world, visibleWidth, numWalls) => {
      const radius = visibleWidth / 2;  // Rayon du cercle
      const angleStep = (2 * Math.PI) / numWalls; // L'angle entre chaque mur

      for (let i = 0; i < numWalls; i++) {
        const angle = i * angleStep;
        const x = radius * Math.cos(angle);  // Position en x sur la circonférence
        const z = radius * Math.sin(angle);  // Position en z sur la circonférence

        // Créer le mur (plane) pour ce segment
        const wallShape = new CANNON.Plane();
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);

        // Positionner le mur sur la circonférence
        wallBody.position.set(x, floorPosition, z);

        // Orienter le mur pour qu'il fasse face au centre du cercle
        const wallRotation = angle + Math.PI / 2; // Tourner le mur pour qu'il soit perpendiculaire au rayon
        wallBody.quaternion.setFromEuler(0, -wallRotation, 0); // Ajuster l'angle

        // Ajouter le mur au monde physique
        world.addBody(wallBody);
      }
    };

    createCircularWalls(worldRef.current, VISIBLE_WIDTH, SEGMENT_COUNT);

    // Créer des dés

    setSceneReady(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => {
        worldRef.current.bodies.forEach(body => worldRef.current.removeBody(body));
        worldRef.current = null;
        diceArray.current = [];
    }
  }, [socket, setIsLoading]);

  useEffect(() => {
      const newDiceArray = [];
      for (let i = 0; i < nb; i++) {
          addDice(worldRef.current, newDiceArray, diceModel, i, '#ffffff');
      }
      diceArray.current = newDiceArray;
  }, [nb, diceModel])

  useEffect(() => {
    if (diceArray.current) {
        applyColorToDice(diceArray.current, color);
    }
  socket.on('rollDice', (nb) => {
      console.log("Roll dice : ", nb);
      diceArray.current.forEach(({ body }) => worldRef.current.removeBody(body));
      diceArray.current = [];

      for (let i = 0; i < nb; i++) {
          addDice(worldRef.current, diceArray.current, diceModel, i, color);
      }
      addDiceEvents(diceArray.current, socket);
      applyColorToDice(diceArray.current, color);
      throwDice(diceArray.current);
    });
    return () => {
      socket.off('rollDice');
    }
  }, [color, socket, diceModel]);

  useEffect(() => {
      socket.on('clearDice', () => {
          diceArray.current.forEach(({ mesh, body }) => {
              worldRef.current.removeBody(body);
              mesh.parent?.remove(mesh);
          })
          diceArray.current = [];
          console.log("Clear dice");
      });

      socket.on('showDice', (data) => {
          addDice(worldRef.current, diceArray.current, diceModel, diceArray.current.length, data.color);
          let dice = diceArray.current[diceArray.current.length -1];
          console.log("Show dice : ", data.value +" "+diceArray.current.length);
          showDice(dice, data.value);
      })
      return () => {
          socket.off('clearDice');
          socket.off('showDice');
      }
  }, [socket, diceModel])

  useFrame(() => {
    if (worldRef.current && sceneReady) {
      worldRef.current.fixedStep(); // Simulation physique à 60 FPS indépendante
      diceArray.current.forEach(({ mesh, body }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        mesh.needsUpdate = true;
      });
    }
  });

  return (
    <>
      {sceneReady && (
        <>
          {diceArray.current.map((dice, index) => (
            <primitive key={index} object={dice.mesh} scale={[1, 1, 1]} castShadow receiveShadow />
          ))}
        </>
      )}
    </>
  );
};

function addDiceEvents(diceArray, socket) {
  diceArray.forEach((dice) => {
    dice.body.addEventListener('sleep', (e) => {
      dice.body.allowSleep = false;

      const euler = new CANNON.Vec3();
      e.target.quaternion.toEuler(euler);
      const eps = 0.1;
      let isZero = (angle) => Math.abs(angle) < eps;
      let isHalfPi = (angle) => Math.abs(angle - 0.5 * Math.PI) < eps;
      let isMinusHalfPi = (angle) => Math.abs(0.5 * Math.PI + angle) < eps;
      let isPiOrMinusPi = (angle) => Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps;

      // Détection de la face en fonction des angles
      if (isZero(euler.z)) {
        if (isZero(euler.x)) {
          socket.emit('diceRolled', 2);
        } else if (isHalfPi(euler.x)) {
          socket.emit('diceRolled', 6);
        } else if (isMinusHalfPi(euler.x)) {
          socket.emit('diceRolled', 5);
        } else if (isPiOrMinusPi(euler.x)) {
          socket.emit('diceRolled', 3);
        } else {
          let arr = [];
          arr.push(dice);
          throwDice(arr);
        }
      } else if (isHalfPi(euler.z)) {
        socket.emit('diceRolled', 1);
      } else if (isMinusHalfPi(euler.z)) {
        socket.emit('diceRolled', 4);
      } else {
        let arr = [];
        arr.push(dice);
        throwDice(arr);
      }
    });
  })
}

function throwDice(diceArray) {
  diceArray.forEach((dice, idx) => {

    dice.body.velocity.setZero();  // Réinitialiser la vitesse
    dice.body.angularVelocity.setZero();  // Réinitialiser la rotation
    dice.body.position = new CANNON.Vec3(
      Math.random() - 0.5, // Position x ajustée, plus proche du centre
      idx * 1.5 + floorPosition + 10,       // Position y espacée pour chaque dé
      Math.random() - 0.5
    );
    dice.mesh.position.copy(dice.body.position);  // Copier la position dans le mesh
    const initialRotation = new THREE.Euler(
      Math.random() * Math.PI, // Rotation contrôlée, réduite à +/- 90°
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dice.mesh.rotation.copy(initialRotation);
    dice.body.quaternion.copy(dice.mesh.quaternion);  // Copier la rotation dans le corps physique

    // Appliquer une impulsion pour lancer le dé avec direction aléatoire
    const force = 4 + Math.random() * 7.5;

    // Appliquer l'impulsion avec les directions aléatoires
    dice.body.allowSleep = true;  // Permettre au dé de "dormir" après avoir arrêté de bouger
    dice.body.applyImpulse(new CANNON.Vec3(0, -force, 0));
  });
}

function addDice(world, diceArray, diceModel, i, color) {
    const diceMesh = diceModel.clone(true);
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, floorPosition+0.25 + i * 0.5, 0),
    });
    const boundingBox = new THREE.Box3().setFromObject(diceMesh);
    let size = new THREE.Vector3();
    boundingBox.getSize(size);
    size = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    body.addShape(new CANNON.Box(size));
    body.sleep();
    world.addBody(body);
    diceMesh.traverse((child) => {
        if(child.isMesh && child.material){
            child.material = child.material.clone();
            child.material.color = new THREE.Color(color);
            child.needsUpdate = true;
        }
    })
    diceArray.push({ mesh: diceMesh, body });
}

function showDice(dice, value) {
    dice.body.velocity.setZero();  // Réinitialiser la vitesse
    dice.body.angularVelocity.setZero();  // Réinitialiser la rotation
    dice.body.position = new CANNON.Vec3(
        Math.random() - 0.5, // Position x ajustée, plus proche du centre
        5 + floorPosition + 10,       // Position y espacée pour chaque dé
        Math.random() - 0.5
    );
    dice.mesh.position.copy(dice.body.position);  // Copier la position dans le mesh

    const roc= eulerForFace(value);
    const initialRotation = new THREE.Euler(roc.x, roc.y, roc.z);
    dice.mesh.rotation.copy(initialRotation);
    dice.body.quaternion.copy(dice.mesh.quaternion);  // Copier la rotation dans le corps physique


    dice.body.allowSleep = true;  // Permettre au dé de "dormir" après avoir arrêté de bouger
    dice.body.applyImpulse(new CANNON.Vec3(0, -2, 0));
}

function eulerForFace(value) {
    switch (value) {
        case 6: return { x: 0, y: 0, z: 0 };
        case 3: return { x: +Math.PI / 2, y: 0, z: 0 };
        case 4: return { x: -Math.PI / 2, y: 0, z: 0 };
        case 1: return { x: Math.PI, y: 0, z: 0 };
        case 5: return { x: 0, y: 0, z: +Math.PI / 2 };
        case 2: return { x: 0, y: 0, z: -Math.PI / 2 };
        default: return { x: 0, y: 0, z: 0 }; // défaut: 6
    }
}

function applyColorToDice(dices, color) {
    for(let i=0; i<dices.length; i++){
        let dice = dices[i];
        dice.mesh.traverse((child) => {
           if(child.isMesh && child.material){
               child.material.color.set(color);
               child.needsUpdate = true;
           }
       })
    };
}


export default DiceRoll;
