import * as THREE from 'three';

const SAVE_KEY = 'leonida_chronicles_save_v2';

export const CHARACTER_ORIGINS = [
  {
    id: 'archivist',
    defaultName: 'Julian Vance',
    title: 'Athenaeum Archivist',
    coatColor: '#1d4f6e',
    perk: '+$400 Vault Fund & Cipher Clue',
    backstory: 'Raised among the rare vaults of The Grand Athenaeum, you memorized the old city’s secret codes before tonight’s heist shattered the silence.',
    startCash: 400,
    startRep: 50,
    startClue: 'Founding Cipher Digit: 1-8-4'
  },
  {
    id: 'courier',
    defaultName: 'Maya Vance',
    title: 'Midnight Street Courier',
    coatColor: '#9e2b4b',
    perk: '+150 Street Rep & Fast Nitro',
    backstory: 'Every neon alley between Ocean Drive and the Marina knows your taillights. Tonight, the syndicate hit your own family’s library.',
    startCash: 250,
    startRep: 150,
    startClue: 'Courier Shortcut Known'
  },
  {
    id: 'racer',
    defaultName: 'Kai Mercer',
    title: 'Coastal Undercover Driver',
    coatColor: '#266858',
    perk: '+$600 & Direct Supercar Access',
    backstory: 'An ex-circuit driver pulled into Leonida Bay’s underworld after the Sovereign Codex vanished into the coastal night.',
    startCash: 600,
    startRep: 100,
    startClue: 'Horizon Tower Plate Partial'
  }
];

export const OPENING_CITY_SCENES = [
  {
    id: 'vista',
    sceneTag: 'SCENE 1 · OCEAN DRIVE SKYLINE',
    speaker: 'Narrator',
    role: 'Leonida Bay · 18:42',
    text: 'Sun-drenched palms, wet neon boulevards, and turquoise surf—Leonida Bay looks like paradise. Minutes ago, an armed crew raided The Grand Athenaeum and vanished into this coastline with the Sovereign Codex.',
    cameraShot: {
      fromPos: { x: 58, y: 17, z: -42 },
      toPos: { x: 26, y: 6.5, z: -18 },
      lookAt: { x: 14, y: 4.5, z: -8 },
      duration: 4.2
    }
  },
  {
    id: 'chase',
    sceneTag: 'SCENE 2 · THE GETAWAY',
    speaker: 'Elena Vance',
    role: 'Archive Curator (Comms)',
    text: 'Their getaway coupe just tore down Ocean Drive past Hotel Ocean Sol! Precinct 04 is locking down the avenues—if we lose their trail tonight, the Codex disappears off the Marina docks forever.',
    cameraShot: {
      fromPos: { x: 37, y: 2.5, z: 26 },
      toPos: { x: 33, y: 2.1, z: -4 },
      lookAt: { x: 26, y: 2.8, z: -20 },
      duration: 3.8
    }
  },
  {
    id: 'briefing',
    sceneTag: 'SCENE 3 · THE ATHENAEUM STEPS',
    speaker: 'Elena Vance',
    role: 'Waiting by the Banshee GT',
    text: 'I pulled the Banshee GT Roadster up to the curb for you. The city is yours—how do you want to open the hunt?',
    cameraShot: {
      fromPos: { x: -42, y: 2.8, z: 9 },
      toPos: { x: -48.5, y: 1.95, z: 4.8 },
      lookAt: { x: -54, y: 1.45, z: 2.2 },
      duration: 2.8
    },
    choices: [
      {
        label: 'Jump Straight into the Banshee GT & Hit the Gas (+50 Rep)',
        repDelta: 50,
        autoDrive: true,
        reply: 'Engine is hot! Follow the cyan GPS beacon east to Hotel Ocean Sol and corner the syndicate.'
      },
      {
        label: 'Grab $200 Vault Stipend & Cipher Note First (+$200, +Clue)',
        cashDelta: 200,
        repDelta: 25,
        clue: 'Athenaeum Vault Seal: 1-8-4',
        autoDrive: false,
        reply: 'Smart preparation! You pocket $200 and the 1-8-4 vault seal. Hop in any car with [E] or explore on foot.'
      }
    ]
  }
];

export const LIBRARY_PROLOGUE_SCENE = {
  title: 'Prologue: The Midnight Break-In',
  lines: [
    {
      speaker: 'Elena Vance',
      role: 'Archive Curator (Radio)',
      text: 'Wait—listen! Someone just forced the North Alcove lock and escaped through the South Carved Door toward Ocean Drive with the Sovereign Codex!'
    },
    {
      speaker: 'You',
      role: 'Protagonist',
      text: 'I can still catch their trail before they reach the coast. Where did they head?',
      choices: [
        {
          label: 'Inspect the Desk Note & Grab Emergency Cash (+$150, +Clue)',
          cashDelta: 150,
          repDelta: 25,
          clue: 'Vault Seal: 1884 (1-8-4)',
          reply: 'Smart! You pocket the $150 archive stipend and note the 1884 vault seal before heading to the South Door.'
        },
        {
          label: 'Sprint Straight for the South Door (+75 Speed Rep)',
          cashDelta: 0,
          repDelta: 75,
          clue: 'Fast Exit Momentum',
          reply: 'No time to waste! Head straight to the carved wooden South Door behind you and press E (or click it) to burst out into Leonida Bay!'
        }
      ]
    }
  ]
};

export const CHAPTERS = [
  {
    id: 1,
    title: 'Chapter 1: Arrival at Ocean Drive',
    summary: 'Step outside The Grand Athenaeum, meet Elena Vance, and cruise Ocean Drive to Hotel Ocean Sol.',
    rewardCash: 500,
    rewardRep: 100,
    preset: 'sunset',
    steps: [
      {
        type: 'talk',
        npcId: 'elena',
        label: 'Speak with Elena Vance outside the Athenaeum steps',
        target: { x: -54, z: 3.5 },
        radius: 3.8,
        cameraFocus: { pos: { x: -49.2, y: 2.0, z: 5.8 }, target: { x: -54, y: 1.45, z: 3.5 } },
        dialogue: [
          { speaker: 'Elena Vance', role: 'Archive Curator', text: 'You made it out! Their getaway car tore east toward Ocean Drive. My contact spotted them near Hotel Ocean Sol.' },
          {
            speaker: 'Elena Vance',
            role: 'Archive Curator',
            text: 'How do you want to roll into Ocean Drive?',
            choices: [
              {
                label: 'Take the open-top Banshee GT at the curb (+50 Rep)',
                repDelta: 50,
                reply: 'The cyan Banshee GT is fueled and ready right ahead. Hop in with [E] and follow the cyan GPS beacon!'
              },
              {
                label: 'Ask Elena for extra syndicate intel (+$150)',
                cashDelta: 150,
                clue: 'Syndicate Car: Silver Sedan',
                reply: 'Here is $150 for bribes, and look for neon pink signs along Ocean Drive. Grab a ride with [E]!'
              }
            ]
          }
        ]
      },
      {
        type: 'driveTo',
        label: 'Drive any vehicle to Hotel Ocean Sol on Ocean Drive',
        target: { x: 31, z: -18 },
        radius: 6.5
      }
    ]
  },
  {
    id: 2,
    title: 'Chapter 2: The Neon Ledger',
    summary: 'Question informant Marco "Keys" at Café Sol and recover 3 scattered ledger pages.',
    rewardCash: 900,
    rewardRep: 180,
    preset: 'sunset',
    steps: [
      {
        type: 'talk',
        npcId: 'marco',
        label: 'Meet Marco "Keys" at Café de la Place',
        target: { x: 16.5, z: -15.5 },
        radius: 3.8,
        cameraFocus: { pos: { x: 20.5, y: 2.0, z: -11.5 }, target: { x: 16.5, y: 1.45, z: -15.5 } },
        dialogue: [
          { speaker: 'Marco "Keys"', role: 'Street Informant', text: 'Keep your sunglasses on. The courier panicked near the fountain roundabout and dumped three ledger pages.' },
          {
            speaker: 'Marco "Keys"',
            role: 'Street Informant',
            text: 'I can mark them on your GPS, or slip you the cipher shortcut for a small cut.',
            choices: [
              {
                label: 'Press Marco gently — earn his trust (+80 Rep)',
                repDelta: 80,
                reply: 'Alright, alright—for you, no fee. Check the fountain rim, the beach boardwalk, and Apex Plaza!'
              },
              {
                label: 'Bribe Marco ($100) for the full vault cipher clue',
                cashDelta: -100,
                repDelta: 40,
                clue: 'Vault Code: 1 - 8 - 4',
                reply: 'Pleasure doing business. Write this down: the vault cipher is 1-8-4. Now grab those 3 pages!'
              }
            ]
          }
        ]
      },
      {
        type: 'collectAll',
        label: 'Recover 3 Ledger Fragments around Downtown & Boardwalk',
        points: [
          { x: 0, z: 7.5, name: 'Fountain Rim Ledger' },
          { x: 44, z: -8, name: 'Boardwalk Ledger' },
          { x: -13, z: 18, name: 'Apex Plaza Ledger' }
        ],
        radius: 3.2
      }
    ]
  },
  {
    id: 3,
    title: 'Chapter 3: Midnight Street Run',
    summary: 'Cut off rival couriers by hitting 5 midnight neon checkpoints before lockdown.',
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
    summary: 'Outrun a 2-Star Police Pursuit across Leonida and reach Vieux Bay Garage.',
    rewardCash: 1800,
    rewardRep: 300,
    preset: 'neonNight',
    steps: [
      {
        type: 'evadeWanted',
        label: 'Evade 2-Star Police Pursuit (stay >24m away for 22s)',
        wantedStars: 2,
        evadeSeconds: 22
      },
      {
        type: 'reach',
        label: 'Park at Vieux Bay Garage Safe House',
        target: { x: -46, z: -24 },
        radius: 6.0
      }
    ]
  },
  {
    id: 5,
    title: 'Chapter 5: The Harbor Smuggler',
    summary: 'Interrogate Dockmaster Rico at Leonida Marina and inspect 4 shipping crates.',
    rewardCash: 2100,
    rewardRep: 350,
    preset: 'tropicalNoon',
    steps: [
      {
        type: 'talk',
        npcId: 'rico',
        label: 'Talk to Dockmaster Rico at Leonida Marina',
        target: { x: 41, z: 54 },
        radius: 4.0,
        cameraFocus: { pos: { x: 36, y: 2.2, z: 50 }, target: { x: 41, y: 1.4, z: 54 } },
        dialogue: [
          { speaker: 'Dockmaster Rico', role: 'Harbor Master', text: 'Four unmarked crates came off a midnight speedboat onto the pier. One holds forged Codex plates.' },
          {
            speaker: 'Dockmaster Rico',
            role: 'Harbor Master',
            text: 'Police are watching the main road—how do you want to search the pier?',
            choices: [
              {
                label: 'Inspect officially with Athenaeum credentials (+100 Rep)',
                repDelta: 100,
                reply: 'Fair enough, Investigator. Walk or drive onto the wooden pier and scan all four crates.'
              },
              {
                label: 'Slip Rico $150 to look the other way (+$300 crate bonus)',
                cashDelta: 150,
                clue: 'Pier Manifest #84',
                reply: 'You never saw me. There is extra contraband cash inside the Amber crate too!'
              }
            ]
          }
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
        radius: 4.2,
        cameraFocus: { pos: { x: 29, y: 2.1, z: -32 }, target: { x: 34, y: 1.45, z: -36 } },
        dialogue: [
          { speaker: 'Viktor Kaine', role: 'Rival Street Racer', text: 'Word is you have been tearing up Ocean Drive. Think you can beat my coastal lap?' },
          {
            speaker: 'Viktor Kaine',
            role: 'Rival Street Racer',
            text: 'Name your stakes—winner gets the location of the Sovereign Codex vault.',
            choices: [
              {
                label: 'Race for pure street respect (+200 Bonus Rep)',
                repDelta: 200,
                reply: 'Respect. Keep your foot down and use [Shift] Nitro on the straights!'
              },
              {
                label: 'High-stakes side bet (+$1,000 bonus on win)',
                cashDelta: 1000,
                reply: 'Now you are talking! Beat 135 seconds across all 10 checkpoints!'
              }
            ]
          }
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
    summary: 'Intercept 4 syndicate relay beacons across rain-slicked boulevards during the storm.',
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
        hint: 'Athenaeum founding cipher (from Marco & Clues): 1 - 8 - 4'
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
    summary: 'Return the Sovereign Codex to Elena Vance at golden dawn and decide its fate.',
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
        cameraFocus: { pos: { x: -49.2, y: 2.0, z: 5.8 }, target: { x: -54, y: 1.45, z: 3.5 } },
        dialogue: [
          { speaker: 'Elena Vance', role: 'Archive Curator', text: 'You actually brought back the Sovereign Codex intact! Every cruiser in Leonida was on your bumper.' },
          {
            speaker: 'Elena Vance',
            role: 'Archive Curator',
            text: 'How should we celebrate and secure the Codex’s legacy?',
            choices: [
              {
                label: 'Lock it inside the Athenaeum for all readers (+1,000 Rep)',
                repDelta: 1000,
                reply: 'A true guardian of the Athenaeum! Free Roam & Chapter Replay are now yours across Leonida Bay.'
              },
              {
                label: 'Claim the City Hero Bounty & cruise Ocean Drive (+$5,000)',
                cashDelta: 5000,
                reply: 'You earned every dollar of it! Enjoy the coastal sunset and the full fleet in Free Roam.'
              }
            ]
          }
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
    this.freeRoamHeatTimer = 0;
    this.evadeTimer = 0;
    this.stepTimer = 0;
    this.dialogueActive = false;
    this.puzzleOpen = false;
    this.collectedStepIndices = new Set();
    this.raceIndex = 0;
    this.knockdowns = 0;

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
          playerName: parsed.playerName || 'Julian Vance',
          originId: parsed.originId || 'archivist',
          coatColor: parsed.coatColor || '#1d4f6e',
          chapterIndex: Math.min(CHAPTERS.length - 1, Math.max(0, Number(parsed.chapterIndex) || 0)),
          stepIndex: Math.max(0, Number(parsed.stepIndex) || 0),
          completed: Boolean(parsed.completed),
          cash: Number(parsed.cash) || 400,
          rep: Number(parsed.rep) || 50,
          clues: Array.isArray(parsed.clues) ? parsed.clues : [],
          trophies: Array.isArray(parsed.trophies) ? parsed.trophies : []
        };
      }
    } catch {
      // ignore
    }
    return {
      playerName: 'Julian Vance',
      originId: 'archivist',
      coatColor: '#1d4f6e',
      chapterIndex: 0,
      stepIndex: 0,
      completed: false,
      cash: 400,
      rep: 50,
      clues: ['Founding Cipher Digit: 1-8-4'],
      trophies: []
    };
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  applyCharacterProfile(profile) {
    if (!profile) return;
    this.state.playerName = profile.playerName || this.state.playerName;
    this.state.originId = profile.originId || this.state.originId;
    this.state.coatColor = profile.coatColor || this.state.coatColor;
    if (typeof profile.cashDelta === 'number') this.state.cash = Math.max(0, this.state.cash + profile.cashDelta);
    if (typeof profile.repDelta === 'number') this.state.rep = Math.max(0, this.state.rep + profile.repDelta);
    if (profile.clue && !this.state.clues.includes(profile.clue)) this.state.clues.push(profile.clue);
    this.save();
  }

  applyChoiceEffects(choice) {
    if (!choice) return;
    if (typeof choice.cashDelta === 'number') this.state.cash = Math.max(0, this.state.cash + choice.cashDelta);
    if (typeof choice.repDelta === 'number') this.state.rep = Math.max(0, this.state.rep + choice.repDelta);
    if (choice.clue && !this.state.clues.includes(choice.clue)) this.state.clues.push(choice.clue);
    this.save();
  }

  getCurrentChapter() {
    return CHAPTERS[this.state.chapterIndex] || CHAPTERS[CHAPTERS.length - 1];
  }

  getCurrentStep() {
    if (this.state.completed) return null;
    return this.getCurrentChapter().steps[this.state.stepIndex] || null;
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
    this.state = {
      ...this.state,
      chapterIndex: 0,
      stepIndex: 0,
      completed: false,
      cash: 400,
      rep: 50,
      trophies: []
    };
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

    this.state.cash += ch.rewardCash;
    this.state.rep += ch.rewardRep;
    this.wantedStars = 0;
    this.onToast?.(`${ch.title} Complete! +$${ch.rewardCash} · +${ch.rewardRep} Rep`);

    if (this.state.chapterIndex + 1 < CHAPTERS.length) {
      this.state.chapterIndex += 1;
      this.state.stepIndex = 0;
    } else {
      this.state.completed = true;
      this.onToast?.('Campaign Complete! Free Roam & Chapter Replay Unlocked!');
    }
    this.save();
    this.applyChapterSetup();
  }

  triggerWanted(minStars = 1) {
    this.wantedStars = Math.min(3, Math.max(this.wantedStars, minStars));
    this.freeRoamHeatTimer = 18;
  }

  addCash(amount) {
    this.state.cash = Math.max(0, this.state.cash + amount);
    this.save();
  }

  update(dt, elapsed, playerPos, inCar, policeUnits, openDialogueFn, openCipherFn) {
    const currentStep = this.getCurrentStep();
    if (this.wantedStars > 0 && currentStep?.type !== 'evadeWanted' && currentStep?.type !== 'escapeTo') {
      const nearestCop = policeUnits.reduce((min, u) => {
        const d = Math.hypot(playerPos.x - u.car.root.position.x, playerPos.z - u.car.root.position.z);
        return Math.min(min, d);
      }, 999);
      if (nearestCop > 24) {
        this.freeRoamHeatTimer -= dt;
        if (this.freeRoamHeatTimer <= 0) {
          this.wantedStars = 0;
          this.onToast?.('Wanted heat cooled down.');
        }
      } else {
        this.freeRoamHeatTimer = 18;
      }
    }
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
        openDialogueFn(step, (choice) => {
          this.applyChoiceEffects(choice);
        }, () => {
          this.dialogueActive = false;
          this.advanceStep();
        });
      }
    } else if (step.type === 'driveTo') {
      const dist = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      if (inCar && dist <= step.radius) this.advanceStep();
    } else if (step.type === 'reach' || step.type === 'escapeTo') {
      const dist = Math.hypot(playerPos.x - step.target.x, playerPos.z - step.target.z);
      if (dist <= step.radius) this.advanceStep();
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
      if (this.collectedStepIndices.size >= step.points.length) this.advanceStep();
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
          if (this.raceIndex >= step.points.length) this.advanceStep();
          else {
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
