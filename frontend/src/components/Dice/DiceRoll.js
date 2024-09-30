import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as Dice from './Dice';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import DiceColor from './DiceColor'

const loader = new OBJLoader();
const textureLoader = new THREE.TextureLoader();
const floorTexture = textureLoader.load('/texture/floor/wood.jpg')
const diffuseMap = textureLoader.load('/model/dice/dice.png')


const DiceRoll = ({ nb, color, socket }) => {
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
    socket.on('rollDice', (nb) => {
      if (nb < diceArray.current.length) {
        let dice = diceArray.current.pop();
        sceneRef.current.remove(dice.mesh);
        physicsWorldRef.current.removeBody(dice.body);
      }
      Dice.throwDice(diceArray.current);
    });
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
    cameraRef.current.position.set(0, 1, -0.7).multiplyScalar(7);
    cameraRef.current.lookAt(new THREE.Vector3(0, 0, 2))
    updateSceneSize();

    // Ajout des lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    sceneRef.current.add(ambientLight);
    const topLight = new THREE.PointLight(0xffffff, 20);
    topLight.position.set(10, 15, -2);
    topLight.castShadow = true;
    sceneRef.current.add(topLight);

    // Paramètres de la caméra
    const fov = cameraRef.current.fov; // Champ de vision vertical en degrés (55)
    const aspect = window.innerWidth / window.innerHeight; // Ratio d'aspect
    const zDistance = 3.8 - cameraRef.current.position.z; // Distance entre la caméra et z = 2
    const fovInRadians = (fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(fovInRadians / 2) * zDistance;
    const visibleWidth = visibleHeight * aspect;

    // Sol à y = -1.5
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, -1.5, 0);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Plan horizontal
    physicsWorldRef.current.addBody(groundBody);

    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(80, 80);
    const groundGeometry = new THREE.PlaneGeometry(400, 400); // 20x20 unités de sol, à ajuster selon ta scène

    const groundMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      side: THREE.DoubleSide 
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2; // Rotation pour aligner le plan horizontalement
    groundMesh.position.set(0, -1.5, 0); // Positionner le sol à y = -1.5
    sceneRef.current.add(groundMesh);

    // Mur gauche à x = -visibleWidth/2
    const leftWallShape = new CANNON.Plane();
    const leftWallBody = new CANNON.Body({ mass: 0 });
    leftWallBody.addShape(leftWallShape);
    leftWallBody.position.set(-visibleWidth/2, 0, 0);
    leftWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0); // Plan vertical
    physicsWorldRef.current.addBody(leftWallBody);

    // Mur droit à x = 2
    const rightWallShape = new CANNON.Plane();
    const rightWallBody = new CANNON.Body({ mass: 0 });
    rightWallBody.addShape(rightWallShape);
    rightWallBody.position.set(visibleWidth/2, 0, 0);
    rightWallBody.quaternion.setFromEuler(0, -Math.PI / 2, 0); // Plan vertical
    physicsWorldRef.current.addBody(rightWallBody);

    // Mur arrière à z = -2.5
    const backWallShape = new CANNON.Plane();
    const backWallBody = new CANNON.Body({ mass: 0 });
    backWallBody.addShape(backWallShape);
    backWallBody.position.set(0, 0, -2.5);
    backWallBody.quaternion.setFromEuler(0, 0, 0); // Plan vertical
    physicsWorldRef.current.addBody(backWallBody);

    // Mur avant à z = 7
    const frontWallShape = new CANNON.Plane();
    const frontWallBody = new CANNON.Body({ mass: 0 });
    frontWallBody.addShape(frontWallShape);
    frontWallBody.position.set(0, 0, 9);
    frontWallBody.quaternion.setFromEuler(0, Math.PI, 0); // Plan vertical
    physicsWorldRef.current.addBody(frontWallBody);


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
        diceArray.current.push(Dice.createDice(object, sceneRef.current, physicsWorldRef.current, socket));
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
