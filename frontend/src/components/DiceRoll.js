import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const DiceRoll = ({ diceValue, nb }) => {
  const physicsWorldRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const diceArray = useRef([]);
  const [numberOfDice, setNumberOfDice] = useState(nb);

  const createDice = (diceMesh) => {
    const mesh = diceMesh.clone();
    sceneRef.current.add(mesh);

    const body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      sleepTimeLimit: 0.1,
    });
    physicsWorldRef.current.addBody(body);

    return { mesh, body };
  };

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

  const throwDice = () => {
    diceArray.current.forEach((dice, idx) => {
      dice.body.velocity.setZero();
      dice.body.angularVelocity.setZero();
      dice.body.position = new CANNON.Vec3(6, idx * 1.5, 0);
      dice.mesh.position.copy(dice.body.position);

      dice.mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
      dice.body.quaternion.copy(dice.mesh.quaternion);

      const force = 3 + Math.random() * 5;
      dice.body.applyImpulse(new CANNON.Vec3(-force, force, 0), new CANNON.Vec3(0, 0, 0.2));
    });
  };

  useEffect(() => {
    // Initialisation du monde physique et de la scène
    physicsWorldRef.current = initPhysics();
    rendererRef.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: document.querySelector('#canvas'),
    });
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
    cameraRef.current.position.set(0, 0.5, 4).multiplyScalar(7);

    // Mise à jour de la taille de la scène
    updateSceneSize();

    // Ajout des lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, 0.3);
    topLight.position.set(10, 15, 0);
    topLight.castShadow = true;
    sceneRef.current.add(topLight);

    // Création du sol
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.ShadowMaterial({ opacity: 0.1 }));
    floor.receiveShadow = true;
    floor.position.y = 0;
    floor.quaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * 0.5);
    sceneRef.current.add(floor);

    const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    floorBody.position.copy(floor.position);
    floorBody.quaternion.copy(floor.quaternion);
    physicsWorldRef.current.addBody(floorBody);

    const loader = new OBJLoader();
    
    // Chargement des textures
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load('/model/dice/normal_map.png'); // Remplacez par le chemin vers votre normal map
    const diffuseMap = textureLoader.load('/model/dice/dice.png'); // Remplacez par le chemin vers votre diffuse map

    loader.load('/model/dice/dice_model.obj', (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Appliquer les textures
          child.material = new THREE.MeshStandardMaterial({
            map: diffuseMap,
            normalMap: normalMap
          });
          
        }
      });

      for (let i = 0; i < numberOfDice; i++) {
        diceArray.current.push(createDice(object));
      }
    }, 
    undefined, // Optionnel : fonction de progression
    (error) => {
      console.error('Erreur de chargement du modèle OBJ:', error);
    });

    // Boucle de rendu
    const render = () => {
      physicsWorldRef.current.fixedStep();

      diceArray.current.forEach((dice) => {
        dice.mesh.position.copy(dice.body.position);
        dice.mesh.quaternion.copy(dice.body.quaternion);
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(render);
    };
    render();

    // Gestion du redimensionnement
    window.addEventListener('resize', updateSceneSize);

    return () => {
      window.removeEventListener('resize', updateSceneSize);
    };
  }, [numberOfDice]);

  useEffect(() => {
    if (diceValue !== null) {
      throwDice();
    }
  }, [diceValue]);

  return <canvas id="canvas"></canvas>;
};

export default DiceRoll;
