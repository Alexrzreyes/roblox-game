import * as THREE from 'three';

export class Enemy {
  constructor(scene, spawnX, spawnZ) {
    this.scene = scene;
    
    // Group containing the enemy meshes
    this.group = new THREE.Group();
    
    // Attributes
    this.position = new THREE.Vector3(spawnX, 0.45, spawnZ);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 2.4;
    this.hp = 20; // dies in 2 hits
    this.maxHp = 20;
    this.radius = 0.5;
    this.isDead = false;
    
    // Flash effect state
    this.flashTimer = 0;
    this.isFlashing = false;
    
    this.buildMesh();
    this.scene.add(this.group);
  }

  buildMesh() {
    // Materials
    this.bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Orange-Red zombie
    this.skinMaterial = new THREE.MeshLambertMaterial({ color: 0xb91c1c }); // Dark red head
    this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Glowing yellow eyes
    
    // Keep reference to materials for flashing
    this.materialsList = [this.bodyMaterial, this.skinMaterial, this.eyeMaterial];

    // Body (Torso box)
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    this.body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    this.body.position.set(0, 0.4, 0);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    // Head (Cube)
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.head = new THREE.Mesh(headGeo, this.skinMaterial);
    this.head.position.set(0, 1.05, 0);
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.group.add(this.head);

    // Left Eye
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    leftEye.position.set(-0.15, 1.1, 0.26); // offset forward
    this.group.add(leftEye);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    rightEye.position.set(0.15, 1.1, 0.26);
    this.group.add(rightEye);

    // Set initial position
    this.group.position.copy(this.position);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;
    
    // Trigger white flash effect
    this.isFlashing = true;
    this.flashTimer = 0.12; // flash for 120ms
    this.materialsList.forEach(mat => {
      mat.userData.originalColor = mat.color.getHex();
      mat.color.setHex(0xffffff); // turn white
    });

    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  update(dt, playerPosition) {
    if (this.isDead) return;

    // 1. Flash effect logic
    if (this.isFlashing) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
        // Restore original colors
        this.materialsList.forEach(mat => {
          if (mat.userData.originalColor !== undefined) {
            mat.color.setHex(mat.userData.originalColor);
          }
        });
      }
    }

    // 2. Chase AI: Move towards player on XZ plane
    const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
    dir.y = 0; // ignore height difference for heading
    
    const dist = dir.length();
    if (dist > 0.1) {
      dir.normalize();
      
      // Move
      this.position.addScaledVector(dir, this.speed * dt);
      this.group.position.copy(this.position);
      
      // Face the player
      // We look in opposite direction because lookAt rotates Z face to target
      // Target is playerPosition
      const targetLook = playerPosition.clone();
      targetLook.y = this.position.y; // horizontal alignment
      this.group.lookAt(targetLook);
    }
    
    // 3. Subtle floating bobbing animation
    const time = performance.now() * 0.005;
    this.group.position.y = this.position.y + Math.sin(time + this.position.x) * 0.05;
  }

  destroy() {
    this.scene.remove(this.group);
    
    // Recursively dispose geometry and materials
    this.group.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
