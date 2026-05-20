/**
 * Input controller managing keyboard, mouse, and touch events (joystick/jump button).
 * Also calculates orbital camera angles based on user drag.
 */

export class Controls {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    
    // Movement inputs (normalized to -1 to 1 range)
    this.moveVector = { x: 0, y: 0 }; // x: left/right, y: forward/backward
    this.jumpPressed = false;
    this.shootPressed = false;
    
    // Keyboard state
    this.keys = {
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      Space: false, f: false
    };

    // Camera Orbit angles (in radians)
    this.cameraYaw = 0; // horizontal angle
    this.cameraPitch = 0.4; // vertical angle (tilted down slightly)
    this.cameraDistance = 8; // zoom level
    
    // Mouse/Touch Drag state for camera rotation
    this.isDraggingCamera = false;
    this.prevPointerPos = { x: 0, y: 0 };
    
    // Joystick Configuration
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickHandle = document.getElementById('joystick-handle');
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickStartPos = { x: 0, y: 0 };
    this.joystickLimit = 40; // Max pixels handle can move from center

    this.initListeners();
  }

  initListeners() {
    // 1. Keyboard Listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // 2. Mouse/Pointer Listeners for Camera Drag on Canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right click menu
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });

    // 3. Touch Joystick Listeners
    if (this.joystickBase) {
      this.joystickBase.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
      window.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
      window.addEventListener('touchend', (e) => this.onJoystickEnd(e));
    }

    // 4. Touch Jump Button Listener
    const jumpBtn = document.getElementById('jump-button');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.jumpPressed = true;
      }, { passive: false });
      jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.jumpPressed = false;
      }, { passive: false });
    }

  }

  // --- Keyboard Handling ---
  handleKeyDown(e) {
    let code = e.code;
    let key = e.key;

    if (code === 'Space' || key === ' ') {
      this.keys.Space = true;
      this.jumpPressed = true;
    }
    
    if (key === 'w' || key === 'W' || code === 'KeyW') this.keys.w = true;
    if (key === 's' || key === 'S' || code === 'KeyS') this.keys.s = true;
    if (key === 'a' || key === 'A' || code === 'KeyA') this.keys.a = true;
    if (key === 'd' || key === 'D' || code === 'KeyD') this.keys.d = true;
    if (key === 'f' || key === 'F' || code === 'KeyF') {
      this.keys.f = true;
      this.shootPressed = true;
    }

    if (code === 'ArrowUp') this.keys.ArrowUp = true;
    if (code === 'ArrowDown') this.keys.ArrowDown = true;
    if (code === 'ArrowLeft') this.keys.ArrowLeft = true;
    if (code === 'ArrowRight') this.keys.ArrowRight = true;

    this.updateKeyboardVector();
  }

  handleKeyUp(e) {
    let code = e.code;
    let key = e.key;

    if (code === 'Space' || key === ' ') {
      this.keys.Space = false;
      this.jumpPressed = false;
    }
    
    if (key === 'w' || key === 'W' || code === 'KeyW') this.keys.w = false;
    if (key === 's' || key === 'S' || code === 'KeyS') this.keys.s = false;
    if (key === 'a' || key === 'A' || code === 'KeyA') this.keys.a = false;
    if (key === 'd' || key === 'D' || code === 'KeyD') this.keys.d = false;
    if (key === 'f' || key === 'F' || code === 'KeyF') {
      this.keys.f = false;
      this.shootPressed = false;
    }

    if (code === 'ArrowUp') this.keys.ArrowUp = false;
    if (code === 'ArrowDown') this.keys.ArrowDown = false;
    if (code === 'ArrowLeft') this.keys.ArrowLeft = false;
    if (code === 'ArrowRight') this.keys.ArrowRight = false;

    this.updateKeyboardVector();
  }

  updateKeyboardVector() {
    // If joystick is active, ignore keyboard inputs for movement
    if (this.joystickActive) return;

    let x = 0;
    let y = 0;

    if (this.keys.w || this.keys.ArrowUp) y += 1;
    if (this.keys.s || this.keys.ArrowDown) y -= 1;
    if (this.keys.a || this.keys.ArrowLeft) x -= 1;
    if (this.keys.d || this.keys.ArrowRight) x += 1;

    // Normalize diagonal movement speed
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    this.moveVector.x = x;
    this.moveVector.y = y;
  }

  // --- Mouse/Pointer Handling for Camera ---
  onPointerDown(e) {
    // Right click (button 2) or touch drag to rotate camera
    // Left click (button 0) or touch drag to rotate camera
    if (e.button === 0 || e.pointerType === 'touch') {
      this.isDraggingCamera = true;
      this.prevPointerPos.x = e.clientX;
      this.prevPointerPos.y = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    }
  }

  onPointerMove(e) {
    if (!this.isDraggingCamera) return;

    const deltaX = e.clientX - this.prevPointerPos.x;
    const deltaY = e.clientY - this.prevPointerPos.y;

    this.prevPointerPos.x = e.clientX;
    this.prevPointerPos.y = e.clientY;

    // Adjust camera rotation angle sensitive to speed
    this.cameraYaw -= deltaX * 0.005;
    this.cameraPitch += deltaY * 0.005;

    // Clamp pitch to avoid turning camera completely upside down (ground/sky limits)
    this.cameraPitch = Math.max(-0.2, Math.min(1.2, this.cameraPitch));
  }

  onPointerUp(e) {
    this.isDraggingCamera = false;
  }

  onWheel(e) {
    // Adjust camera distance (zoom)
    this.cameraDistance += e.deltaY * 0.008;
    this.cameraDistance = Math.max(3, Math.min(15, this.cameraDistance));
  }

  // --- Mobile Joystick Touch Handling ---
  onJoystickStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    this.joystickActive = true;
    this.joystickTouchId = touch.identifier;

    const rect = this.joystickBase.getBoundingClientRect();
    // Center point of the joystick base
    this.joystickStartPos.x = rect.left + rect.width / 2;
    this.joystickStartPos.y = rect.top + rect.height / 2;
  }

  onJoystickMove(e) {
    if (!this.joystickActive) return;

    // Find the touch corresponding to the joystick
    let activeTouch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.joystickTouchId) {
        activeTouch = e.touches[i];
        break;
      }
    }

    if (!activeTouch) return;
    e.preventDefault();

    // Calculate displacement vector
    let dx = activeTouch.clientX - this.joystickStartPos.x;
    let dy = activeTouch.clientY - this.joystickStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Limit handle drag distance
    if (dist > this.joystickLimit) {
      dx = (dx / dist) * this.joystickLimit;
      dy = (dy / dist) * this.joystickLimit;
    }

    // Move visual handle
    this.joystickHandle.style.transform = `translate(${dx}px, ${dy}px)`;

    // Convert to normalized input vector (-1 to 1)
    // Invert y axis for threejs movement (forward = +y direction)
    this.moveVector.x = dx / this.joystickLimit;
    this.moveVector.y = -dy / this.joystickLimit;
  }

  onJoystickEnd(e) {
    // Check if the joystick touch has ended
    let ended = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.joystickTouchId) {
        ended = true;
        break;
      }
    }

    if (!ended) return;

    this.joystickActive = false;
    this.joystickTouchId = null;

    // Reset visual handle position
    this.joystickHandle.style.transform = 'translate(0px, 0px)';
    
    // Reset move vector
    this.moveVector.x = 0;
    this.moveVector.y = 0;
    
    // Fall back to keyboard state check
    this.updateKeyboardVector();
  }
}
