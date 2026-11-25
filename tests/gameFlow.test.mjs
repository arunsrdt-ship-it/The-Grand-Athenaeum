import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  CHARACTER_ORIGINS,
  OPENING_CITY_SCENES,
  LIBRARY_PROLOGUE_SCENE,
  CHAPTERS,
  PALM_TROPHIES,
  StoryCampaignEngine
} from '../src/arena/storyEngine.js';
import { LIGHTING_PRESETS } from '../src/arena/shaders.js';
import { FirstPersonController } from '../src/library/FirstPersonController.js';
import { createHumanModel, poseHumanDriving, poseHumanWalking, populateCitizensAndNPCs } from '../src/arena/humans.js';
import { populateAllVehicles } from '../src/arena/vehicles.js';
import { buildLeonidaArena } from '../src/arena/cityWorld.js';

function createFakeCanvas2DContext() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '#000',
    shadowBlur: 0,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    stroke: noop,
    fill: noop,
    fillText: noop,
    roundRect: noop,
    createRadialGradient: () => grad,
    createLinearGradient: () => grad
  };
}

globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return {
        width: 512,
        height: 512,
        getContext: () => createFakeCanvas2DContext()
      };
    }
    return {};
  }
};

function createMockStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); }
  };
}

globalThis.localStorage = createMockStorage();

test('Character origins and library prologue have valid story data and choices', () => {
  assert.equal(CHARACTER_ORIGINS.length, 3);
  CHARACTER_ORIGINS.forEach((origin) => {
    assert.ok(origin.id && origin.defaultName && origin.coatColor && origin.startClue);
  });

  assert.ok(LIBRARY_PROLOGUE_SCENE.lines.length >= 2);
  assert.equal(OPENING_CITY_SCENES.length, 3);
  OPENING_CITY_SCENES.forEach((sceneShot) => {
    assert.ok(sceneShot.sceneTag && sceneShot.cameraShot && sceneShot.text);
  });
  assert.ok(Array.isArray(OPENING_CITY_SCENES[2].choices) && OPENING_CITY_SCENES[2].choices.length === 2);
  const choiceLine = LIBRARY_PROLOGUE_SCENE.lines.find((l) => Array.isArray(l.choices));
  assert.ok(choiceLine, 'Prologue must offer player choices');
  assert.equal(choiceLine.choices.length, 2);
  choiceLine.choices.forEach((c) => {
    assert.ok(c.label && c.reply);
  });
});

test('All 10 story chapters reference valid weather presets and bounded coordinates', () => {
  assert.equal(CHAPTERS.length, 10);
  assert.equal(PALM_TROPHIES.length, 12);
  CHAPTERS.forEach((ch, idx) => {
    assert.equal(ch.id, idx + 1);
    assert.ok(LIGHTING_PRESETS[ch.preset], `Chapter ${ch.id} preset ${ch.preset} must exist`);
    assert.ok(ch.steps.length >= 1);
    ch.steps.forEach((step) => {
      if (step.target) {
        assert.ok(Math.abs(step.target.x) <= 70 && Math.abs(step.target.z) <= 70);
      }
      if (step.points) {
        step.points.forEach((pt) => {
          assert.ok(Math.abs(pt.x) <= 70 && Math.abs(pt.z) <= 70);
        });
      }
    });
  });
});

test('StoryCampaignEngine progresses through dialogue choices, driving, races, police evasion, cipher puzzle, and finale', () => {
  localStorage.clear();
  const scene = new THREE.Scene();
  const presetsSeen = [];
  const toasts = [];
  let chimes = 0;

  const engine = new StoryCampaignEngine({
    scene,
    onPresetChange: (p) => presetsSeen.push(p),
    onToast: (t) => toasts.push(t),
    onPlayChime: () => { chimes += 1; }
  });

  engine.applyCharacterProfile({
    playerName: 'Maya Vance',
    originId: 'courier',
    coatColor: '#9e2b4b',
    cashDelta: 150,
    repDelta: 25,
    clue: 'Vault Seal: 1884'
  });
  assert.equal(engine.state.playerName, 'Maya Vance');
  assert.equal(engine.state.cash, 550);
  assert.ok(engine.state.clues.includes('Vault Seal: 1884'));

  // Chapter 1 Step 1: Talk to Elena outside Athenaeum
  const fakePolice = [{ car: { root: { position: new THREE.Vector3(60, 0, 60) } } }];
  let dialogueTriggered = false;
  engine.update(0.016, 1.0, new THREE.Vector3(-54, 0, 3.5), false, fakePolice, (_step, onChoice, onDone) => {
    dialogueTriggered = true;
    onChoice({ cashDelta: 150, clue: 'Syndicate Car: Silver Sedan' });
    onDone();
  }, () => {});
  assert.equal(dialogueTriggered, true);
  assert.equal(engine.state.cash, 700);
  assert.equal(engine.state.stepIndex, 1);

  // Chapter 1 Step 2: Drive car to Hotel Ocean Sol
  engine.update(0.016, 2.0, new THREE.Vector3(31, 0, -18), false, fakePolice, () => {}, () => {});
  assert.equal(engine.state.chapterIndex, 0, 'Must be inside a car for driveTo');
  engine.update(0.016, 2.1, new THREE.Vector3(31, 0, -18), true, fakePolice, () => {}, () => {});
  assert.equal(engine.state.chapterIndex, 1, 'Should advance to Chapter 2');

  // Jump to Chapter 3 (timedRace) and verify checkpoints
  engine.jumpToChapter(2);
  assert.equal(engine.getCurrentChapter().id, 3);
  const ch3Points = CHAPTERS[2].steps[0].points;
  ch3Points.forEach((pt) => {
    engine.update(0.016, 3.0, new THREE.Vector3(pt.x, 0, pt.z), true, fakePolice, () => {}, () => {});
  });
  assert.equal(engine.state.chapterIndex, 3, 'Should advance to Chapter 4 after timed race');
  assert.equal(engine.wantedStars, 2, 'Chapter 4 activates 2-Star Police Heat');

  // Chapter 4: Evade Police -> Safe House
  for (let i = 0; i < 25; i++) {
    engine.update(1.0, 10 + i, new THREE.Vector3(-20, 0, -20), true, fakePolice, () => {}, () => {});
  }
  assert.equal(engine.wantedStars, 0);
  assert.equal(engine.state.stepIndex, 1);
  engine.update(0.016, 40, new THREE.Vector3(-46, 0, -24), true, fakePolice, () => {}, () => {});
  assert.equal(engine.state.chapterIndex, 4, 'Should advance to Chapter 5');

  // Jump to Chapter 9: Cipher puzzle + 3-star escape
  engine.jumpToChapter(8);
  let cipherOpened = false;
  engine.update(0.016, 50, new THREE.Vector3(-20, 0, 26), false, fakePolice, () => {}, (step, onResult) => {
    cipherOpened = true;
    assert.equal(step.code, '184');
    onResult(true);
  });
  assert.equal(cipherOpened, true);
  assert.equal(engine.wantedStars, 3);

  engine.update(0.016, 51, new THREE.Vector3(-51, 0, 0), true, fakePolice, () => {}, () => {});
  assert.equal(engine.state.chapterIndex, 9, 'Should advance to Chapter 10 Finale');

  // Collect a Neon Palm Trophy
  const t0 = PALM_TROPHIES[0];
  const cashBeforeTrophy = engine.state.cash;
  engine.update(0.016, 52, new THREE.Vector3(t0.x, 0, t0.z), false, fakePolice, () => {}, () => {});
  assert.equal(engine.state.trophies.length, 1);
  assert.equal(engine.state.cash, cashBeforeTrophy + 250);

  // Free-roam Wanted Star escalation & cooldown
  engine.triggerWanted(2);
  assert.equal(engine.wantedStars, 2);
  for (let i = 0; i < 20; i++) {
    engine.update(1.0, 60 + i, new THREE.Vector3(-20, 0, -20), true, fakePolice, () => {}, () => {});
  }
  assert.equal(engine.wantedStars, 0);

  assert.ok(chimes > 0);
  assert.ok(presetsSeen.includes('neonNight'));
  assert.ok(toasts.length > 0);
});

test('FirstPersonController supports walking, sprinting, sensitivity, and door opening collision', () => {
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.HTMLElement = class {};
  const fakeElement = {
    addEventListener() {},
    removeEventListener() {}
  };
  const camera = new THREE.PerspectiveCamera(48, 1.5, 0.1, 60);
  let doorOpen = false;
  const controller = new FirstPersonController({
    camera,
    element: fakeElement,
    startPosition: new THREE.Vector3(0, 1.68, 5.5),
    startLookAt: new THREE.Vector3(0, 1.68, 8.0),
    canWalkTo: (x, z) => (doorOpen && Math.abs(x) < 0.82 && z <= 7.95) || (Math.abs(x) < 6.27 && Math.abs(z) < 6.27),
    onInteract: () => {}
  });

  // Walk forward toward closed door -> blocked at ~6.27
  controller.setMovement('forward', true);
  for (let i = 0; i < 30; i++) controller.update(0.05);
  assert.ok(controller.position.z <= 6.3, 'Should stop before closed door');

  // Open door -> character walks smoothly out past z=7.25
  doorOpen = true;
  controller.sprinting = true;
  for (let i = 0; i < 20; i++) controller.update(0.05);
  assert.ok(controller.position.z > 7.25, `Character should walk out through open doorway, got z=${controller.position.z}`);

  controller.setSensitivity(1.8);
  assert.equal(controller.lookSensitivity, 1.8);
  controller.dispose();
});

test('Leonida city world, articulated humans, and 5 drivable vehicles + AI traffic build cleanly without collisions', () => {
  const scene = new THREE.Scene();
  const landmarks = [];
  const fakeRenderer = { capabilities: { getMaxAnisotropy: () => 4 } };

  const world = buildLeonidaArena({
    scene,
    renderer: fakeRenderer,
    onRegisterLandmark: (lm) => landmarks.push(lm)
  });

  assert.ok(landmarks.length >= 9, `Expected >= 9 landmarks, got ${landmarks.length}`);
  assert.ok(landmarks.some((l) => l.id === 'athenaeum'), 'Athenaeum return landmark must be registered');
  assert.ok(landmarks.some((l) => l.id === 'ocean_hotel'), 'Art Deco Hotel Ocean Sol must be registered');

  const { pedestrians, storyNPCs } = populateCitizensAndNPCs(scene, world.contactShadowTex);
  assert.equal(pedestrians.length, 22);
  assert.equal(storyNPCs.length, 4);
  pedestrians.forEach((p) => {
    assert.equal(p.hp, 100);
    assert.equal(p.alive, true);
  });

  // Verify articulated human joints and poses
  const rig = createHumanModel({ coat: '#1d4f6e', sunglasses: true }, world.contactShadowTex);
  assert.ok(rig.headGroup && rig.leftElbow && rig.rightElbow && rig.leftKnee && rig.rightKnee);
  poseHumanWalking(rig, 1.0, 1.2, 2.0);
  assert.ok(Number.isFinite(rig.leftKnee.rotation.x));
  poseHumanDriving(rig, 0.35);
  assert.ok(Number.isFinite(rig.leftArm.rotation.x));

  const { drivableCars, aiTraffic, policeUnits } = populateAllVehicles(scene, world.contactShadowTex);
  assert.equal(drivableCars.length, 5);
  assert.equal(aiTraffic.length, 6);
  assert.equal(policeUnits.length, 2);

  // Ensure every drivable car spawns outside building/fountain obstacles
  drivableCars.forEach((car) => {
    const x = car.root.position.x;
    const z = car.root.position.z;
    const r = 1.15;
    const blocked = world.walkObstacles.some((o) => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ)
      || world.carObstacles.some((o) => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
    assert.equal(blocked, false, `Car ${car.name} spawn (${x}, ${z}) must not collide with obstacles`);
  });
});
