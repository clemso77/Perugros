import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as Dice from './Dice';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import DiceColor from './DiceColor'

const loader = new OBJLoader();
const textureLoader = new THREE.TextureLoader();
const diffuseMap = textureLoader.load('/model/dice/dice.png')


function createWall(position, quaternion, physicsWorldRef) {


  const wallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
  wallBody.position.copy(position);
  wallBody.quaternion.copy(quaternion);
  physicsWorldRef.current.addBody(wallBody);
}

const DiceRoll = ({ diceValue, nb, color, socket }) => {
  const physicsWorldRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const diceArray = useRef([]);
  const [diceColor, setDiceColor] = useState("#ffffff");

  const updateSceneSize = () => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const initPhysics = () => {
    const physicsWorld = new CANNON.World({
      allowSleep: true,
      gravity: new CANNON.Vec3(0, -50, 0),
    });
    physicsWorld.defaultContactMaterial.restitution = 0.3;
    return physicsWorld;
  };

  const render = () => {
    physicsWorldRef.current.fixedStep();

    diceArray.current.forEach((des) => {
      des.mesh.position.copy(des.body.position);
      des.mesh.quaternion.copy(des.body.quaternion);
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestAnimationFrame(render);
  };

  useEffect(() => {
    if (physicsWorldRef.current != null) {
      return;
    }
    physicsWorldRef.current = initPhysics();
    rendererRef.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      toneMapped: false,
      canvas: document.querySelector('#canvas'),
    });
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
    cameraRef.current.position.set(0, 1.3, -0.5).multiplyScalar(7);
    cameraRef.current.lookAt(new THREE.Vector3(0, 0, 2))
    // Mise à jour de la taille de la scène
    updateSceneSize();

    // Ajout des lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    sceneRef.current.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, 20);
    topLight.position.set(10, 15, -2);
    topLight.castShadow = true;
    sceneRef.current.add(topLight);

    // Création du sol
    const solPosition = new THREE.Vector3(0, -1.5, 0);
    const solQuaternon = new THREE.Quaternion();
    solQuaternon.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * 0.5);
    createWall(solPosition, solQuaternon, physicsWorldRef);


    // Mur droit (z = -0.5)
    const rightWallPosition = new THREE.Vector3(-3, -2, -50);
    const rightWallQuaternion = new THREE.Quaternion();
    rightWallQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.5);
    createWall(rightWallPosition, rightWallQuaternion, physicsWorldRef);

    // Création du mur de davant
    const frontWallPosition = new THREE.Vector3(-5, -2, -2.8);
    const frontWallQuaternion = new THREE.Quaternion();
    frontWallQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.5);
    createWall(frontWallPosition, frontWallQuaternion, physicsWorldRef);
 

    const textureMaterial = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      color: new THREE.Color(color)
    }, []);

    loader.load('/model/dice/dice_model.obj', (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          const edges = new THREE.EdgesGeometry(child.geometry);
          const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // Black color for the edges
          const edgeMesh = new THREE.LineSegments(edges, edgeMaterial);

          // Add edge mesh to the same position as the child
          edgeMesh.position.copy(child.position);
          edgeMesh.rotation.copy(child.rotation);
          edgeMesh.scale.copy(child.scale);

          // Add edges as a child of the dice mesh
          child.add(edgeMesh);
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = textureMaterial;
        }
      });
      for (let i = 0; i < nb && i < 5; i++) {
        diceArray.current.push(Dice.createDice(object, sceneRef.current, physicsWorldRef.current));
      }
    },
      undefined,
      (error) => {
        console.error('Erreur de chargement du modèle OBJ:', error);
      });
    render();
    // Gestion du redimensionnement
    window.addEventListener('resize', updateSceneSize);

    return () => {
      window.removeEventListener('resize', updateSceneSize);
    };
  });

  useEffect(() => {
    if (diceValue !== null) {
      Dice.throwDice(diceArray.current);
    }
  }, [diceValue]);

  useEffect(() => {
    setDiceColor(color);
    changeColor(color);
  }, [color]);

  const changeColor = (c) => {
    setDiceColor(c);
    const textureMaterial = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      color: new THREE.Color(c)
    });

    // Update the material of each dice mesh
    if (diceArray.current) {
      diceArray.current.forEach((dice, idx) => {
        if (dice && dice.mesh) {
          dice.mesh.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.material) {
                child.material.dispose();
              }
              child.material = textureMaterial;
            }
          });
        }
      });
      Dice.throwDice(diceArray.current);
    }

  }

  return (
    <>
      <div className="canvas-container">
        <canvas id="canvas"></canvas>
      </div>
      <DiceColor
        socket={socket}
        diceColor={diceColor}
        setDiceColor={changeColor}
      />
    </>
  );
  
};

export default DiceRoll;
