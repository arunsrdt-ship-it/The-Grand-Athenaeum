import * as THREE from 'three';

export class CarAudioEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.subOsc = null;
    this.gain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.started = false;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  startEngine() {
    const ctx = this.ensureContext();
    if (!ctx || this.started) return;
    this.osc = ctx.createOscillator();
    this.subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    this.gain = ctx.createGain();
    this.osc.type = 'sawtooth';
    this.subOsc.type = 'triangle';
    this.osc.frequency.value = 58;
    this.subOsc.frequency.value = 29;
    filter.type = 'lowpass';
    filter.frequency.value = 230;
    this.gain.gain.value = 0.001;
    this.osc.connect(filter);
    this.subOsc.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(ctx.destination);
    this.osc.start();
    this.subOsc.start();

    this.sirenOsc = ctx.createOscillator();
    this.sirenGain = ctx.createGain();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 620;
    this.sirenGain.gain.value = 0.0001;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(ctx.destination);
    this.sirenOsc.start();

    this.started = true;
  }

  updateEngine(speedAbs, active, boosting = false, sirenActive = false, elapsed = 0) {
    if (!this.ctx || !this.started) return;
    const now = this.ctx.currentTime;
    const targetGain = active && this.enabled ? Math.min(0.085, 0.025 + speedAbs * 0.0022 + (boosting ? 0.02 : 0)) : 0.0001;
    const freq = 50 + speedAbs * 4.2 + (boosting ? 26 : 0);
    this.gain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.osc.frequency.setTargetAtTime(freq, now, 0.06);
    this.subOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.06);

    if (this.sirenGain) {
      const sGain = sirenActive && this.enabled ? 0.028 : 0.0001;
      this.sirenGain.gain.setTargetAtTime(sGain, now, 0.06);
      if (sirenActive) {
        this.sirenOsc.frequency.setValueAtTime(660 + Math.sin(elapsed * 5.2) * 190, now);
      }
    }
  }

  stopEngine() {
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    }
    if (this.sirenGain && this.ctx) {
      this.sirenGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    }
  }

  playHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [350, 440].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  playChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      g.gain.setValueAtTime(0.001, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.065, now + idx * 0.07 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.36);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.38);
    });
  }
}

export function createVehicleMesh(cfg, contactShadowTex, scene = null) {
  const root = new THREE.Group();
  root.position.set(cfg.x, 0.04, cfg.z);
  root.rotation.y = cfg.rotY || 0;

  if (contactShadowTex) {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 4.9),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.78 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.014;
    root.add(shadow);
  }

  const chassisPivot = new THREE.Group();
  root.add(chassisPivot);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: cfg.color,
    roughness: cfg.matte ? 0.45 : 0.16,
    metalness: cfg.matte ? 0.35 : 0.62,
    clearcoat: cfg.matte ? 0.25 : 1.0,
    clearcoatRoughness: 0.05
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: cfg.accentColor || '#15181e',
    roughness: 0.2,
    metalness: 0.5,
    clearcoat: 0.9
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.12, metalness: 0.95 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.88, metalness: 0.05 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: cfg.seatColor || '#382218', roughness: 0.55 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#b7d6ea',
    roughness: 0.04,
    metalness: 0.12,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.48
  });

  const isSupercar = cfg.style === 'supercar';
  const isPolice = cfg.style === 'police';

  // Main sculpted lower body
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.86, isSupercar ? 0.38 : 0.46, 4.32), bodyMat);
  lowerBody.position.y = isSupercar ? 0.48 : 0.54;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  chassisPivot.add(lowerBody);

  // Hood / Front Nose
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.68, isSupercar ? 0.24 : 0.34, 1.55), bodyMat);
  hood.position.set(0, isSupercar ? 0.66 : 0.78, 1.25);
  hood.rotation.x = isSupercar ? 0.09 : 0.02;
  hood.castShadow = true;
  chassisPivot.add(hood);

  // Racing stripe / police doors
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(isPolice ? 1.88 : 0.38, isPolice ? 0.44 : 0.04, isPolice ? 1.6 : 4.25),
    accentMat
  );
  stripe.position.set(0, isPolice ? 0.56 : 0.78, isPolice ? 0.0 : 0.02);
  chassisPivot.add(stripe);

  // Cabin / Open Cockpit
  if (cfg.openTop) {
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.48, 0.22), leatherMat);
    seatBack.position.set(0, 0.86, -0.58);
    seatBack.rotation.x = -0.15;
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.18, 0.72), leatherMat);
    seatBase.position.set(0, 0.62, -0.25);
    chassisPivot.add(seatBack, seatBase);

    const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.32, 1.25), bodyMat);
    rearDeck.position.set(0, 0.74, -1.38);
    rearDeck.castShadow = true;
    chassisPivot.add(rearDeck);
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, isSupercar ? 0.5 : 0.64, isSupercar ? 1.95 : 1.75), isPolice ? accentMat : bodyMat);
    cabin.position.set(0, isSupercar ? 0.9 : 1.06, -0.28);
    cabin.castShadow = true;
    chassisPivot.add(cabin);

    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(1.59, isSupercar ? 0.34 : 0.44, isSupercar ? 1.55 : 1.38), glassMat);
    cabinGlass.position.set(0, isSupercar ? 0.92 : 1.08, -0.28);
    chassisPivot.add(cabinGlass);
  }

  // Windshield
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.46, 0.05), glassMat);
  ws.position.set(0, isSupercar ? 0.88 : 1.04, 0.52);
  ws.rotation.x = isSupercar ? -0.55 : -0.32;
  chassisPivot.add(ws);

  // Rear Spoiler for Supercar / Muscle
  if (isSupercar || cfg.spoiler) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.06, 0.32), accentMat);
    wing.position.set(0, 0.96, -2.02);
    wing.castShadow = true;
    [-0.58, 0.58].forEach((sx) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.16), chromeMat);
      strut.position.set(sx, 0.82, -2.0);
      chassisPivot.add(strut);
    });
    chassisPivot.add(wing);
  }

  // Police Lightbar
  let sirenRedMat = null;
  let sirenBlueMat = null;
  if (isPolice) {
    sirenRedMat = new THREE.MeshStandardMaterial({ color: '#ff1f3d', emissive: '#ff1f3d', emissiveIntensity: 0.4 });
    sirenBlueMat = new THREE.MeshStandardMaterial({ color: '#1f8bff', emissive: '#1f8bff', emissiveIntensity: 0.4 });
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.22), chromeMat);
    barBase.position.set(0, 1.42, -0.2);
    const barRed = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.24), sirenRedMat);
    barRed.position.set(-0.28, 1.44, -0.2);
    const barBlue = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.24), sirenBlueMat);
    barBlue.position.set(0.28, 1.44, -0.2);
    chassisPivot.add(barBase, barRed, barBlue);
  }

  // Steering wheel
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(-0.36, 0.86, 0.26);
  steeringWheelGroup.rotation.x = 0.55;
  const steerRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 18), rubberMat);
  const steerSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.015), chromeMat);
  steeringWheelGroup.add(steerRim, steerSpoke);
  chassisPivot.add(steeringWheelGroup);

  // Grille, Bumpers, Dual Exhaust & Nitro Flames
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.22, 0.08), chromeMat);
  grille.position.set(0, 0.48, 2.16);
  chassisPivot.add(grille);

  const nitroFlames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: '#45e2ff', transparent: true, opacity: 0.0 });
  [-0.48, 0.48].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.34, -2.18);
    chassisPivot.add(pipe);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 8), flameMat);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(ex, 0.34, -2.48);
    chassisPivot.add(flame);
    nitroFlames.push(flame);
  });

  // Underglow Neon Strip (optional for supercars/muscle)
  if (cfg.underglow) {
    const ugMat = new THREE.MeshBasicMaterial({ color: cfg.underglow, transparent: true, opacity: 0.85 });
    const ugStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2), ugMat);
    ugStrip.rotation.x = Math.PI / 2;
    ugStrip.position.y = 0.14;
    chassisPivot.add(ugStrip);
  }

  // Headlights & Taillights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#fff8e0',
    emissive: '#ffd584',
    emissiveIntensity: 1.8,
    roughness: 0.1
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#9e1118',
    emissive: '#ff1f2d',
    emissiveIntensity: 0.85,
    roughness: 0.2
  });

  [-0.62, 0.62].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.08), headlightMat);
    hl.position.set(lx, 0.58, 2.16);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.08), taillightMat);
    tl.position.set(lx, 0.62, -2.16);
    chassisPivot.add(hl, tl);
  });

  let headSpot = null;
  if (!cfg.isAI) {
    headSpot = new THREE.SpotLight('#ffebc2', 3.6, 36, Math.PI * 0.24, 0.55, 1.3);
    headSpot.position.set(0, 0.72, 2.15);
    const headSpotTarget = new THREE.Object3D();
    headSpotTarget.position.set(0, 0.15, 15);
    chassisPivot.add(headSpot, headSpotTarget);
    headSpot.target = headSpotTarget;
  }

  // 4 Articulated Wheels
  const wheels = [];
  const frontSteerPivots = [];
  const wheelRadius = 0.35;
  const wheelCoords = [
    { x: -0.9, z: 1.36, front: true },
    { x: 0.9, z: 1.36, front: true },
    { x: -0.9, z: -1.36, front: false },
    { x: 0.9, z: -1.36, front: false }
  ];

  wheelCoords.forEach((wp) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wp.x, wheelRadius, wp.z);
    root.add(steerPivot);

    const rollPivot = new THREE.Group();
    steerPivot.add(rollPivot);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 20), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    rollPivot.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.64, wheelRadius * 0.64, 0.25, 14), chromeMat);
    rim.rotation.z = Math.PI / 2;
    rollPivot.add(rim);

    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.032, wheelRadius * 1.15), accentMat);
      spoke.rotation.x = (s / 5) * Math.PI;
      rollPivot.add(spoke);
    }

    wheels.push(rollPivot);
    if (wp.front) frontSteerPivots.push(steerPivot);
  });

  const driverSeatAnchor = new THREE.Group();
  driverSeatAnchor.position.set(-0.36, 0.16, -0.25);
  chassisPivot.add(driverSeatAnchor);

  if (!cfg.isAI) {
    root.traverse((obj) => {
      if (obj.isMesh) obj.userData.carId = cfg.id;
    });
  }

  if (scene) scene.add(root);

  return {
    id: cfg.id,
    name: cfg.name,
    color: cfg.color,
    style: cfg.style,
    root,
    chassisPivot,
    steeringWheelGroup,
    wheels,
    frontSteerPivots,
    headlightMat,
    taillightMat,
    headSpot,
    sirenRedMat,
    sirenBlueMat,
    nitroFlames,
    flameMat,
    driverSeatAnchor,
    speed: 0,
    steerAngle: 0,
    yaw: cfg.rotY || 0,
    lightsOn: true,
    sirenOn: false,
    nitro: 100,
    wheelRadius,
    maxSpeed: cfg.maxSpeed || 28
  };
}

export function populateAllVehicles(scene, contactShadowTex) {
  const drivableCars = [
    createVehicleMesh({
      id: 'vice_v12',
      name: 'Pegassi Vice V12',
      style: 'supercar',
      color: '#ff5226',
      accentColor: '#16181f',
      underglow: '#ff3878',
      openTop: false,
      x: 34, z: -26, rotY: Math.PI,
      maxSpeed: 38
    }, contactShadowTex, scene),
    createVehicleMesh({
      id: 'banshee_gt',
      name: 'Banshee GT Roadster',
      style: 'supercar',
      color: '#19a8d9',
      accentColor: '#f7f3ea',
      underglow: '#38e8ff',
      openTop: true,
      x: -36, z: -4.2, rotY: Math.PI / 2,
      maxSpeed: 34
    }, contactShadowTex, scene),
    createVehicleMesh({
      id: 'dominator_71',
      name: 'Dominator Muscle ’71',
      style: 'muscle',
      color: '#5b2880',
      accentColor: '#e6b84c',
      spoiler: true,
      matte: true,
      openTop: false,
      x: -14, z: 32, rotY: Math.PI / 2,
      maxSpeed: 31
    }, contactShadowTex, scene),
    createVehicleMesh({
      id: 'leonida_cruiser',
      name: 'Leonida Interceptor',
      style: 'police',
      color: '#161920',
      accentColor: '#f2f4f8',
      openTop: false,
      x: -16, z: -32, rotY: 0,
      maxSpeed: 33
    }, contactShadowTex, scene),
    createVehicleMesh({
      id: 'delahaye_32',
      name: '1932 Delahaye Classic',
      style: 'classic',
      color: '#8f1d24',
      accentColor: '#efe3cb',
      openTop: true,
      x: -44, z: 4.5, rotY: Math.PI / 2,
      maxSpeed: 24
    }, contactShadowTex, scene)
  ];

  // AI Traffic Loop (clockwise around the outer grand boulevard: x=±34, z=±34)
  const loopWaypoints = [
    new THREE.Vector3(34, 0.04, -34),
    new THREE.Vector3(34, 0.04, 34),
    new THREE.Vector3(-34, 0.04, 34),
    new THREE.Vector3(-34, 0.04, -34)
  ];
  const aiColors = ['#d9d9de', '#264653', '#e76f51', '#2a9d8f', '#8d99ae', '#e9c46a'];
  const aiTraffic = [];

  for (let i = 0; i < 6; i++) {
    const wpIdx = i % loopWaypoints.length;
    const nextIdx = (wpIdx + 1) % loopWaypoints.length;
    const pA = loopWaypoints[wpIdx];
    const pB = loopWaypoints[nextIdx];
    const t = (i * 0.37) % 1;
    const spawn = pA.clone().lerp(pB, t);
    const car = createVehicleMesh({
      id: `ai_${i}`,
      name: 'Traffic',
      style: i % 3 === 0 ? 'muscle' : 'classic',
      color: aiColors[i],
      accentColor: '#222429',
      isAI: true,
      x: spawn.x,
      z: spawn.z,
      rotY: Math.atan2(pB.x - pA.x, pB.z - pA.z)
    }, contactShadowTex, scene);
    aiTraffic.push({
      car,
      targetIdx: nextIdx,
      waypoints: loopWaypoints,
      baseSpeed: 7.5 + (i % 3) * 1.4
    });
  }

  // 2 Police Pursuit Cruisers (parked or patrolling until wantedLevel >= 1)
  const policeUnits = [
    { x: 4, z: -64, rotY: Math.PI / 2 },
    { x: -4, z: 64, rotY: -Math.PI / 2 }
  ].map((p, idx) => {
    const car = createVehicleMesh({
      id: `cop_${idx}`,
      name: 'Patrol Unit',
      style: 'police',
      color: '#14171f',
      accentColor: '#f2f4f8',
      isAI: true,
      x: p.x,
      z: p.z,
      rotY: p.rotY
    }, contactShadowTex, scene);
    return { car, home: new THREE.Vector3(p.x, 0.04, p.z), speed: 0 };
  });

  return { drivableCars, aiTraffic, policeUnits };
}
