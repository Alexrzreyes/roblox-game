import * as THREE from 'three';
import { gameAudio } from './audio.js';
import { Enemy } from './enemy.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    
    // Arrays for collision and update loops
    this.platforms = [];
    this.coins = [];
    this.particles = [];
    this.enemies = []; // Tracking active enemies
    
    this.setupEnvironment();
    this.createStage();
    this.spawnCoins();
  }

  setupEnvironment() {
    // 1. Lighting
    // Ambient Light (soft fill)
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.6);
    this.scene.add(ambientLight);

    // Hemisphere Light (sky / ground gradient)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Directional Light (Sun with soft shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 30, 15);
    dirLight.castShadow = true;
    
    // Configure shadow map size and frustum
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    
    const d = 30; // Expanded shadow area for larger island
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    
    this.scene.add(dirLight);

    // 2. Sky background & Fog
    this.scene.background = new THREE.Color(0xa5f3fc); // Beautiful sky blue
    // Exponential fog for deep visual aesthetics
    this.scene.fog = new THREE.FogExp2(0xa5f3fc, 0.02);
  }

  createStage() {
    // Material presets
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x4ade80 }); // Bright green
    const soilMaterial = new THREE.MeshLambertMaterial({ color: 0x78350f });  // Warm brown
    const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x9ca3af }); // Stone grey
    
    // Color palettes for blocks
    const colors = [0x06b6d4, 0x8b5cf6, 0xec4899, 0xf59e0b]; // Cyan, Purple, Pink, Orange

    // 1. Main Island (Soil base + Grass top) - Expanded to 48x48
    const mainIslandWidth = 48;
    const mainIslandDepth = 48;
    
    // Soil
    const soilGeo = new THREE.BoxGeometry(mainIslandWidth, 1.5, mainIslandDepth);
    const soilMesh = new THREE.Mesh(soilGeo, soilMaterial);
    soilMesh.position.set(0, -0.75, 0);
    soilMesh.receiveShadow = true;
    soilMesh.castShadow = true;
    this.scene.add(soilMesh);
    
    // Grass
    const grassGeo = new THREE.BoxGeometry(mainIslandWidth, 0.2, mainIslandDepth);
    const grassMesh = new THREE.Mesh(grassGeo, grassMaterial);
    grassMesh.position.set(0, 0.1, 0);
    grassMesh.receiveShadow = true;
    grassMesh.castShadow = true;
    this.scene.add(grassMesh);

    // 2. Add some decorative rocks on the main island
    const rockGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const rock1 = new THREE.Mesh(rockGeo, stoneMaterial);
    rock1.position.set(-8, 0.9, -8);
    rock1.rotation.set(0.2, 0.5, 0.1);
    rock1.castShadow = true;
    rock1.receiveShadow = true;
    this.scene.add(rock1);
    this.platforms.push({ mesh: rock1, box: new THREE.Box3(), isMoving: false });

    // 2b. Stone Towers (acts as platforms)
    const tower1Geo = new THREE.BoxGeometry(4, 6, 4);
    const tower1 = new THREE.Mesh(tower1Geo, stoneMaterial);
    tower1.position.set(14, 3, 14);
    tower1.castShadow = true;
    tower1.receiveShadow = true;
    this.scene.add(tower1);
    this.platforms.push({ mesh: tower1, box: new THREE.Box3().setFromObject(tower1), isMoving: false });

    const tower2Geo = new THREE.BoxGeometry(4, 4, 4);
    const tower2 = new THREE.Mesh(tower2Geo, stoneMaterial);
    tower2.position.set(-14, 2, -14);
    tower2.castShadow = true;
    tower2.receiveShadow = true;
    this.scene.add(tower2);
    this.platforms.push({ mesh: tower2, box: new THREE.Box3().setFromObject(tower2), isMoving: false });

    // 3. Static Floating Platforms (Staircase layout)
    const platformData = [
      { x: -7, y: 1.5, z: 6, w: 3, h: 0.5, d: 3, color: colors[0] },  // Cyan
      { x: -7, y: 3.0, z: 0, w: 3, h: 0.5, d: 3, color: colors[1] },  // Purple
      { x: -3, y: 4.2, z: -5, w: 4, h: 0.5, d: 3, color: colors[3] }  // Orange
    ];

    platformData.forEach(data => {
      const geo = new THREE.BoxGeometry(data.w, data.h, data.d);
      const mat = new THREE.MeshLambertMaterial({ color: data.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(data.x, data.y - data.h/2, data.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      
      this.platforms.push({
        mesh: mesh,
        box: new THREE.Box3().setFromObject(mesh),
        isMoving: false
      });
    });

    // 3b. Additional floating platforms connecting towers
    const additionalPlatforms = [
      { x: 9, y: 3.2, z: 12, w: 3, h: 0.5, d: 3, color: colors[0] },   // connects to tower 1
      { x: 14, y: 4.8, z: 9, w: 3, h: 0.5, d: 3, color: colors[1] },
      { x: -9, y: 2.2, z: -12, w: 3, h: 0.5, d: 3, color: colors[2] }  // connects to tower 2
    ];
    additionalPlatforms.forEach(data => {
      const geo = new THREE.BoxGeometry(data.w, data.h, data.d);
      const mat = new THREE.MeshLambertMaterial({ color: data.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(data.x, data.y - data.h/2, data.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.platforms.push({
        mesh: mesh,
        box: new THREE.Box3().setFromObject(mesh),
        isMoving: false
      });
    });

    // 4. Moving Platform (Pink) - Longer range
    const movingGeo = new THREE.BoxGeometry(3, 0.4, 3);
    const movingMat = new THREE.MeshLambertMaterial({ color: colors[2] }); // Pink
    const movingMesh = new THREE.Mesh(movingGeo, movingMat);
    movingMesh.position.set(4, 2.2, 5); // Start position
    movingMesh.castShadow = true;
    movingMesh.receiveShadow = true;
    this.scene.add(movingMesh);

    this.movingPlatform = {
      mesh: movingMesh,
      box: new THREE.Box3().setFromObject(movingMesh),
      isMoving: true,
      startX: 4,
      endX: 16, // longer range
      speed: 2.5,
      direction: 1, // 1: forward, -1: backward
      dx: 0 // delta x per frame
    };
    this.platforms.push(this.movingPlatform);

    // 5. Ramp / Slope (Stone colored box rotated)
    const rampWidth = 3;
    const rampLength = 6;
    const rampHeight = 0.2;
    const rampGeo = new THREE.BoxGeometry(rampLength, rampHeight, rampWidth);
    const rampMesh = new THREE.Mesh(rampGeo, stoneMaterial);
    
    // Center of ramp between X=3 and X=9 (midpoint X=6), Z=-5
    rampMesh.position.set(6, 0.85, -5);
    rampMesh.rotation.z = 0.3; // 17 degrees slope
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.scene.add(rampMesh);
  }

  spawnCoins() {
    const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Golden yellow
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x3a2c00
    });

    // Preset positions for coins (placed on platform levels)
    const coinPositions = [
      new THREE.Vector3(0, 1.2, 0),        // Main stage center
      new THREE.Vector3(-8, 2.0, -8),      // On top of the rock
      new THREE.Vector3(-7, 2.5, 6),       // On Platform 1
      new THREE.Vector3(-7, 4.0, 0),       // On Platform 2
      new THREE.Vector3(-3, 5.2, -5),      // On Platform 3
      new THREE.Vector3(7, 3.2, 5),        // Path of moving platform (X=7)
      new THREE.Vector3(9, 2.8, -5),       // Top of ramp
      new THREE.Vector3(6, 1.9, -5),       // Middle of ramp
    ];

    coinPositions.forEach((pos, index) => {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      // Turn coin vertical
      coin.rotation.x = Math.PI / 2;
      coin.position.copy(pos);
      coin.castShadow = true;
      this.scene.add(coin);

      this.coins.push({
        mesh: coin,
        initialY: pos.y,
        bobOffset: index * 0.5 // Desynchronize bobbing
      });
    });
  }

  updateMovingPlatforms(dt) {
    const p = this.movingPlatform;
    const mesh = p.mesh;
    
    const prevX = mesh.position.x;
    
    // Move
    mesh.position.x += p.speed * p.direction * dt;
    
    // Bounce logic
    if (p.direction === 1 && mesh.position.x >= p.endX) {
      mesh.position.x = p.endX;
      p.direction = -1;
    } else if (p.direction === -1 && mesh.position.x <= p.startX) {
      mesh.position.x = p.startX;
      p.direction = 1;
    }
    
    // Save displacement delta x to carry the player
    p.dx = mesh.position.x - prevX;
  }

  update(dt, avatar, onCoinCollected, onEnemyKilled) {
    // 1. Update platforms positions (moving ones)
    this.updateMovingPlatforms(dt);

    // 2. Animate coins (rotate and bob up & down)
    const time = performance.now() * 0.003;
    this.coins.forEach(coin => {
      coin.mesh.rotation.z += 1.8 * dt; // Rotate around center axis
      coin.mesh.position.y = coin.initialY + Math.sin(time + coin.bobOffset) * 0.18;
    });

    // 3. Update physics particles
    this.updateParticles(dt);

    // 4. Handle Platform Collisions
    this.checkCollisions(avatar);

    // 5. Handle Coin Collisions
    this.checkCoinCollections(avatar, onCoinCollected);

    // 6. Update shooter gameplay: enemies spawning, logic and bullet collisions
    this.updateEnemies(dt, avatar, onEnemyKilled);
  }

  checkCollisions(avatar) {
    let onAnyPlatform = false;
    let groundY = 0.2; // base grass top surface level
    
    const playerBottom = avatar.position.y;
    const playerX = avatar.position.x;
    const playerZ = avatar.position.z;
    const r = avatar.radius;
    
    // A. Main Island Bounds check (Expanded to 48x48 bounds: abs(x/z) <= 24)
    const inMainIsland = Math.abs(playerX) <= 24 && Math.abs(playerZ) <= 24;
    if (inMainIsland && playerBottom >= -0.05 && playerBottom <= 0.4 && avatar.velocity.y <= 0) {
      groundY = 0.2; // On grass top
      onAnyPlatform = true;
    }

    // B. Floating / Static Platforms
    for (const plat of this.platforms) {
      // Re-calculate bounding box from mesh world position
      plat.box.setFromObject(plat.mesh);
      
      // Horizontal bounds + buffer
      const minX = plat.box.min.x - r;
      const maxX = plat.box.max.x + r;
      const minZ = plat.box.min.z - r;
      const maxZ = plat.box.max.z + r;
      
      if (playerX >= minX && playerX <= maxX && playerZ >= minZ && playerZ <= maxZ) {
        const topY = plat.box.max.y;
        // Collision threshold: falling down and player feet coordinates intersect platform top
        if (avatar.velocity.y <= 0 && playerBottom >= topY - 0.22 && playerBottom <= topY + 0.1) {
          groundY = topY;
          onAnyPlatform = true;
          
          // Carry player with moving platform
          if (plat.isMoving && plat.dx) {
            avatar.position.x += plat.dx;
          }
        }
      }
    }

    // C. Ramp / Slope collision math
    // Slope goes from X=3 to X=9, Z=-6.5 to -3.5 (Ramp center is Z=-5, width 3)
    if (playerX >= 3.0 && playerX <= 9.0 && playerZ >= -6.5 && playerZ <= -3.5) {
      // Linear interpolation of height: 0 at X=3, up to 1.8 at X=9
      // Rise = 1.8, Run = 6.0, slope = 0.3
      const rampTopY = 0.2 + (playerX - 3.0) * 0.3;
      if (avatar.velocity.y <= 0 && playerBottom >= rampTopY - 0.25 && playerBottom <= rampTopY + 0.15) {
        groundY = rampTopY;
        onAnyPlatform = true;
      }
    }

    // D. Apply physics update
    if (onAnyPlatform) {
      avatar.position.y = groundY;
      avatar.velocity.y = 0;
      avatar.onGround = true;
      avatar.isJumping = false;
    } else {
      avatar.onGround = false;
    }
  }

  checkCoinCollections(avatar, onCoinCollected) {
    const playerCenter = avatar.position.clone();
    playerCenter.y += 1.0; // midpoint of torso
    
    // Check intersection (using simple bounding sphere check)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      const coinPos = coin.mesh.position;
      
      const distance = playerCenter.distanceTo(coinPos);
      if (distance < 1.2) { // trigger threshold
        // Collect
        this.scene.remove(coin.mesh);
        this.coins.splice(i, 1);
        
        // Spawn coin collect particles (glowing shards)
        this.spawnCoinExplosion(coinPos);
        
        // Audio
        gameAudio.playCoin();
        
        // Callback to UI
        if (onCoinCollected) {
          onCoinCollected();
        }
      }
    }
  }

  spawnCoinExplosion(pos) {
    const particleCount = 10;
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Gold yellow

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      
      // Random velocity vector
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 5
      );
      
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity: velocity,
        life: 0.6 // seconds
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Gravity
      p.velocity.y -= 9.8 * dt;
      
      // Move
      p.mesh.position.addScaledVector(p.velocity, dt);
      
      // Shrink size over life
      p.life -= dt;
      const scale = p.life / 0.6;
      p.mesh.scale.set(scale, scale, scale);
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  spawnEnemy() {
    // Generate random coordinates on the grass island
    let x, z;
    do {
      // Main island is 48x48. Keep spawn within range [-20, 20]
      x = (Math.random() - 0.5) * 40;
      z = (Math.random() - 0.5) * 40;
    } while (Math.sqrt(x * x + z * z) < 6); // Don't spawn right on top of the player's start position (0,0)

    const enemy = new Enemy(this.scene, x, z);
    this.enemies.push(enemy);
  }

  updateEnemies(dt, avatar, onEnemyKilled) {
    // Maintain exactly 6 active enemies
    while (this.enemies.length < 6) {
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, avatar.position);

      // Check collision with player
      const distToPlayer = enemy.position.distanceTo(avatar.position);
      // Torso collision y-range check (ensure both are on same height roughly)
      const heightDiff = Math.abs(enemy.position.y - avatar.position.y);
      
      if (distToPlayer < (enemy.radius + avatar.radius) && heightDiff < 1.5) {
        avatar.takeDamage(10); // deal 10 damage to player
      }

      // Check bullet collisions (avatar.bullets)
      for (let j = avatar.bullets.length - 1; j >= 0; j--) {
        const bullet = avatar.bullets[j];
        const distToBullet = enemy.position.distanceTo(bullet.mesh.position);
        
        // Torso height check
        const bulletHeightDiff = Math.abs(bullet.mesh.position.y - enemy.position.y);
        
        if (distToBullet < (enemy.radius + 0.15) && bulletHeightDiff < 1.0) {
          // Bullet hit!
          enemy.takeDamage(10);

          // Destroy bullet
          this.scene.remove(bullet.mesh);
          bullet.mesh.geometry.dispose();
          bullet.mesh.material.dispose();
          avatar.bullets.splice(j, 1);

          // Spawn hit particles
          this.spawnEnemyHitParticles(enemy.position);

          if (enemy.isDead) {
            gameAudio.playExplosion();
            enemy.destroy();
            this.enemies.splice(i, 1);
            if (onEnemyKilled) {
              onEnemyKilled();
            }
            break; // Stop checking bullet collisions for this dead enemy
          }
        }
      }
    }
  }

  spawnEnemyHitParticles(pos) {
    const particleCount = 12;
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // red particles

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(geo, mat);
      // Spawn at torso height
      const spawnPos = pos.clone();
      spawnPos.y += 0.4;
      p.position.copy(spawnPos);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1.5,
        (Math.random() - 0.5) * 6
      );
      
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity: velocity,
        life: 0.5 // seconds
      });
    }
  }
}
