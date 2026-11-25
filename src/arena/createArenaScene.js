import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { LIGHTING_PRESETS, createAtmosphericSky, createOceanWater, ViceColorGradeShader } from './shaders.js';
import { createHumanModel, poseHumanDriving, poseHumanWalking, createNameplate, populateCitizensAndNPCs } from './humans.js';
import { CarAudioEngine, populateAllVehicles } from './vehicles.js';
import { buildLeonidaArena } from './cityWorld.js';
import { StoryCampaignEngine } from './storyEngine.js';

export function createArenaScene({
  container,
  onHudUpdate = () => {},
  onToast = () => {},
  onReturnToLibrary = () => {},
  onDialogue = () => {},
  onCipher = () => {},
  onLandmarkSelect = () => {},
  onHover = () => {},
  onPose = () => {}
}) {
  const TOWN_ENTRY = {
    position: new THREE.Vector3(-51.5, 1.68, 0),
    target: new THREE.Vector3(-48.5, 1.68, 0)
  };

  const state = {
    currentTime: 'sunset',
    active: false,
    inputEnabled: true,
    cameraTransition: null,
    keys: {},
    touchMoves: new Set(),
    pointerDownPos: { x: 0, y: 0 },
    isDragging: false,
    lookPointerId: null,
    lastPointer: new THREE.Vector2(),
    walkCycle: 0,
    movementAmount: 0,
    playerVerticalVel: 0,
    playerHeightOffset: 0,
    isGrounded: true,
    cameraMode: 'first',
    carCameraMode: 'chase',
    activeCar: null,
    bloomEnabled: true,
    gradeEnabled: true,
    shadowsEnabled: true,
    lookSensitivity: 1.0,
    playerHp: 100,
    impactCooldown: 0,
    flyoverMode: false,
    cutsceneShot: null
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight), 0.1, 450);
  camera.position.copy(TOWN_ENTRY.position);
  camera.rotation.order = 'YXZ';
  let cameraYaw = -Math.PI / 2;
  let cameraPitch = 0;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHTING_PRESETS.sunset.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight),
    0.38,
    0.55,
    0.8
  );
  const gradePass = new ShaderPass(ViceColorGradeShader);
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(gradePass);
  composer.addPass(outputPass);

  const sky = createAtmosphericSky();
  scene.add(sky.mesh);
  const ocean = createOceanWater();
  scene.add(ocean.mesh);
  scene.fog = new THREE.FogExp2(LIGHTING_PRESETS.sunset.fogColor, LIGHTING_PRESETS.sunset.fogDensity);

  const hemiLight = new THREE.HemisphereLight(LIGHTING_PRESETS.sunset.hemiSky, LIGHTING_PRESETS.sunset.hemiGround, LIGHTING_PRESETS.sunset.hemiIntensity);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(LIGHTING_PRESETS.sunset.sunColor, LIGHTING_PRESETS.sunset.sunIntensity);
  sunLight.position.copy(LIGHTING_PRESETS.sunset.sunPos);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 260;
  const d = 88;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  let currentEnvRT = null;
  function updateEnvironmentReflection(p) {
    const envScene = new THREE.Scene();
    const sGeo = new THREE.SphereGeometry(20, 20, 14);
    const sMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { topColor: { value: p.skyTop }, horizonColor: { value: p.skyHorizon }, groundColor: { value: p.hemiGround } },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 topColor,horizonColor,groundColor; varying vec3 vP; void main(){ float h=normalize(vP).y; gl_FragColor=vec4((h>=0.0?mix(horizonColor,topColor,smoothstep(0.0,0.7,h)):mix(horizonColor,groundColor,smoothstep(0.0,-0.5,h)))*1.2,1.0); }`
    });
    envScene.add(new THREE.Mesh(sGeo, sMat));
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 10), new THREE.MeshBasicMaterial({ color: p.sunGlow }));
    orb.position.copy(p.sunPos).normalize().multiplyScalar(14);
    envScene.add(orb);
    const nextRT = pmremGenerator.fromScene(envScene, 0.035);
    if (currentEnvRT) currentEnvRT.dispose();
    currentEnvRT = nextRT;
    scene.environment = nextRT.texture;
    sGeo.dispose();
    sMat.dispose();
    orb.geometry.dispose();
    orb.material.dispose();
  }
  updateEnvironmentReflection(LIGHTING_PRESETS.sunset);

  const interactiveLandmarks = [];
  function registerLandmark(data) {
    data.group.traverse((child) => {
      if (child.isMesh) child.userData.landmarkId = data.id;
    });
    interactiveLandmarks.push(data);
  }

  const world = buildLeonidaArena({ scene, renderer, onRegisterLandmark: registerLandmark });
  const { pedestrians, storyNPCs } = populateCitizensAndNPCs(scene, world.contactShadowTex);
  const { drivableCars, aiTraffic, policeUnits } = populateAllVehicles(scene, world.contactShadowTex);
  const carAudio = new CarAudioEngine();

  let localPlayerRig = createHumanModel({
    coat: '#1d4f6e',
    pants: '#1c2029',
    skin: '#dba986',
    hairColor: '#241913',
    tieColor: '#ff3d7f',
    sunglasses: true,
    shortSleeves: false
  }, world.contactShadowTex);
  localPlayerRig.root.position.set(TOWN_ENTRY.position.x, 0.05, TOWN_ENTRY.position.z);
  localPlayerRig.root.visible = false;
  scene.add(localPlayerRig.root);

  // Rain & Tire Smoke
  const rainCount = 750;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 90;
    rainPositions[i * 3 + 1] = Math.random() * 26;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainPoints = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#b7d4f2', size: 0.14, transparent: true, opacity: 0.45 }));
  rainPoints.visible = false;
  scene.add(rainPoints);

  const tireSmokePuffs = [];
  const smokeGeo = new THREE.SphereGeometry(0.28, 7, 7);
  function spawnTireSmoke(x, z) {
    const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: '#e2e5eb', transparent: true, opacity: 0.45, depthWrite: false }));
    m.position.set(x, 0.22, z);
    scene.add(m);
    tireSmokePuffs.push({ mesh: m, age: 0 });
    if (tireSmokePuffs.length > 28) {
      const old = tireSmokePuffs.shift();
      scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
  }

  function applyLightingPreset(presetKey) {
    const p = LIGHTING_PRESETS[presetKey];
    if (!p) return;
    state.currentTime = presetKey;
    sky.uniforms.topColor.value.copy(p.skyTop);
    sky.uniforms.midColor.value.copy(p.skyMid);
    sky.uniforms.horizonColor.value.copy(p.skyHorizon);
    sky.uniforms.sunDir.value.copy(p.sunPos).normalize();
    sky.uniforms.sunColor.value.copy(p.sunGlow);
    sky.uniforms.starIntensity.value = p.starIntensity;
    ocean.uniforms.uSunDir.value.copy(p.sunPos).normalize();
    ocean.uniforms.uSunColor.value.copy(p.sunGlow);
    ocean.uniforms.uSkyColor.value.copy(p.skyHorizon);
    updateEnvironmentReflection(p);

    scene.fog.color.copy(p.fogColor);
    scene.fog.density = p.fogDensity;
    sunLight.color.copy(p.sunColor);
    sunLight.intensity = p.sunIntensity;
    sunLight.position.copy(p.sunPos);
    hemiLight.color.copy(p.hemiSky);
    hemiLight.groundColor.copy(p.hemiGround);
    hemiLight.intensity = p.hemiIntensity;
    world.sharedWindowGlowMat.emissiveIntensity = p.windowEmissive;
    world.neonMaterials.forEach((m) => { m.emissiveIntensity = p.neonEmissive; });
    world.streetLampBulbs.forEach((b) => { b.emissiveIntensity = presetKey === 'tropicalNoon' ? 0.25 : 2.2; });
    renderer.toneMappingExposure = p.exposure;
    rainPoints.visible = p.rainIntensity > 0;
  }

  const story = new StoryCampaignEngine({
    scene,
    onPresetChange: applyLightingPreset,
    onToast,
    onPlayChime: () => carAudio.playChime()
  });

  const playerPosition = new THREE.Vector3(TOWN_ENTRY.position.x, 0, TOWN_ENTRY.position.z);
  const playerVelocity = new THREE.Vector3();
  const controls = {
    target: TOWN_ENTRY.target.clone(),
    update() {
      camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
      camera.updateMatrixWorld();
      this.target.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 3);
    }
  };

  const remotePlayers = new Map();
  function setRemotePlayers(players) {
    const activeIds = new Set(players.map((p) => p.id));
    for (const [id, r] of remotePlayers) {
      if (!activeIds.has(id)) {
        scene.remove(r.rig.root);
        remotePlayers.delete(id);
      }
    }
    players.forEach((p) => {
      let remote = remotePlayers.get(p.id);
      if (!remote) {
        const rig = createHumanModel({ coat: '#26a69a', sunglasses: true }, world.contactShadowTex);
        rig.root.add(createNameplate(p.name, '#ff4ec7'));
        scene.add(rig.root);
        remote = { rig, target: new THREE.Vector3(), yaw: 0, walking: false, phase: 0, waveUntil: 0 };
        remotePlayers.set(p.id, remote);
      }
      remote.target.set(p.pose?.x ?? 0, 0.14, p.pose?.z ?? 0);
      remote.yaw = p.pose?.yaw ?? 0;
      remote.walking = Boolean(p.pose?.moving);
    });
  }

  function showPlayerAction(playerId, action) {
    if (action !== 'wave') return;
    const remote = remotePlayers.get(playerId);
    if (remote) remote.waveUntil = performance.now() + 1300;
  }

  function getNearestCar(maxDist = 4.5) {
    let best = null;
    let bestD = maxDist;
    for (const c of drivableCars) {
      const dCar = Math.hypot(playerPosition.x - c.root.position.x, playerPosition.z - c.root.position.z);
      if (dCar < bestD) {
        bestD = dCar;
        best = c;
      }
    }
    return best;
  }

  function enterCar(car) {
    if (!car) return;
    state.cameraTransition = null;
    state.activeCar = car;
    playerVelocity.set(0, 0, 0);
    carAudio.startEngine();
    car.driverSeatAnchor.add(localPlayerRig.root);
    localPlayerRig.root.position.set(0, 0, 0);
    localPlayerRig.root.rotation.set(0, 0, 0);
    localPlayerRig.root.visible = true;
    poseHumanDriving(localPlayerRig, 0);
    cameraYaw = car.yaw + Math.PI;
    cameraPitch = -0.14;
  }

  function exitCar() {
    const car = state.activeCar;
    if (!car) return;
    car.speed = 0;
    car.sirenOn = false;
    carAudio.stopEngine();
    const side = new THREE.Vector3(-1.8, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw);
    playerPosition.set(
      THREE.MathUtils.clamp(car.root.position.x + side.x, -68, 52),
      0,
      THREE.MathUtils.clamp(car.root.position.z + side.z, -68, 68)
    );
    scene.add(localPlayerRig.root);
    localPlayerRig.root.position.set(playerPosition.x, 0.05, playerPosition.z);
    localPlayerRig.root.visible = state.cameraMode === 'third';
    state.activeCar = null;
    cameraPitch = 0;
  }

  function canCarMoveTo(x, z) {
    const r = 1.15;
    if (x < -70 + r || x > 56 - r || z < -70 + r || z > 70 - r) return false;
    if (world.walkObstacles.some((o) => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ)) return false;
    return !world.carObstacles.some((o) => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
  }

  function canWalkTo(x, z) {
    const r = 0.28;
    if (x < -70 + r || x > 62 - r || z < -70 + r || z > 70 - r) return false;
    return !world.walkObstacles.some((o) => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
  }

  function updateCarPhysics(dt, elapsed) {
    const car = state.activeCar;
    if (!car) return;
    const throttle = Number(state.keys.w || state.keys.arrowup || state.touchMoves.has('forward'))
      - Number(state.keys.s || state.keys.arrowdown || state.touchMoves.has('backward'));
    const steerInput = Number(state.keys.a || state.keys.arrowleft || state.touchMoves.has('left'))
      - Number(state.keys.d || state.keys.arrowright || state.touchMoves.has('right'));
    const handbrake = Boolean(state.keys[' ']);
    const boosting = Boolean(state.keys.shift) && throttle > 0 && car.nitro > 2;

    if (boosting) car.nitro = Math.max(0, car.nitro - 28 * dt);
    else car.nitro = Math.min(100, car.nitro + 12 * dt);

    car.flameMat.opacity = boosting ? 0.85 : 0;
    car.nitroFlames.forEach((f) => { f.scale.y = 0.7 + Math.sin(elapsed * 45) * 0.35; });

    const topSpeed = boosting ? car.maxSpeed * 1.28 : car.maxSpeed;
    if (handbrake) car.speed *= Math.exp(-4.8 * dt);
    else if (throttle > 0) car.speed = Math.min(topSpeed, car.speed + (boosting ? 24 : 15) * dt);
    else if (throttle < 0) car.speed = car.speed > 0.6 ? Math.max(0, car.speed - 24 * dt) : Math.max(-10, car.speed - 10 * dt);
    else {
      car.speed *= Math.exp(-1.5 * dt);
      if (Math.abs(car.speed) < 0.05) car.speed = 0;
    }

    car.steerAngle += (steerInput * 0.54 - car.steerAngle) * Math.min(1, dt * 8.5);
    car.frontSteerPivots.forEach((p) => { p.rotation.y = car.steerAngle; });
    car.steeringWheelGroup.rotation.z = -car.steerAngle * 2.1;

    const speedFactor = Math.min(1, Math.abs(car.speed) / 3.5);
    const turnDir = car.speed >= 0 ? 1 : -1;
    car.yaw += car.steerAngle * (handbrake ? 3.1 : 2.35) * speedFactor * turnDir * dt;
    car.root.rotation.y = car.yaw;

    const vx = Math.sin(car.yaw) * car.speed;
    const vz = Math.cos(car.yaw) * car.speed;
    const nx = car.root.position.x + vx * dt;
    const nz = car.root.position.z + vz * dt;
    if (canCarMoveTo(nx, car.root.position.z)) car.root.position.x = nx; else car.speed *= -0.25;
    if (canCarMoveTo(car.root.position.x, nz)) car.root.position.z = nz; else car.speed *= -0.25;

    resolveCarCollisions(car, dt);
    resolvePedestrianImpacts(car, dt);

    if ((handbrake || Math.abs(car.steerAngle) > 0.38) && Math.abs(car.speed) > 9 && Math.random() < 0.45) {
      spawnTireSmoke(car.root.position.x - Math.sin(car.yaw) * 1.4, car.root.position.z - Math.cos(car.yaw) * 1.4);
    }

    car.wheels.forEach((w) => { w.rotation.x += (car.speed * dt) / car.wheelRadius; });
    car.chassisPivot.rotation.z = THREE.MathUtils.lerp(car.chassisPivot.rotation.z, -car.steerAngle * speedFactor * 0.09, 0.14);
    car.chassisPivot.rotation.x = THREE.MathUtils.lerp(car.chassisPivot.rotation.x, (throttle < 0 || handbrake ? 0.028 : -throttle * 0.02), 0.12);
    car.taillightMat.emissiveIntensity = (throttle < 0 || handbrake) ? 2.6 : 0.85;

    if (car.sirenRedMat && car.sirenBlueMat) {
      const flash = car.sirenOn ? Math.sin(elapsed * 16) > 0 : false;
      car.sirenRedMat.emissiveIntensity = car.sirenOn ? (flash ? 3.5 : 0.2) : 0.4;
      car.sirenBlueMat.emissiveIntensity = car.sirenOn ? (!flash ? 3.5 : 0.2) : 0.4;
    }

    poseHumanDriving(localPlayerRig, car.steerAngle);
    carAudio.updateEngine(Math.abs(car.speed), true, boosting, car.sirenOn || story.wantedStars > 0, elapsed);
    playerPosition.set(car.root.position.x, 0, car.root.position.z);

    const targetFov = boosting ? 64 : 52;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
    camera.updateProjectionMatrix();

    if (!state.isDragging && state.carCameraMode === 'chase') {
      let diff = (car.yaw + Math.PI) - cameraYaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      cameraYaw += diff * Math.min(1, dt * 3.8);
      cameraPitch += (-0.15 - cameraPitch) * Math.min(1, dt * 3.5);
    }

    if (state.carCameraMode === 'hood') {
      const hOff = new THREE.Vector3(-0.36, 1.32, -0.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw);
      camera.position.copy(car.root.position).add(hOff);
      if (!state.isDragging) {
        cameraYaw = car.yaw + Math.PI;
        cameraPitch = -0.04;
      }
      controls.update();
    } else {
      const dist = state.carCameraMode === 'orbit' ? 7.8 : 6.4;
      const focus = new THREE.Vector3(car.root.position.x, 1.25, car.root.position.z);
      const cx = THREE.MathUtils.clamp(focus.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * dist, -70, 62);
      const cz = THREE.MathUtils.clamp(focus.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * dist, -70, 70);
      const cy = Math.max(0.85, focus.y - Math.sin(cameraPitch) * dist + 1.3);
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.exp(-9 * dt));
      camera.lookAt(focus);
      controls.target.copy(focus);
    }
  }

  function updateNavigation(dt, elapsed) {
    if (!state.inputEnabled) return;
    if (state.activeCar) {
      updateCarPhysics(dt, elapsed);
      return;
    }

    const fwd = Number(state.keys.w || state.keys.arrowup || state.touchMoves.has('forward'))
      - Number(state.keys.s || state.keys.arrowdown || state.touchMoves.has('backward'));
    const side = Number(state.keys.d || state.keys.arrowright || state.touchMoves.has('right'))
      - Number(state.keys.a || state.keys.arrowleft || state.touchMoves.has('left'));
    const sprinting = Boolean(state.keys.shift);
    const desired = new THREE.Vector3(side, 0, -fwd);
    if (desired.lengthSq()) desired.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    desired.multiplyScalar(sprinting ? 6.2 : 3.0);
    playerVelocity.lerp(desired, 1 - Math.exp(-12 * dt));

    const mx = playerVelocity.x * dt;
    const mz = playerVelocity.z * dt;
    if (Math.abs(mx) > 0.0001 && canWalkTo(playerPosition.x + mx, playerPosition.z)) playerPosition.x += mx;
    else playerVelocity.x = 0;
    if (Math.abs(mz) > 0.0001 && canWalkTo(playerPosition.x, playerPosition.z + mz)) playerPosition.z += mz;
    else playerVelocity.z = 0;

    if (!state.isGrounded || state.playerHeightOffset > 0) {
      state.playerVerticalVel -= 15.5 * dt;
      state.playerHeightOffset += state.playerVerticalVel * dt;
      if (state.playerHeightOffset <= 0) {
        state.playerHeightOffset = 0;
        state.playerVerticalVel = 0;
        state.isGrounded = true;
      }
    }

    const spd = Math.hypot(playerVelocity.x, playerVelocity.z);
    state.movementAmount = Math.min(1.6, spd / 3.0);
    if (state.movementAmount > 0.04) state.walkCycle += dt * (sprinting ? 14.5 : 10.5);
    const bob = Math.sin(state.walkCycle) * (sprinting ? 0.036 : 0.024) * Math.min(1.2, state.movementAmount);

    localPlayerRig.root.position.set(playerPosition.x, 0.05 + state.playerHeightOffset, playerPosition.z);
    if (spd > 0.25) {
      let yd = Math.atan2(playerVelocity.x, playerVelocity.z) - localPlayerRig.root.rotation.y;
      yd = Math.atan2(Math.sin(yd), Math.cos(yd));
      localPlayerRig.root.rotation.y += yd * Math.min(1, dt * 10);
    } else {
      localPlayerRig.root.rotation.y = cameraYaw + Math.PI;
    }
    poseHumanWalking(localPlayerRig, Math.min(1.25, state.movementAmount), state.walkCycle, elapsed);

    if (state.cameraMode === 'third') {
      localPlayerRig.root.visible = true;
      const focus = new THREE.Vector3(playerPosition.x, 1.48 + state.playerHeightOffset, playerPosition.z);
      const dist = 3.5;
      camera.position.set(
        THREE.MathUtils.clamp(focus.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * dist, -70, 62),
        Math.max(0.65, focus.y - Math.sin(cameraPitch) * dist + 0.35),
        THREE.MathUtils.clamp(focus.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * dist, -70, 70)
      );
      camera.lookAt(focus);
      controls.target.copy(focus);
    } else {
      localPlayerRig.root.visible = false;
      camera.position.set(playerPosition.x, 1.68 + state.playerHeightOffset + bob, playerPosition.z);
      controls.update();
    }
  }

  function damagePlayer(amount) {
    state.playerHp = Math.max(0, state.playerHp - amount);
    if (state.playerHp <= 0) {
      if (state.activeCar) exitCar();
      state.playerHp = 100;
      story.wantedStars = 0;
      playerPosition.set(-46, 0, -24);
      onToast('Wasted! Treated at Vieux Bay Clinic — Wanted Heat cleared.');
    }
  }

  function resolveCarCollisions(playerCar) {
    const allOtherVehicles = [
      ...drivableCars.filter((c) => c !== playerCar).map((c) => ({ car: c, kind: c.style === 'police' ? 'police' : 'parked' })),
      ...aiTraffic.map((a) => ({ car: a.car, kind: 'traffic' })),
      ...policeUnits.map((u) => ({ car: u.car, kind: 'police' }))
    ];

    const minSep = 2.75;
    for (const entry of allOtherVehicles) {
      const other = entry.car;
      const dx = playerCar.root.position.x - other.root.position.x;
      const dz = playerCar.root.position.z - other.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001 && dist < minSep) {
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minSep - dist;
        // Separate both vehicles cleanly so cars never pass through one another
        const pPush = entry.kind === 'parked' ? overlap * 0.65 : overlap * 0.55;
        const oPush = overlap - pPush;
        const px = playerCar.root.position.x + nx * pPush;
        const pz = playerCar.root.position.z + nz * pPush;
        if (canCarMoveTo(px, pz)) playerCar.root.position.set(px, 0.04, pz);

        const ox = other.root.position.x - nx * oPush;
        const oz = other.root.position.z - nz * oPush;
        if (canCarMoveTo(ox, oz)) other.root.position.set(ox, 0.04, oz);

        const impactSpd = Math.abs(playerCar.speed);
        if (impactSpd > 4.5 && state.impactCooldown <= 0) {
          state.impactCooldown = 0.28;
          carAudio.playImpact(Math.min(1, impactSpd / 28));
          if (entry.kind === 'police') {
            story.triggerWanted(2);
            onToast('Patrol Unit rammed! 2-Star Wanted Heat!');
          } else if (impactSpd > 14) {
            story.triggerWanted(1);
          }
          if (impactSpd > 19) damagePlayer(Math.round((impactSpd - 16) * 1.4));
        }
        playerCar.speed *= -0.32;
      }
    }
  }

  function resolvePedestrianImpacts(playerCar) {
    const impactSpd = Math.abs(playerCar.speed);
    const carX = playerCar.root.position.x;
    const carZ = playerCar.root.position.z;
    const carSin = Math.sin(playerCar.yaw);
    const carCos = Math.cos(playerCar.yaw);

    for (const p of pedestrians) {
      if (!p.alive) continue;
      const pos = p.rig.root.position;
      const dx = pos.x - carX;
      const dz = pos.z - carZ;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.68) {
        const pushX = dist > 0.01 ? dx / dist : carSin;
        const pushZ = dist > 0.01 ? dz / dist : carCos;

        if (impactSpd > 2.4) {
          const dmg = Math.min(100, Math.round(impactSpd * 14));
          p.hp = Math.max(0, p.hp - dmg);
          const launch = Math.min(16, 4.5 + impactSpd * 0.65);
          p.knockVel.set(pushX * launch + carSin * 3, 0, pushZ * launch + carCos * 3);
          p.knockTimer = 0.55;
          carAudio.playImpact(Math.min(1, impactSpd / 18));

          if (p.hp <= 0) {
            p.alive = false;
            p.respawnTimer = 10.0;
            p.fallAngle = Math.PI / 2;
            p.rig.root.rotation.x = Math.PI / 2;
            p.rig.root.position.y = 0.22;
            story.knockdowns += 1;
            story.addCash(25);
            story.triggerWanted(story.knockdowns >= 3 ? 3 : story.knockdowns >= 2 ? 2 : 1);
            onToast(`Citizen down! +$25 · Wanted Level ${'★'.repeat(story.wantedStars)}`);
          }
          playerCar.speed *= 0.88;
        } else {
          // Gentle bump pushes citizen clear instead of ghosting through
          pos.x = carX + pushX * 1.72;
          pos.z = carZ + pushZ * 1.72;
        }
      }
    }

    // Story NPCs dodge safely out of the way so missions never soft-lock
    for (const n of storyNPCs) {
      const pos = n.rig.root.position;
      const dx = pos.x - carX;
      const dz = pos.z - carZ;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.01 && dist < 2.15) {
        pos.x = carX + (dx / dist) * 2.2;
        pos.z = carZ + (dz / dist) * 2.2;
      }
    }
  }

  // AI Traffic & Police Pursuit
  function updateTrafficAndPolice(dt, elapsed) {
    if (state.impactCooldown > 0) state.impactCooldown = Math.max(0, state.impactCooldown - dt);
    if (story.wantedStars === 0 && state.playerHp < 100) {
      state.playerHp = Math.min(100, state.playerHp + 2.5 * dt);
    }

    aiTraffic.forEach((ai) => {
      const tgt = ai.waypoints[ai.targetIdx];
      const pos = ai.car.root.position;
      const dx = tgt.x - pos.x;
      const dz = tgt.z - pos.z;
      if (Math.hypot(dx, dz) < 2.2) {
        ai.targetIdx = (ai.targetIdx + 1) % ai.waypoints.length;
        return;
      }
      const pDist = Math.hypot(playerPosition.x - pos.x, playerPosition.z - pos.z);
      const spd = pDist < 4.5 ? 0 : ai.baseSpeed;
      const desiredYaw = Math.atan2(dx, dz);
      let diff = desiredYaw - ai.car.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      ai.car.yaw += diff * Math.min(1, dt * 5);
      ai.car.root.rotation.y = ai.car.yaw;
      pos.x += Math.sin(ai.car.yaw) * spd * dt;
      pos.z += Math.cos(ai.car.yaw) * spd * dt;
      ai.car.wheels.forEach((w) => { w.rotation.x += (spd * dt) / 0.35; });
    });

    policeUnits.forEach((u) => {
      const flash = story.wantedStars > 0 ? Math.sin(elapsed * 16) > 0 : false;
      u.car.sirenRedMat.emissiveIntensity = story.wantedStars > 0 ? (flash ? 3.5 : 0.2) : 0.3;
      u.car.sirenBlueMat.emissiveIntensity = story.wantedStars > 0 ? (!flash ? 3.5 : 0.2) : 0.3;
      const target = story.wantedStars > 0 ? playerPosition : u.home;
      const dx = target.x - u.car.root.position.x;
      const dz = target.z - u.car.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > (story.wantedStars > 0 ? 4.2 : 1.5)) {
        const spd = story.wantedStars > 0 ? 15.5 + story.wantedStars * 2.5 : 6;
        const desiredYaw = Math.atan2(dx, dz);
        let diff = desiredYaw - u.car.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        u.car.yaw += diff * Math.min(1, dt * 4.2);
        u.car.root.rotation.y = u.car.yaw;
        const nx = u.car.root.position.x + Math.sin(u.car.yaw) * spd * dt;
        const nz = u.car.root.position.z + Math.cos(u.car.yaw) * spd * dt;
        if (canCarMoveTo(nx, nz)) u.car.root.position.set(nx, 0.04, nz);
        u.car.wheels.forEach((w) => { w.rotation.x += (spd * dt) / 0.35; });
      }
      if (story.wantedStars > 0 && dist < 4.4 && state.impactCooldown <= 0) {
        state.impactCooldown = 1.1;
        carAudio.playImpact(0.75);
        damagePlayer(10 * story.wantedStars);
      }
    });
  }

  const mapClickTargets = [];
  function drawMapCanvas(canvas, full = false) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const minC = -76;
    const span = 152;
    const toPx = (wx, wz) => ({ x: ((wx - minC) / span) * w, y: ((wz - minC) / span) * h });
    const s = w / span;

    ctx.fillStyle = full ? '#141926' : '#10141f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d4bc8c';
    ctx.fillRect(toPx(47, 0).x, 0, 12 * s, h);
    ctx.fillStyle = '#0e526b';
    ctx.fillRect(toPx(58, 0).x, 0, w, h);

    ctx.fillStyle = '#2d3240';
    ctx.fillRect(0, toPx(0, -6).y, toPx(40, 0).x, 12 * s);
    ctx.fillRect(toPx(-6, 0).x, 0, 12 * s, h);
    ctx.fillRect(0, toPx(0, -39).y, toPx(40, 0).x, 10 * s);
    ctx.fillRect(0, toPx(0, 29).y, toPx(40, 0).x, 10 * s);
    ctx.fillRect(toPx(-39, 0).x, 0, 10 * s, h);
    ctx.fillRect(toPx(29, 0).x, 0, 10 * s, h);

    const missionTgt = story.getPrimaryTarget();
    if (missionTgt) {
      const p1 = toPx(playerPosition.x, playerPosition.z);
      const p2 = toPx(missionTgt.x, missionTgt.z);
      ctx.strokeStyle = '#38e8ff';
      ctx.lineWidth = full ? 3.5 : 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38e8ff';
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, full ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (full) mapClickTargets.length = 0;

    interactiveLandmarks.forEach((lm) => {
      const p = toPx(lm.hotspotPos.x, lm.hotspotPos.z);
      ctx.fillStyle = lm.id === 'athenaeum' ? '#e59a47' : '#fcd34d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, full ? 6.5 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (full) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lm.name, p.x, p.y - 10);
        mapClickTargets.push({ x: p.x, y: p.y, r: 16, type: 'landmark', landmark: lm });
      }
    });

    drivableCars.forEach((c) => {
      const cp = toPx(c.root.position.x, c.root.position.z);
      ctx.fillStyle = c.color;
      ctx.fillRect(cp.x - (full ? 5 : 3), cp.y - (full ? 7 : 4), full ? 10 : 6, full ? 14 : 8);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(cp.x - (full ? 5 : 3), cp.y - (full ? 7 : 4), full ? 10 : 6, full ? 14 : 8);
      if (full) mapClickTargets.push({ x: cp.x, y: cp.y, r: 16, type: 'car', car: c });
    });

    const pl = toPx(playerPosition.x, playerPosition.z);
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(-cameraYaw);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.32)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, full ? 24 : 15, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(0, 0, full ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function selectLandmark(landmark) {
    if (!landmark) return;
    if (landmark.id === 'athenaeum') {
      if (state.activeCar) exitCar();
      onReturnToLibrary();
      return;
    }
    state.cameraTransition = {
      startPos: camera.position.clone(),
      endPos: landmark.focusPos.clone(),
      startTarget: controls.target.clone(),
      endTarget: landmark.focusTarget.clone(),
      progress: 0,
      duration: 1.05
    };
    onLandmarkSelect(landmark);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function getHovered(cx, cy) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...interactiveLandmarks.map((l) => l.group), ...drivableCars.map((c) => c.root)], true);
    if (!hits.length) return null;
    const obj = hits[0].object;
    if (obj.userData.carId) return { type: 'car', car: drivableCars.find((c) => c.id === obj.userData.carId) };
    if (obj.userData.landmarkId) return { type: 'landmark', landmark: interactiveLandmarks.find((l) => l.id === obj.userData.landmarkId) };
    return null;
  }

  function handlePointerDown(e) {
    if (!state.active || !state.inputEnabled || e.button !== 0) return;
    state.pointerDownPos = { x: e.clientX, y: e.clientY };
    state.isDragging = true;
    state.lookPointerId = e.pointerId;
    state.lastPointer.set(e.clientX, e.clientY);
    renderer.domElement.setPointerCapture?.(e.pointerId);
    state.cameraTransition = null;
  }

  function handlePointerMove(e) {
    if (!state.active) return;
    if (state.isDragging && e.pointerId === state.lookPointerId) {
      const dx = e.clientX - state.lastPointer.x;
      const dy = e.clientY - state.lastPointer.y;
      state.lastPointer.set(e.clientX, e.clientY);
      cameraYaw -= dx * 0.0032 * state.lookSensitivity;
      cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.0028 * state.lookSensitivity, -0.78, 0.78);
      controls.update();
      onHover(null);
      return;
    }
    const found = getHovered(e.clientX, e.clientY);
    if (found?.type === 'car') onHover({ title: found.car.name, cat: 'Click or [E] to Drive', x: e.clientX, y: e.clientY });
    else if (found?.type === 'landmark') onHover({ title: found.landmark.name, cat: found.landmark.category, x: e.clientX, y: e.clientY });
    else onHover(null);
  }

  function handlePointerUp(e) {
    if (!state.active) return;
    state.isDragging = false;
    state.lookPointerId = null;
    if (Math.hypot(e.clientX - state.pointerDownPos.x, e.clientY - state.pointerDownPos.y) < 6) {
      const clicked = getHovered(e.clientX, e.clientY);
      if (clicked?.type === 'car') {
        if (state.activeCar === clicked.car) exitCar();
        else enterCar(clicked.car);
      } else if (clicked?.type === 'landmark') {
        selectLandmark(clicked.landmark);
      }
    }
  }

  function handleWheel(e) {
    if (!state.active || !state.inputEnabled) return;
    e.preventDefault();
    camera.fov = THREE.MathUtils.clamp(camera.fov * (e.deltaY > 0 ? 1.08 : 0.92), 34, 75);
    camera.updateProjectionMatrix();
  }

  const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'shift', ' ']);
  function handleKeyDown(e) {
    if (!state.active || !state.inputEnabled) return;
    if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input, textarea, select'))) return;
    const k = e.key.toLowerCase();
    if (k === 'e' && !e.repeat) {
      if (state.activeCar) exitCar();
      else if (Math.hypot(playerPosition.x + 53.5, playerPosition.z) < 3.4) onReturnToLibrary();
      else {
        const nc = getNearestCar(4.5);
        if (nc) enterCar(nc);
      }
      return;
    }
    if ((k === 'v' || k === 'c') && !e.repeat) {
      cycleCameraMode();
      return;
    }
    if (k === 'l' && !e.repeat && state.activeCar) {
      state.activeCar.lightsOn = !state.activeCar.lightsOn;
      state.activeCar.headSpot.intensity = state.activeCar.lightsOn ? 3.6 : 0;
      return;
    }
    if (k === 'h' && !e.repeat && state.activeCar) {
      carAudio.playHorn();
      return;
    }
    if (k === 'y' && !e.repeat && state.activeCar?.style === 'police') {
      state.activeCar.sirenOn = !state.activeCar.sirenOn;
      return;
    }
    if (!MOVE_KEYS.has(k)) return;
    e.preventDefault();
    if (k === ' ' && !e.repeat && !state.activeCar && state.isGrounded) {
      state.playerVerticalVel = 5.4;
      state.isGrounded = false;
    }
    state.keys[k] = true;
  }

  function handleKeyUp(e) {
    state.keys[e.key.toLowerCase()] = false;
  }

  function cycleCameraMode() {
    if (state.activeCar) {
      const order = ['chase', 'hood', 'orbit'];
      state.carCameraMode = order[(order.indexOf(state.carCameraMode) + 1) % order.length];
    } else {
      state.cameraMode = state.cameraMode === 'first' ? 'third' : 'first';
      localPlayerRig.root.visible = state.cameraMode === 'third';
    }
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  const clock = new THREE.Clock(false);
  let animId = 0;
  let hudElapsed = 0;
  let poseElapsed = 0;

  function animate() {
    if (!state.active) {
      animId = 0;
      return;
    }
    animId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    sky.uniforms.uTime.value = elapsed;
    ocean.uniforms.uTime.value = elapsed;

    if (state.flyoverMode) {
      const orbitA = elapsed * 0.14;
      camera.position.set(16 + Math.cos(orbitA) * 44, 16 + Math.sin(elapsed * 0.25) * 3.5, Math.sin(orbitA) * 44);
      const focus = new THREE.Vector3(14, 4.5, 0);
      camera.lookAt(focus);
      controls.target.copy(focus);
    } else if (state.cutsceneShot) {
      const shot = state.cutsceneShot;
      shot.progress = Math.min(1, shot.progress + dt / Math.max(0.5, shot.duration));
      const ease = 1 - Math.pow(1 - shot.progress, 2.2);
      camera.position.lerpVectors(shot.fromPos, shot.toPos, ease);
      camera.lookAt(shot.lookAt);
      controls.target.copy(shot.lookAt);
    } else if (state.cameraTransition) {
      const tr = state.cameraTransition;
      tr.progress = Math.min(1, tr.progress + dt / tr.duration);
      const t = tr.progress < 0.5 ? 4 * tr.progress ** 3 : 1 - Math.pow(-2 * tr.progress + 2, 3) / 2;
      camera.position.lerpVectors(tr.startPos, tr.endPos, t);
      controls.target.lerpVectors(tr.startTarget, tr.endTarget, t);
      camera.lookAt(controls.target);
      if (tr.progress >= 1) {
        state.cameraTransition = null;
        const dir = controls.target.clone().sub(camera.position).normalize();
        cameraYaw = Math.atan2(-dir.x, -dir.z);
        cameraPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
        playerPosition.set(camera.position.x, 0, camera.position.z);
      }
    } else {
      updateNavigation(dt, elapsed);
    }

    pedestrians.forEach((p) => {
      if (p.knockTimer > 0) {
        p.knockTimer -= dt;
        const pos = p.rig.root.position;
        const nx = pos.x + p.knockVel.x * dt;
        const nz = pos.z + p.knockVel.z * dt;
        if (canWalkTo(nx, nz)) { pos.x = nx; pos.z = nz; }
        p.knockVel.multiplyScalar(Math.exp(-5 * dt));
        return;
      }
      if (!p.alive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.alive = true;
          p.hp = 100;
          p.rig.root.rotation.x = 0;
          const spawnPt = p.route[0];
          p.rig.root.position.set(spawnPt.x, 0.14, spawnPt.z);
          p.targetIdx = 1 % p.route.length;
        }
        return;
      }
      if (p.pauseTimer > 0) {
        p.pauseTimer -= dt;
        poseHumanWalking(p.rig, 0, p.walkCycle, elapsed);
        return;
      }
      const tgt = p.route[p.targetIdx];
      const pos = p.rig.root.position;
      const dir = new THREE.Vector3().subVectors(tgt, pos);
      dir.y = 0;
      if (dir.length() < 0.4) {
        p.targetIdx = (p.targetIdx + 1) % p.route.length;
        if (Math.random() < 0.25) p.pauseTimer = 1.5;
      } else {
        dir.normalize();
        pos.addScaledVector(dir, p.speed * dt);
        let diff = Math.atan2(dir.x, dir.z) - p.rig.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        p.rig.root.rotation.y += diff * Math.min(1, dt * 6);
        p.walkCycle += dt * p.speed * 4.4;
        poseHumanWalking(p.rig, 1, p.walkCycle, elapsed);
      }
    });

    storyNPCs.forEach((n) => {
      poseHumanWalking(n.rig, 0, 0, elapsed + n.phase);
      n.rig.headGroup.rotation.y = Math.sin(elapsed * 1.1 + n.phase) * 0.22;
    });

    for (const remote of remotePlayers.values()) {
      const { rig } = remote;
      rig.root.position.lerp(remote.target, 1 - Math.exp(-10 * dt));
      let yd = remote.yaw - rig.root.rotation.y;
      yd = Math.atan2(Math.sin(yd), Math.cos(yd));
      rig.root.rotation.y += yd * (1 - Math.exp(-10 * dt));
      poseHumanWalking(rig, remote.walking ? 1 : 0, remote.phase, elapsed);
      if (remote.walking) remote.phase += dt * 8.5;
      const waving = performance.now() < remote.waveUntil;
      rig.rightArm.rotation.z = waving ? -1.1 + Math.sin(elapsed * 22) * 0.4 : rig.rightArm.rotation.z * 0.78;
    }

    world.swayingTrees.forEach((t) => { t.canopy.rotation.z = Math.sin(elapsed * t.speed + t.phase) * 0.032; });
    if (world.fountainWaterMesh) world.fountainWaterMesh.position.y = 0.76 + Math.sin(elapsed * 2.4) * 0.015;
    world.fountainDroplets.forEach((drop) => {
      const dropData = drop.userData;
      dropData.phase = (dropData.phase + dt * dropData.speed) % 1;
      const r = 0.22 + dropData.phase * dropData.radius;
      drop.position.set(Math.cos(dropData.angle) * r, 3.85 - 3.1 * dropData.phase * dropData.phase + 0.55 * dropData.phase, Math.sin(dropData.angle) * r);
    });

    if (rainPoints.visible) {
      const posArr = rainGeo.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        posArr[i * 3 + 1] -= 24 * dt;
        if (posArr[i * 3 + 1] < 0) {
          posArr[i * 3] = playerPosition.x + (Math.random() - 0.5) * 70;
          posArr[i * 3 + 1] = 22 + Math.random() * 6;
          posArr[i * 3 + 2] = playerPosition.z + (Math.random() - 0.5) * 70;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    for (let i = tireSmokePuffs.length - 1; i >= 0; i--) {
      const p = tireSmokePuffs[i];
      p.age += dt * 1.3;
      p.mesh.position.y += dt * 1.1;
      p.mesh.scale.setScalar(1 + p.age * 2.8);
      p.mesh.material.opacity = Math.max(0, 0.45 * (1 - p.age));
      if (p.age >= 1) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        tireSmokePuffs.splice(i, 1);
      }
    }

    updateTrafficAndPolice(dt, elapsed);
    story.update(
      dt,
      elapsed,
      playerPosition,
      Boolean(state.activeCar),
      policeUnits,
      (step, onChoice, onDone) => {
        if (step.cameraFocus) {
          state.cameraTransition = {
            startPos: camera.position.clone(),
            endPos: new THREE.Vector3(step.cameraFocus.pos.x, step.cameraFocus.pos.y, step.cameraFocus.pos.z),
            startTarget: controls.target.clone(),
            endTarget: new THREE.Vector3(step.cameraFocus.target.x, step.cameraFocus.target.y, step.cameraFocus.target.z),
            progress: 0,
            duration: 0.75
          };
        }
        state.inputEnabled = false;
        onDialogue(step.dialogue, onChoice, () => {
          state.inputEnabled = true;
          onDone();
        });
      },
      (step, onResult) => {
        state.inputEnabled = false;
        onCipher(step, (solved) => {
          state.inputEnabled = true;
          if (!solved) playerPosition.x -= 4;
          onResult(solved);
        });
      }
    );

    hudElapsed += dt;
    if (hudElapsed >= 0.08) {
      hudElapsed = 0;
      const ch = story.getCurrentChapter();
      const step = story.getCurrentStep();
      const tgt = story.getPrimaryTarget();
      const nearDoor = !state.activeCar && Math.hypot(playerPosition.x + 53.5, playerPosition.z) < 3.4;
      const nearCar = !state.activeCar ? getNearestCar(4.5) : null;

      onHudUpdate({
        currentTime: state.currentTime,
        chapterTitle: story.state.completed ? 'Free Roam: Leonida Legend' : ch.title,
        objectiveText: step ? step.label : 'All 10 chapters complete! Replay from Journal [J] or collect remaining Palm Trophies.',
        distanceMeters: tgt ? Math.round(Math.hypot(playerPosition.x - tgt.x, playerPosition.z - tgt.z)) : null,
        timerLabel: step?.type === 'timedRace' ? `Checkpoint ${story.raceIndex}/${step.points.length}` : step?.type === 'evadeWanted' ? 'Evading Police' : null,
        timerSeconds: step?.type === 'timedRace' ? Math.ceil(story.stepTimer) : step?.type === 'evadeWanted' ? Math.ceil(story.evadeTimer) : null,
        wantedStars: story.wantedStars,
        playerHp: Math.round(state.playerHp),
        knockdowns: story.knockdowns,
        cash: story.state.cash,
        rep: story.state.rep,
        clues: story.state.clues,
        trophiesCount: story.state.trophies.length,
        chapterIndex: story.state.chapterIndex,
        completed: story.state.completed,
        playerName: story.state.playerName,
        inCar: Boolean(state.activeCar),
        carName: state.activeCar?.name || '',
        carIsPolice: state.activeCar?.style === 'police',
        carKmh: state.activeCar ? Math.round(Math.abs(state.activeCar.speed) * 3.6) : 0,
        carGear: state.activeCar ? (Math.abs(state.activeCar.speed) < 0.2 ? 'N' : state.activeCar.speed > 0 ? 'D' : 'R') : 'N',
        carNitro: state.activeCar ? Math.round(state.activeCar.nitro) : 100,
        cameraLabel: state.activeCar
          ? (state.carCameraMode === 'chase' ? 'Chase Cam' : state.carCameraMode === 'hood' ? 'Driver Cam' : 'Orbit Cam')
          : (state.cameraMode === 'first' ? '1st Person' : '3rd Person'),
        contextPrompt: nearDoor ? 'Enter The Grand Athenaeum [E]' : nearCar ? `Drive ${nearCar.name} [E]` : null,
        contextActionType: nearDoor ? 'library' : nearCar ? 'car' : null
      });
    }

    poseElapsed += dt;
    if (poseElapsed >= 0.1) {
      poseElapsed = 0;
      onPose({
        x: THREE.MathUtils.clamp(playerPosition.x, -44, 44),
        z: THREE.MathUtils.clamp(playerPosition.z, -44, 44),
        yaw: state.activeCar ? state.activeCar.yaw : cameraYaw,
        pitch: cameraPitch,
        moving: state.activeCar ? Math.abs(state.activeCar.speed) > 0.2 : state.movementAmount > 0.04
      });
    }

    if (state.bloomEnabled) {
      try {
        composer.render();
      } catch {
        renderer.render(scene, camera);
      }
    } else {
      renderer.render(scene, camera);
    }
  }

  function handleResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
  }
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
  resizeObserver?.observe(container);
  window.addEventListener('resize', handleResize);

  return {
    setActive(active) {
      if (active && !state.active) {
        state.active = true;
        state.keys = {};
        state.touchMoves.clear();
        playerPosition.set(TOWN_ENTRY.position.x, 0, TOWN_ENTRY.position.z);
        cameraYaw = -Math.PI / 2;
        cameraPitch = 0;
        handleResize();
        controls.update();
        clock.start();
        animate();
        renderer.domElement.focus();
      } else if (!active && state.active) {
        state.active = false;
        clock.stop();
        carAudio.stopEngine();
        if (animId) cancelAnimationFrame(animId);
        animId = 0;
        state.keys = {};
        state.touchMoves.clear();
        playerVelocity.set(0, 0, 0);
      }
    },
    setInputEnabled(enabled) {
      state.inputEnabled = enabled;
      if (!enabled) {
        state.keys = {};
        state.touchMoves.clear();
      }
    },
    applyCharacterProfile(profile) {
      story.applyCharacterProfile(profile);
      if (profile?.coatColor) {
        const nextRig = createHumanModel({
          coat: profile.coatColor,
          pants: '#1c2029',
          skin: '#dba986',
          hairColor: '#241913',
          tieColor: '#ff3d7f',
          sunglasses: true
        }, world.contactShadowTex);
        nextRig.root.position.copy(localPlayerRig.root.position);
        nextRig.root.visible = localPlayerRig.root.visible;
        scene.remove(localPlayerRig.root);
        localPlayerRig = nextRig;
        scene.add(localPlayerRig.root);
      }
    },
    setPreset: applyLightingPreset,
    setFlyover(enabled) {
      state.flyoverMode = Boolean(enabled);
      if (!state.flyoverMode && !state.cutsceneShot) {
        playerPosition.set(TOWN_ENTRY.position.x, 0, TOWN_ENTRY.position.z);
        camera.position.copy(TOWN_ENTRY.position);
        cameraYaw = -Math.PI / 2;
        cameraPitch = 0;
        controls.update();
      }
    },
    setCutsceneShot(shot) {
      if (!shot) {
        state.cutsceneShot = null;
        if (!state.activeCar && !state.flyoverMode) {
          playerPosition.set(TOWN_ENTRY.position.x, 0, TOWN_ENTRY.position.z);
          camera.position.copy(TOWN_ENTRY.position);
          cameraYaw = -Math.PI / 2;
          cameraPitch = 0;
          controls.update();
        }
        return;
      }
      state.cutsceneShot = {
        fromPos: new THREE.Vector3(shot.fromPos.x, shot.fromPos.y, shot.fromPos.z),
        toPos: new THREE.Vector3(shot.toPos.x, shot.toPos.y, shot.toPos.z),
        lookAt: new THREE.Vector3(shot.lookAt.x, shot.lookAt.y, shot.lookAt.z),
        duration: shot.duration || 3.5,
        progress: 0
      };
      camera.position.copy(state.cutsceneShot.fromPos);
      camera.lookAt(state.cutsceneShot.lookAt);
    },
    applyChoiceEffects(choice) {
      story.applyChoiceEffects(choice);
    },
    enterNearestCarNow() {
      state.cutsceneShot = null;
      state.flyoverMode = false;
      const nc = getNearestCar(999);
      if (nc) enterCar(nc);
    },
    advanceOpeningBriefing() {
      if (story.state.chapterIndex === 0 && story.state.stepIndex === 0 && !story.state.completed) {
        story.advanceStep();
      }
    },
    cycleCameraMode,
    toggleNearestCar() {
      if (state.activeCar) exitCar();
      else enterCar(getNearestCar(999));
    },
    triggerContextAction() {
      if (state.activeCar) exitCar();
      else if (Math.hypot(playerPosition.x + 53.5, playerPosition.z) < 3.4) onReturnToLibrary();
      else {
        const nc = getNearestCar(4.5);
        if (nc) enterCar(nc);
      }
    },
    toggleCarLights() {
      if (!state.activeCar) return;
      state.activeCar.lightsOn = !state.activeCar.lightsOn;
      state.activeCar.headSpot.intensity = state.activeCar.lightsOn ? 3.6 : 0;
    },
    toggleCarSiren() {
      if (state.activeCar?.style === 'police') state.activeCar.sirenOn = !state.activeCar.sirenOn;
    },
    playHorn() {
      carAudio.playHorn();
    },
    setMovement(dir, active) {
      if (active) state.touchMoves.add(dir);
      else state.touchMoves.delete(dir);
    },
    setQuality(preset) {
      const pr = preset === 'ultra' ? Math.min(window.devicePixelRatio || 1, 2) : preset === 'high' ? 1.5 : 1.0;
      renderer.setPixelRatio(pr);
      handleResize();
      state.bloomEnabled = preset !== 'balanced';
      state.gradeEnabled = preset !== 'balanced';
      gradePass.enabled = state.gradeEnabled;
    },
    setBloom(v) { state.bloomEnabled = v; },
    setGrade(v) { state.gradeEnabled = v; gradePass.enabled = v; },
    setShadows(v) { renderer.shadowMap.enabled = v; },
    setSound(v) { carAudio.enabled = v; if (!v) carAudio.stopEngine(); },
    setSensitivity(v) { state.lookSensitivity = v; },
    drawMapCanvas,
    handleMapClick(cx, cy, canvasW, canvasH) {
      const hit = mapClickTargets.find((t) => Math.hypot((cx * canvasW) - t.x, (cy * canvasH) - t.y) <= t.r);
      if (!hit) return false;
      if (hit.type === 'car') {
        if (state.activeCar && state.activeCar !== hit.car) exitCar();
        enterCar(hit.car);
      } else {
        if (state.activeCar) exitCar();
        selectLandmark(hit.landmark);
      }
      return true;
    },
    jumpToChapter(idx) { story.jumpToChapter(idx); },
    resetCampaign() { story.resetCampaign(); },
    setRemotePlayers,
    showPlayerAction,
    getPose() {
      return {
        x: THREE.MathUtils.clamp(playerPosition.x, -44, 44),
        z: THREE.MathUtils.clamp(playerPosition.z, -44, 44),
        yaw: state.activeCar ? state.activeCar.yaw : cameraYaw,
        pitch: cameraPitch,
        moving: state.activeCar ? Math.abs(state.activeCar.speed) > 0.2 : state.movementAmount > 0.04
      };
    },
    dispose() {
      state.active = false;
      cancelAnimationFrame(animId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      carAudio.stopEngine();
      composer.dispose();
      currentEnvRT?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
