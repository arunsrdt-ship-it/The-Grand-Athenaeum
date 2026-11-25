import * as THREE from 'three';

const MOVE_KEYS = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

function isTypingTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || Boolean(target.closest('input, textarea, select')));
}

export class FirstPersonController {
  constructor({ camera, element, startPosition, startLookAt, canWalkTo, onInteract }) {
    this.camera = camera;
    this.element = element;
    this.canWalkTo = canWalkTo;
    this.onInteract = onInteract;
    this.eyeHeight = startPosition.y;
    this.position = new THREE.Vector3(startPosition.x, 0, startPosition.z);
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.touchMoves = new Set();
    this.dragPointerId = null;
    this.lastPointer = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0;
    this.bobClock = 0;
    this.movementAmount = 0;
    this.active = true;
    this.inputEnabled = true;
    this.sprinting = false;
    this.lookSensitivity = 1.0;

    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(startPosition);
    this.lookAt(startLookAt);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerEnd = this.handlePointerEnd.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerEnd);
    this.element.addEventListener('pointercancel', this.handlePointerEnd);
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.preventContextMenu);
  }

  preventContextMenu(event) {
    event.preventDefault();
  }

  handleKeyDown(event) {
    if (!this.active || !this.inputEnabled || isTypingTarget(event.target)) return;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.sprinting = true;
      return;
    }
    if (event.code === 'KeyE') {
      if (!event.repeat) {
        event.preventDefault();
        this.onInteract?.();
      }
      return;
    }

    const direction = MOVE_KEYS[event.code];
    if (!direction) return;
    event.preventDefault();
    this.keys.add(direction);
  }

  handleKeyUp(event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.sprinting = false;
      return;
    }
    const direction = MOVE_KEYS[event.code];
    if (direction) this.keys.delete(direction);
  }

  handlePointerDown(event) {
    if (!this.active || !this.inputEnabled || event.button !== 0) return;
    this.dragPointerId = event.pointerId;
    this.lastPointer.set(event.clientX, event.clientY);
    this.element.setPointerCapture?.(event.pointerId);
  }

  handlePointerMove(event) {
    if (!this.active || !this.inputEnabled || this.dragPointerId !== event.pointerId) return;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer.set(event.clientX, event.clientY);
    this.yaw -= dx * 0.0032 * this.lookSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0028 * this.lookSensitivity, -0.78, 0.78);
    this.applyLook();
  }

  handlePointerEnd(event) {
    if (this.dragPointerId === event.pointerId) this.dragPointerId = null;
  }

  handleWheel(event) {
    if (!this.active || !this.inputEnabled) return;
    event.preventDefault();
    this.zoom(event.deltaY > 0 ? 1.08 : 0.92);
  }

  handleBlur() {
    this.keys.clear();
    this.touchMoves.clear();
    this.sprinting = false;
    this.velocity.set(0, 0, 0);
    this.dragPointerId = null;
  }

  applyLook() {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  lookAt(target) {
    const direction = target.clone().sub(this.camera.position).normalize();
    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    this.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.applyLook();
  }

  getLookTarget(distance = 3) {
    this.camera.updateMatrixWorld(true);
    return this.camera.position.clone().addScaledVector(this.camera.getWorldDirection(new THREE.Vector3()), distance);
  }

  setMovement(direction, active) {
    if (active) this.touchMoves.add(direction);
    else this.touchMoves.delete(direction);
  }

  setActive(active) {
    this.active = active;
    if (!active) this.handleBlur();
  }

  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
    if (!enabled) this.handleBlur();
  }

  setPose(position, lookTarget) {
    this.camera.position.copy(position);
    this.position.set(position.x, 0, position.z);
    this.lookAt(lookTarget);
  }

  setSensitivity(value) {
    this.lookSensitivity = THREE.MathUtils.clamp(Number(value) || 1, 0.35, 2.5);
  }

  update(delta) {
    if (!this.active || !this.inputEnabled) return 0;

    const forward = Number(this.keys.has('forward') || this.touchMoves.has('forward'))
      - Number(this.keys.has('backward') || this.touchMoves.has('backward'));
    const side = Number(this.keys.has('right') || this.touchMoves.has('right'))
      - Number(this.keys.has('left') || this.touchMoves.has('left'));
    const desired = new THREE.Vector3(side, 0, -forward);
    const maxSpeed = this.sprinting ? 4.15 : 2.35;
    if (desired.lengthSq()) desired.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    desired.multiplyScalar(maxSpeed);
    this.velocity.lerp(desired, 1 - Math.exp(-12 * delta));

    const moveX = this.velocity.x * delta;
    const moveZ = this.velocity.z * delta;
    if (Math.abs(moveX) > 0.0001 && this.canWalkTo(this.position.x + moveX, this.position.z)) {
      this.position.x += moveX;
    } else if (Math.abs(moveX) > 0.0001) {
      this.velocity.x = 0;
    }
    if (Math.abs(moveZ) > 0.0001 && this.canWalkTo(this.position.x, this.position.z + moveZ)) {
      this.position.z += moveZ;
    } else if (Math.abs(moveZ) > 0.0001) {
      this.velocity.z = 0;
    }

    this.movementAmount = Math.min(1, Math.hypot(this.velocity.x, this.velocity.z) / 2.35);
    if (this.movementAmount > 0.04) this.bobClock += delta * (this.sprinting ? 14.5 : 10.5);
    const headBob = Math.sin(this.bobClock) * (this.sprinting ? 0.036 : 0.026) * Math.min(1.2, this.movementAmount);
    this.camera.position.set(this.position.x, this.eyeHeight + headBob, this.position.z);
    return this.movementAmount;
  }

  zoom(factor) {
    this.camera.fov = THREE.MathUtils.clamp(this.camera.fov * factor, 32, 72);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerEnd);
    this.element.removeEventListener('pointercancel', this.handlePointerEnd);
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('contextmenu', this.preventContextMenu);
  }
}
