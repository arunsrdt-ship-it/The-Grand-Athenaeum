import * as THREE from 'three';

const SAVE_KEY = 'leonida_chronicles_save_v1';

export const CHAPTERS = [
  {
    id: 1,
    title: 'Chapter 1: Arrival at Ocean Drive',
    summary: 'Meet Elena Vance outside the Athenaeum and cruise Ocean Drive to Hotel Ocean Sol.',
    rewardCash: 500,
    rewardRep: 100,
    preset: 'sunset',
    steps: [
      {
        type: 'talk',
        npcId: 'elena',
        label: 'Speak with Elena Vance near the Athenaeum',
        target: { x: -54, z: 3.5 },
        radius: 3.5,
        dialogue: [
          { speaker: 'Elena Vance', role: 'Archive Curator', text: 'Glad you stepped outside. Last night a syndicate broke into the Athenaeum annex and stole the Sovereign Codex.' },
          { speaker: 'You', role: 'Investigator', text: 'Where did their trail go? Toward the coast?' },
          { speaker: 'Elena Vance', role: 'Archive Curator', text: 'Straight down Ocean Drive toward Hotel Ocean Sol. Grab the Banshee GT parked by the curb—follow your cyan GPS beacon!' }
        ]
      },
      {
        type: 'driveTo',
        label: 'Drive any car to Hotel Ocean Sol on Ocean Drive',
        target: { x: 31, z: -18 },
        radius: 6.5
      }
    ]
  },
  {
    id: 2,
    title: 'Chapter 2: The Neon Ledger',
    summary: 'Meet informant Marco "Keys" at Café Sol and recover 3 scattered ledger pages.',
    rewardCash: 900,
    rewardRep: 180,
    preset: 'sunset',
    steps: [
      {
        type: 'talk',
        npcId: 'marco',
        label: 'Meet Marco "Keys" at Café de la Place',
        target: { x: 16.5, z: -15.5 },
        radius: 3.5,
        dialogue: [
          { speaker: 'Marco "Keys"', role: 'Street Informant', text: 'Keep your voice down. The courier panicked near the plaza and dumped three ledger pages across downtown and the boardwalk.' },
          {
            speaker: 'Marco "Keys"',
            role: 'Street Informant',
            text: 'Find all three pages and you will learn where the syndicate moves tonight. How are we playing this?',
            choices: [
              { label: 'Play it quiet & track the pages on foot/car', reply: 'Smart move. I pinged all three spots on your GPS radar.' },
              { label: 'Offer $100 tip for the cipher note too', reply: 'Appreciate the generosity! Remember the Athenaeum founding year ends in 1-8-4—you will need that later.' }
            ]
          }
        ]
      },
      {
        type: 'collectAll',
        label: 'Recover 3 Ledger Fragments (check GPS beacons)',
        points: [
          { x: 0, z: 7.5, name: 'Fountain Rim Ledger' },
          { x: 44, z: -8, name: 'Boardwalk Ledger' },
          { x: -13, z: 18, name: 'Apex Plaza Ledger' }
        ],
        radius: 3.0
      }
    ]
  },
  {
    id: 3,
    title: 'Chapter 3: Midnight Street Run',
    summary: 'Race through 5 midnight street checkpoints before rival couriers lock the district.',
    rewardCash: 1400,
    rewardRep: 240,
    preset: 'neonNight',
    steps: [
      {
        type: 'timedRace',
        label: 'Drive through 5 Neon Checkpoints (110s limit)',
        timeLimit: 110,
        requireCar: true,
        points: [
          { x: 34, z: 0 },
          { x: 34, z: 34 },
          { x: 0, z: 34 },
          { x: -34, z: 34 },
          { x: -34, z: -12 }
        ],
        radius: 5.8
      }
    ]
  },
  {
    id: 4,
    title: 'Chapter 4: Heat on the Boulevard',
    summary: 'Evade a 2-Star Police Pursuit across Leonida and lay low at Vieux Bay Garage.',
    rewardCash: 1800,
    rewardRep: 300,
    preset: 'neonNight',
    steps: [
      {
        type: 'evadeWanted',
        label: 'Lose 2-Star Police Heat (stay clear for 25s)',
        wantedStars: 2,
        evadeSeconds: 25
      },
      {
        type: 'reach',
        label: 'Return to Vieux Bay Garage Safe House',
        target: { x: -46, z: -24 },
        radius: 6.0
      }
    ]
  },
  {
    id: 5,
    title: 'Chapter 5: The Harbor Smuggler',
    summary: 'Question Dockmaster Rico at Leonida Marina and inspect 4 shipping crates.',
    rewardCash: 2100,
    rewardRep: 350,
    preset: 'tropicalNoon',
    steps: [
      {
        type: 'talk',
        npcId: 'rico',
        label: 'Talk to Dockmaster Rico at Leonida Marina',
        target: { x: 41, z: 54 },
        radius: 3.8,
        dialogue: [
          { speaker: 'Dockmaster Rico', role: 'Harbor Master', text: 'Four unmarked crates came off a midnight speedboat onto the pier. One of them holds forged folio plates.' },
          { speaker: 'You', role: 'Investigator', text: 'I will check every crate on the dock.' }
        ]
      },
      {
        type: 'collectAll',
        label: 'Inspect all 4 Pier Shipping Crates',
        points: [
          { x: 43, z: 51.5, name: 'Crimson Crate #1' },
          { x: 48, z: 56.5, name: 'Cobalt Crate #2' },
          { x: 57, z: 51.5, name: 'Emerald Crate #3' },
          { x: 63, z: 56.5, name: 'Amber Manifest Crate' }
        ],
        radius: 3.6
      }
    ]
  },
  {
    id: 6,
    title: 'Chapter 6: Shattered Glass',
    summary: 'Scan 3 downtown crime-scene clues to recover the Brass Cipher Key.',
    rewardCash: 2500,
    rewardRep: 400,
    preset: 'tropicalNoon',
    steps: [
      {
        type: 'collectAll',
        label: 'Scan 3 Crime-Scene Clues Downtown',
        points: [
          { x: -13, z: -18, name: 'Horizon Tower Glass Print' },
          { x: 26, z: 18, name: 'Neon Palms Tire Track' },
          { x: 0, z: -7.5, name: 'Brass Cipher Key' }
        ],
        radius: 3.4
      }
    ]
  },
  {
    id: 7,
    title: 'Chapter 7: Grand Coastal Grand Prix',
    summary: 'Challenge rival driver Viktor Kaine on a full 10-checkpoint coastal circuit.',
    rewardCash: 3500,
    rewardRep: 550,
    preset: 'sunset',
    steps: [
      {
        type: 'talk',
        npcId: 'viktor',
        label: 'Meet rival racer Viktor Kaine on North-East Boulevard',
        target: { x: 34, z: -36 },
        radius: 4.0,
        dialogue: [
          { speaker: 'Viktor Kaine', role: 'Rival Street Racer', text: 'Think your ride can handle Ocean Drive at full throttle? Beat my 135-second coastal circuit and I will tell you who holds the vault.' },
          { speaker: 'You', role: 'Investigator', text: 'Set the beacons. Hope you have a good view of my taillights.' }
        ]
      },
      {
        type: 'timedRace',
        label: 'Complete 10-Checkpoint Coastal Circuit (135s)',
        timeLimit: 135,
        requireCar: true,
        points: [
          { x: 34, z: -18 },
          { x: 34, z: 18 },
          { x: 34, z: 34 },
          { x: 0, z: 34 },
          { x: -34, z: 34 },
          { x: -34, z: 0 },
          { x: -34, z: -34 },
          { x: 0, z: -34 },
          { x: 24, z: -34 },
          { x: 34, z: -26 }
        ],
        radius: 6.2
      }
    ]
  },
  {
    id: 8,
    title: 'Chapter 8: Storm Over Leonida',
    summary: 'Intercept 4 syndicate relay beacons across the rain-slicked avenues during the storm.',
    rewardCash: 4000,
    rewardRep: 650,
    preset: 'stormDusk',
    steps: [
      {
        type: 'timedRace',
        label: 'Intercept 4 Storm Relay Beacons (120s)',
        timeLimit: 120,
        requireCar: false,
        points: [
          { x: 18, z: -34 },
          { x: 34, z: 24 },
          { x: -24, z: 34 },
          { x: -34, z: -24 }
        ],
        radius: 5.5
      }
    ]
  },
  {
    id: 9,
    title: 'Chapter 9: Inside the Vault',
    summary: 'Crack the 3-dial cipher vault at Apex Bay Plaza and survive a 3-Star Escape!',
    rewardCash: 5500,
    rewardRep: 850,
    preset: 'neonNight',
    steps: [
      {
        type: 'cipherPuzzle',
        label: 'Reach Apex Bay Plaza & crack the Vault Cipher',
        target: { x: -20, z: 26 },
        radius: 4.5,
        code: '184',
        hint: 'Athenaeum archive key from Marco & Cipher Key: 1 - 8 - 4'
      },
      {
        type: 'escapeTo',
        label: '3-STAR ESCAPE! Drive the Codex back to The Grand Athenaeum!',
        wantedStars: 3,
        target: { x: -51, z: 0 },
        radius: 6.5
      }
    ]
  },
  {
    id: 10,
    title: 'Chapter 10: Dawn Over Vieux Bay',
    summary: 'Deliver the Sovereign Codex to Elena Vance and reclaim the city at golden dawn.',
    rewardCash: 10000,
    rewardRep: 1500,
    preset: 'sunset',
    steps: [
      {
        type: 'talk',
        npcId: 'elena',
        label: 'Deliver the Sovereign Codex to Elena Vance at the Athenaeum',
        target: { x: -54, z: 3.5 },
        radius: 4.0,
        dialogue: [
          { speaker: 'Elena Vance', role: 'Archive Curator', text: 'You actually brought back the Sovereign Codex! The entire bay owes you a debt—and your name is legend from Ocean Drive to the Athenaeum.' },
          { speaker: 'You', role: 'Investigator', text: 'The city is safe. Time to enjoy the coastal drive!' }
        ]
      }
    ]
  }
];

export const PALM_TROPHIES = [
  { x: 52, z: -36 }, { x: 52, z: 0 }, { x: 52, z: 36 },
  { x: 0, z: -28 }, { x: 0, z: 28 }, { x: -28, z: 0 },
  { x: 28, z: 0 }, { x: -46, z: -38 }, { x: -46, z: 38 },
  { x: 64, z: 54 }, { x: 20, z: -60 }, { x: -20, z: 56 }
];

export class StoryCampaignEngine {
  constructor({ scene, onPresetChange, onToast, onPlayChime }) {
    this.scene = scene;
    this.onPresetChange = onPresetChange;
    this.onToast = onToast;
    this.onPlayChime = onPlayChime;

    this.state = this.loadSave();
    this.wantedStars = 0;
    this.evadeTimer = 0;
    this.stepTimer = 0;
    this.dialogueActive = false;
    this.puzzleOpen = false;
    this.collectedStepIndices = new Set();
    this.raceIndex = 0;

    // 3D Mission Beacon Pillar + Ring
    this.beaconGroup = new THREE.Group();
    const pillarMat = new THREE.MeshBasicMaterial({ color: '#38e8ff', transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 32, 16, 1, true), pillarMat);
    pillar.position.y = 16;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.65, 28),
      new THREE.MeshBasicMaterial({ color: '#ffdf78', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.18;
    this.beaconGroup.add(pillar, ring);
    this.scene.add(this.beaconGroup);

    // 12 Collectible Neon Palm Trophies
    this.trophyMeshes = PALM_TROPHIES.map((pos, idx) => {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({ color: '#ffe074', emissive: '#ff9d2e', emissiveIntensity: 1.8, metalness: 0.8, roughness: 0.15 })
      );
      m.position.set(pos.x, 1.15, pos.z);
      m.visible = !this.state.trophies.includes(idx);
      this.scene.add(m);
      return m;
    });

    this.subBeacons = [];
    this.applyChapterSetup();
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          chapterIndex: Math.min(CHAPTERS.length - 1, Math.max(0, Number(parsed.chapterIndex) || 0)),
          stepIndex: Math.max(0, Number(parsed.stepIndex) || 0),
          completed: Boolean(parsed.completed),
          cash: Number(parsed.cash) || 250,
          rep: Number(parsed.rep) || 0,
          trophies: Array.isArray(parsed.trophies) ? parsed.trophies : []
        };
      }
    } catch {
      // ignore storage errors
    }
    return { chapterIndex: 0, stepIndex: 0, completed: false, cash: 250, rep: 0, trophies: [] };
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage errors
    }
  }

  getCurrentChapter() {
    return CHAPTERS[this.state.chapterIndex] || CHAPTERS[CHAPTERS.length - 1];
  }

  getCurrentStep() {
    if (this.state.completed) return null;
    const ch = this.getCurrentChapter();
    return ch.steps[this.state.stepIndex] || null;
  }

  clearSubBeacons() {
    this.subBeacons.forEach((m) => this.scene.remove(m));
    this.subBeacons = [];
  }

  applyChapterSetup() {
    this.clearSubBeacons();
    this.collectedStepIndices.clear();
    this.raceIndex = 0;

    const ch = this.getCurrentChapter();
    if (!this.state.completed && ch?.preset && this.onPresetChange) {
      this.onPresetChange(ch.preset);
    }

    const step = this.getCurrentStep();
    if (!step) {
      this.beaconGroup.visible = false;
      this.wantedStars = 0;
      return;
    }

    this.stepTimer = step.timeLimit || 0;
    this.wantedStars = step.wantedStars || 0;
    this.evadeTimer = step.evadeSeconds || 0;

    if (step.type === 'collectAll') {
      step.points.forEach((pt) => {
        const m = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: '#38e8ff', emissive: '#38e8ff', emissiveIntensity: 2.0 })
        );
        m.position.set(pt.x, 1.2, pt.z);
        this.scene.add(m);
        this.subBeacons.push(m);
      });
    }
    this.syncPrimaryBeacon();
  }

  syncPrimaryBeacon() {
    const target = this.getPrimaryTarget();
    if (!target) {
      this.beaconGroup.visible = false;
      return;
    }
    this.beaconGroup.visible = true;
    this.beaconGroup.position.set(target.x, 0, target.z);
  }

  getPrimaryTarget() {
    const step = this.getCurrentStep();
    if (!step) return null;
    if (step.target) return step.target;
    if (step.type === 'timedRace') return step.points[this.raceIndex] || null;
    if (step.type === 'collectAll') {
      const idx = step.points.findIndex((_, i) => !this.collectedStepIndices.has(i));
      return idx >= 0 ? step.points[idx] : null;
    }
    return null;
  }

  jumpToChapter(index) {
    this.state.chapterIndex = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    this.state.stepIndex = 0;
    this.state.completed = false;
    this.save();
    this.applyChapterSetup();
    this.onToast?.(`Started ${this.getCurrentChapter().title}`);
  }

  resetCampaign() {
    this.state = { chapterIndex: 0, stepIndex: 0, completed: false, cash: 250, rep: 0, trophies: [] };
    this.trophyMeshes.forEach((m) => { m.visible = true; });
    this.save();
    this.applyChapterSetup();
    this.onToast?.('Campaign reset to Chapter 1');
  }

  advanceStep() {
    const ch = this.getCurrentChapter();
    this.onPlayChime?.();
    if (this.state.stepIndex + 1 < ch.steps.length) {
      this.state.stepIndex += 1;
      this.save();
      this.applyChapterSetup();
      return;
    }

    // Chapter complete!
    this.state.cash += ch.rewardCash;
    this.state.rep += ch.rewardRep;
    this.wantedStars = 0;
    this.onToast?.(`${ch.title} Complete! +$${ch.rewardCash} · +${ch.rewardRep} Rep`);

    if (this.state.chapterIndex + 1 < CHAPTERS.length) {
      this.state.chapterIndex += 1;
      this.state.stepIndex = 0;
    } else {
      this.state.completed = true;
      this.onToast?.('Campaign Complete! Free Roam & Replay Unlocked!');
    }
    this.save();
    this.applyChapterSetup();
  }

  update(dt, elapsed, playerPos, inCar, policeUnits, openDialogueFn, openCipherFn) {
    // Spin trophies & check pickup
    this.trophyMeshes.forEach((m, idx) => {
      if (!m.visible) return;
      m.rotation.y += dt * 2.2;
      m.position.y = 1.15 + Math.sin(elapsed * 2.5 + idx) * 0.16;
      if (Math.hypot(playerPos.x - m.position.x, playerPos.z - m.position.z) < 2.5) {
        m.visible = false;
        this.state.trophies.push(idx);
        this.state.cash += 250;
        this.state.rep += 50;
        this.save();
        this.onPlayChime?.();
        this.onToast?.(`Neon Palm Trophy ${this.state.trophies.length}/12! +$250`);
      }
    });

    this.subBeacons.forEach((m, i) => {
      m.rotation.y += dt * 2.5;
      m.position.y = 1.2 + Math.sin(elapsed * 3 + i) * 0.18;
    });

    this.beaconGroup.rotation.y += dt * 1.4;

    if (this.dialogueActive || this.puzzleOpen) return;

    const step = this.getCurrentStep();
    if (!step) return;

    if (step.type === 'talk') {
      const dist = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      if (dist <= step.radius) {
        this.dialogueActive = true;
        openDialogueFn(step.dialogue, () => {
          this.dialogueActive = false;
          this.advanceStep();
        });
      }
    } else if (step.type === 'driveTo') {
      const dist = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      if (inCar && dist <= step.radius) {
        this.advanceStep();
      }
    } else if (step.type === 'reach' || step.type === 'escapeTo') {
      const dist = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      if (dist <= step.radius) {
        this.advanceStep();
      }
    } else if (step.type === 'collectAll') {
      step.points.forEach((pt, idx) => {
        if (this.collectedStepIndices.has(idx)) return;
        const dist = Math.hypot(playerPos.x - pt.x, playerPos.z - pt.z);
        if (dist <= step.radius) {
          this.collectedStepIndices.add(idx);
          if (this.subBeacons[idx]) this.subBeacons[idx].visible = false;
          this.onPlayChime?.();
          this.onToast?.(`Found: ${pt.name} (${this.collectedStepIndices.size}/${step.points.length})`);
          this.syncPrimaryBeacon();
        }
      });
      if (this.collectedStepIndices.size >= step.points.length) {
        this.advanceStep();
      }
    } else if (step.type === 'timedRace') {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.raceIndex = 0;
        this.stepTimer = step.timeLimit;
        this.syncPrimaryBeacon();
        this.onToast?.('Time expired! Checkpoint timer restarted.');
        return;
      }
      const pt = step.points[this.raceIndex];
      if (pt && (!step.requireCar || inCar)) {
        const dist = Math.hypot(playerPos.x - pt.x, playerPos.z - pt.z);
        if (dist <= step.radius) {
          this.raceIndex += 1;
          this.onPlayChime?.();
          if (this.raceIndex >= step.points.length) {
            this.advanceStep();
          } else {
            this.onToast?.(`Checkpoint ${this.raceIndex}/${step.points.length}`);
            this.syncPrimaryBeacon();
          }
        }
      }
    } else if (step.type === 'evadeWanted') {
      const nearestCop = policeUnits.reduce((min, u) => {
        const d = Math.hypot(playerPos.x - u.car.root.position.x, playerPos.z - u.car.root.position.z);
        return Math.min(min, d);
      }, 999);
      if (nearestCop > 24) {
        this.evadeTimer -= dt;
        if (this.evadeTimer <= 0) {
          this.wantedStars = 0;
          this.onToast?.('Police Heat Cleared! Head to Vieux Bay Garage.');
          this.advanceStep();
        }
      } else {
        this.evadeTimer = Math.min(step.evadeSeconds, this.evadeTimer + dt * 0.4);
      }
    } else if (step.type === 'cipherPuzzle') {
      const dist = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      if (dist <= step.radius) {
        this.puzzleOpen = true;
        openCipherFn(step, (solved) => {
          this.puzzleOpen = false;
          if (solved) this.advanceStep();
        });
      }
    }
  }
}
