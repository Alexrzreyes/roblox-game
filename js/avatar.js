import * as THREE from 'three';
import { gameAudio } from './audio.js';

export class Avatar {
  constructor(scene) {
    this.scene = scene;
    
    // Group containing all parts of the character
    this.group = new THREE.Group();
    
    // Character state
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = true;
    this.isJumping = false;
    this.speed = 6.5;
    this.jumpStrength = 11.5;
    this.gravity = -28;
    this.radius = 0.5; // for collision
    this.height = 2.2;
    
    // Animation timing
    this.animationTime = 0;
    this.lastStepSoundTime = 0;
    
    // Colors
    this.colors = {
      skin: '#ffdbac',
      torso: '#e63946',
      pants: '#1d3557'
    };
    
    this.buildCharacter();
    this.scene.add(this.group);
  }

  buildCharacter() {
    // 1. Create Materials
    this.materials = {
      skin: new THREE.MeshLambertMaterial({ color: this.colors.skin }),
      torso: new THREE.MeshLambertMaterial({ color: this.colors.torso }),
      pants: new THREE.MeshLambertMaterial({ color: this.colors.pants }),
      face: this.createFaceTextureMaterial()
    };

    // 2. Head (Front has face texture, other sides have skin material)
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMats = [
      this.materials.skin, // Right
      this.materials.skin, // Left
      this.materials.skin, // Top
      this.materials.skin, // Bottom
      this.materials.face, // Front (where the face goes)
      this.materials.skin  // Back
    ];
    this.head = new THREE.Mesh(headGeo, headMats);
    this.head.position.set(0, 1.9, 0);
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.group.add(this.head);

    // 3. Torso
    const torsoGeo = new THREE.BoxGeometry(1.0, 1.0, 0.5);
    this.torso = new THREE.Mesh(torsoGeo, this.materials.torso);
    this.torso.position.set(0, 1.1, 0);
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // 4. Limbs (Pivots are essential for swinging animations)
    // Left Arm
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.8, 1.4, 0);
    const leftArmGeo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, this.materials.skin);
    leftArmMesh.position.set(0, -0.35, 0); // Offset down by half height
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    this.leftArmPivot.add(leftArmMesh);
    this.group.add(this.leftArmPivot);

    // Right Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.8, 1.4, 0);
    const rightArmGeo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
    const rightArmMesh = new THREE.Mesh(rightArmGeo, this.materials.skin);
    rightArmMesh.position.set(0, -0.35, 0);
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    this.rightArmPivot.add(rightArmMesh);
    this.group.add(this.rightArmPivot);

    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.28, 0.7, 0);
    const leftLegGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    const leftLegMesh = new THREE.Mesh(leftLegGeo, this.materials.pants);
    leftLegMesh.position.set(0, -0.3, 0);
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    this.leftLegPivot.add(leftLegMesh);
    this.group.add(this.leftLegPivot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.28, 0.7, 0);
    const rightLegGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    const rightLegMesh = new THREE.Mesh(rightLegGeo, this.materials.pants);
    rightLegMesh.position.set(0, -0.3, 0);
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    this.rightLegPivot.add(rightLegMesh);
    this.group.add(this.rightLegPivot);
    
    // Set initial group height so feet are at y=0 relative to local origin
    this.group.position.copy(this.position);
  }

  createFaceTextureMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Fill face base color (skin)
    ctx.fillStyle = this.colors.skin;
    ctx.fillRect(0, 0, 128, 128);

    // Draw Roblox classic happy face
    // Eyes
    ctx.fillStyle = '#111';
    // Left eye (rounded rect or circle)
    ctx.beginPath();
    ctx.arc(38, 48, 8, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(90, 48, 8, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Arc for smile: center (64, 68), radius 28, start angle 0.1*pi, end angle 0.9*pi
    ctx.arc(64, 65, 26, 0, Math.PI, false);
    ctx.stroke();

    // Tongue/mouth open details (Subtle line to make it look friendly)
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(64, 75, 12, 0, Math.PI, false);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshLambertMaterial({ map: texture });
  }

  updateColor(part, hexColor) {
    this.colors[part] = hexColor;
    if (part === 'skin') {
      this.materials.skin.color.set(hexColor);
      // Re-render the face texture material since face background is skin-colored
      const faceCanvasMat = this.createFaceTextureMaterial();
      this.materials.face.map.dispose();
      this.materials.face.map = faceCanvasMat.map;
      this.materials.face.needsUpdate = true;
    } else if (part === 'torso') {
      this.materials.torso.color.set(hexColor);
    } else if (part === 'pants') {
      this.materials.pants.color.set(hexColor);
    }
  }

  update(dt, controls, cameraYaw) {
    // 1. Calculate direction relative to camera yaw
    // controls.moveVector contains x (horizontal/strafe) and y (forward/backward)
    const isMoving = controls.moveVector.x !== 0 || controls.moveVector.y !== 0;

    if (isMoving) {
      // Calculate angle from joystick/keyboard
      const inputAngle = Math.atan2(controls.moveVector.x, controls.moveVector.y);
      
      // Combine with camera yaw to move in direction camera is facing
      const targetAngle = cameraYaw + inputAngle;
      
      // Target velocities
      this.velocity.x = Math.sin(targetAngle) * this.speed;
      this.velocity.z = Math.cos(targetAngle) * this.speed;
      
      // Smoothly rotate character to face target movement direction
      // Find shortest angular difference
      let diff = targetAngle - this.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.group.rotation.y += diff * 12 * dt;
    } else {
      // Decelerate quickly on ground, slower in air
      const friction = this.onGround ? 15 : 2;
      this.velocity.x -= this.velocity.x * friction * dt;
      this.velocity.z -= this.velocity.z * friction * dt;
    }

    // 2. Physics & Jump
    if (controls.jumpPressed && this.onGround) {
      this.velocity.y = this.jumpStrength;
      this.onGround = false;
      gameAudio.playJump();
    }

    // Apply gravity
    this.velocity.y += this.gravity * dt;

    // Apply velocities to position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Simple bounds check (respawn if player falls off the stage)
    if (this.position.y < -15) {
      this.respawn();
    }

    // Update ThreeJS mesh position
    this.group.position.copy(this.position);

    // 3. Animations
    this.animate(dt, isMoving);
  }

  animate(dt, isMoving) {
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    
    if (!this.onGround) {
      // --- Jumping Animation ---
      // Arms raised, legs bent
      this.leftArmPivot.rotation.x = -Math.PI * 0.7;
      this.rightArmPivot.rotation.x = -Math.PI * 0.7;
      this.leftLegPivot.rotation.x = 0.2;
      this.rightLegPivot.rotation.x = -0.2;
      this.head.rotation.x = -0.1;
      this.torso.rotation.x = 0;
      
      this.leftArmPivot.rotation.z = -0.1;
      this.rightArmPivot.rotation.z = 0.1;
      this.group.position.y = this.position.y; // normal height
    } else if (isMoving && horizontalSpeed > 0.5) {
      // --- Walking Animation ---
      // Increment animation time based on movement speed
      this.animationTime += dt * horizontalSpeed * 1.5;
      
      const swingAngle = Math.sin(this.animationTime) * 0.65;
      
      // Opposite arm and leg swing
      this.leftArmPivot.rotation.x = swingAngle;
      this.rightArmPivot.rotation.x = -swingAngle;
      this.leftLegPivot.rotation.x = -swingAngle;
      this.rightLegPivot.rotation.x = swingAngle;
      
      // Neutral Z rotation
      this.leftArmPivot.rotation.z = -0.05;
      this.rightArmPivot.rotation.z = 0.05;
      
      // Subtle torso bobbing and twist
      this.group.position.y = this.position.y + Math.abs(Math.sin(this.animationTime * 2)) * 0.08;
      this.head.rotation.x = Math.sin(this.animationTime * 2) * 0.03;
      this.torso.rotation.y = Math.sin(this.animationTime) * 0.05;
      
      // Footstep sound triggers (at maximum swing points)
      const swingCycle = Math.sin(this.animationTime);
      const currentTime = performance.now();
      if ((swingCycle > 0.9 || swingCycle < -0.9) && (currentTime - this.lastStepSoundTime > 250)) {
        gameAudio.playStep();
        this.lastStepSoundTime = currentTime;
      }
    } else {
      // --- Idle Animation (Breathing) ---
      this.animationTime += dt * 2.5;
      
      const breatheOffset = Math.sin(this.animationTime) * 0.02;
      
      // Reset limbs to side slowly
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, 8 * dt);
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, 8 * dt);
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, 8 * dt);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, 8 * dt);
      
      this.leftArmPivot.rotation.z = -0.05 + breatheOffset;
      this.rightArmPivot.rotation.z = 0.05 - breatheOffset;
      
      // Breathe bob
      this.group.position.y = this.position.y + breatheOffset;
      this.head.rotation.x = breatheOffset * 0.5;
      this.torso.rotation.y = 0;
      this.torso.rotation.x = 0;
    }
  }

  respawn() {
    this.position.set(0, 4, 0);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
    this.group.position.copy(this.position);
  }
}
