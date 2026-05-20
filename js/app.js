import * as THREE from 'three';
import { Controls } from './controls.js';
import { Avatar } from './avatar.js';
import { World } from './world.js';
import { gameAudio } from './audio.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.coinCount = 0;
    
    this.initEngine();
    this.initGameObjects();
    this.initUI();
    this.startLoop();
  }

  initEngine() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60, // Field of View
      window.innerWidth / window.innerHeight, // Aspect Ratio
      0.1, // Near plane
      1000 // Far plane
    );
    // Initial camera position offset
    this.camera.position.set(0, 5, 8);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 4. Clock
    this.clock = new THREE.Clock();

    // 5. Handle Resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  initGameObjects() {
    // World (platforms, coins, lights)
    this.world = new World(this.scene);
    
    // Avatar (Roblox model, movements, physics)
    this.avatar = new Avatar(this.scene);
    
    // Inputs (controls, joystick, drag)
    this.controls = new Controls(this.canvas);
  }

  initUI() {
    // 1. Sidebar Customizer Toggle
    const customizerPanel = document.getElementById('customizer-panel');
    const toggleBtn = document.getElementById('toggle-customizer');
    
    if (toggleBtn && customizerPanel) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customizerPanel.classList.toggle('collapsed');
      });
      
      // Close sidebar if clicking outside it on desktop
      document.addEventListener('click', (e) => {
        if (!customizerPanel.contains(e.target) && e.target !== toggleBtn) {
          customizerPanel.classList.add('collapsed');
        }
      });
    }

    // 2. Avatar Color Selectors
    const colorOptions = document.querySelectorAll('.color-options');
    colorOptions.forEach(container => {
      const target = container.getAttribute('data-target'); // 'skin', 'torso', 'pants'
      const buttons = container.querySelectorAll('.color-btn');
      
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          // Remove active class from sibling buttons
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          const color = btn.getAttribute('data-color');
          this.avatar.updateColor(target, color);
          
          // Play click noise
          gameAudio.playStep();
        });
      });
    });

    // 3. Audio Toggle Button
    const audioBtn = document.getElementById('audio-toggle');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn && audioIcon) {
      audioBtn.addEventListener('click', () => {
        const isMuted = gameAudio.toggleMute();
        audioIcon.textContent = isMuted ? '🔇' : '🔊';
        audioBtn.classList.toggle('muted', isMuted);
      });
    }

    // 4. Respawn Action Button
    const respawnBtn = document.getElementById('reset-position-btn');
    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => {
        this.avatar.respawn();
        gameAudio.playJump();
        // Collapse sidebar on click to focus on screen
        if (customizerPanel) customizerPanel.classList.add('collapsed');
      });
    }
  }

  onCoinCollected() {
    this.coinCount++;
    const countEl = document.getElementById('coin-count');
    if (countEl) {
      countEl.textContent = this.coinCount;
      // Add visual bump animation
      countEl.parentElement.classList.add('bump');
      setTimeout(() => {
        countEl.parentElement.classList.remove('bump');
      }, 300);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  updateCamera() {
    // 3rd Person camera follow system with smoothing
    const target = this.avatar.group.position.clone();
    
    // Look target point (middle of torso)
    target.y += 1.1; 

    // Retrieve orbit values
    const distance = this.controls.cameraDistance;
    const yaw = this.controls.cameraYaw;
    const pitch = this.controls.cameraPitch;

    // Convert spherical angles to Cartesian coordinates centered at target
    const x = target.x + distance * Math.sin(yaw) * Math.cos(pitch);
    const y = target.y + distance * Math.sin(pitch);
    const z = target.z + distance * Math.cos(yaw) * Math.cos(pitch);

    const goalCamPos = new THREE.Vector3(x, y, z);
    
    // Smooth camera transition (lerp)
    this.camera.position.lerp(goalCamPos, 0.15);
    
    // Ensure camera stays looking directly at avatar target point
    this.camera.lookAt(target);
  }

  startLoop() {
    const loop = () => {
      requestAnimationFrame(loop);

      // Get frame delta time
      let dt = this.clock.getDelta();
      
      // Clamp dt to prevent massive physics anomalies on frame drops (e.g. background tab)
      if (dt > 0.1) dt = 0.1;

      // Update modules
      this.world.update(dt, this.avatar, () => this.onCoinCollected());
      this.avatar.update(dt, this.controls, this.controls.cameraYaw);
      
      // Perform camera follow calculations
      this.updateCamera();

      // Render frame
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }
}

// Instantiate and start the game after document loads
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
