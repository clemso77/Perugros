import * as CANNON from 'cannon-es';
import * as THREE from 'three';


// Fonction pour ajouter les événements au dé (détection de la face supérieure après le lancer)
function addDiceEvents(dice, socket) {
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
                socket.emit('diceRolled', 6);
            } else if (isHalfPi(euler.x)) {
                socket.emit('diceRolled', 3);
            } else if (isMinusHalfPi(euler.x)) {
                socket.emit('diceRolled', 4);
            } else if (isPiOrMinusPi(euler.x)) {
                socket.emit('diceRolled', 1);
            } else {
                let arr = [];
                arr.push(dice);
                throwDice(arr);
            }
        } else if (isHalfPi(euler.z)) {
            socket.emit('diceRolled', 5);
        } else if (isMinusHalfPi(euler.z)) {
            socket.emit('diceRolled', 2);
        } else {
            let arr = [];
            arr.push(dice);
            throwDice(arr);
        }
    });
}
function createDice(diceMesh, world, socket) {
    const mesh = diceMesh.clone(true);  // Cloner la géométrie du dé avec `true` pour cloner les enfants et matériaux
    mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),  // Forme de boîte pour correspondre au dé
        sleepTimeLimit: 0.1,
    });

    body.position = new CANNON.Vec3(0, 3, 0);
    world.addBody(body);  // Ajouter le corps au monde physique

    // Associer les événements du dé (optionnel)
    addDiceEvents({ mesh, body }, socket);

    return { mesh, body };
}


// Fonction pour lancer les dés
function throwDice(diceArray) {
    diceArray.forEach((dice, idx) => {
        dice.body.velocity.setZero();  // Réinitialiser la vitesse
        dice.body.angularVelocity.setZero();  // Réinitialiser la rotation
        dice.body.position = new CANNON.Vec3(
            2 , // Position x ajustée, plus proche du centre
            idx * 1.5,       // Position y espacée pour chaque dé
            2 
        );
        dice.mesh.position.copy(dice.body.position);  // Copier la position dans le mesh
        const initialRotation = new THREE.Euler(
            Math.random() * Math.PI * 0.5, // Rotation contrôlée, réduite à +/- 90°
            Math.random() * Math.PI * 0.5,
            Math.random() * Math.PI * 0.5
        );
        dice.mesh.rotation.copy(initialRotation);
        dice.body.quaternion.copy(dice.mesh.quaternion);  // Copier la rotation dans le corps physique

        // Appliquer une impulsion pour lancer le dé
        const force = 4+ Math.random() * 7.5;
        dice.body.applyImpulse(new CANNON.Vec3(-force, force, -0.5), new CANNON.Vec3(0, 0, 0.2));
        dice.body.allowSleep = true;  // Permettre au dé de "dormir" après avoir arrêté de bouger
    });
}

export { throwDice, createDice };
