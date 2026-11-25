import * as THREE from 'three';
import {
  createWetAsphaltTextures,
  createSidewalkPaverTexture,
  createSandTexture,
  createGrassTexture,
  createGlassSkyscraperTexture,
  createNeonSignTexture,
  createPlasterTexture,
  createRoofTileTexture,
  createContactShadowTexture
} from './textures.js';

export function buildLeonidaArena({ scene, renderer, onRegisterLandmark }) {
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const asphaltTex = createWetAsphaltTextures(maxAnisotropy);
  const sidewalkTex = createSidewalkPaverTexture(maxAnisotropy);
  const sandTex = createSandTexture(maxAnisotropy);
  const grassTex = createGrassTexture(maxAnisotropy);
  const contactShadowTex = createContactShadowTexture();

  const terracottaRoofTex = createRoofTileTexture('#a64b35', '#8c3c29');
  const slateRoofTex = createRoofTileTexture('#39404a', '#2b313a');

  const walkObstacles = [];
  const carObstacles = [];
  const streetLampLights = [];
  const streetLampBulbs = [];
  const neonMaterials = [];
  const swayingTrees = [];
  const fountainDroplets = [];
  let fountainWaterMesh = null;

  const sharedWindowGlowMat = new THREE.MeshStandardMaterial({
    color: '#ffe3a8',
    emissive: new THREE.Color('#ffaa44'),
    emissiveIntensity: 1.05,
    roughness: 0.22,
    metalness: 0.14
  });

  const sharedWindowGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#bde0f4',
    roughness: 0.06,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.44
  });

  const wroughtIronMat = new THREE.MeshStandardMaterial({ color: '#1f2026', roughness: 0.4, metalness: 0.78 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: '#472f20', roughness: 0.78, metalness: 0.06 });
  const warmStoneMat = new THREE.MeshStandardMaterial({ color: '#cfc4b2', roughness: 0.85, metalness: 0.03 });

  function addContactShadow(parent, rx, rz = rx, y = 0.015) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(rx * 2, rz * 2),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.72 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    parent.add(m);
  }

  /* -------------------------------------------------------------------------
     1. GROUND, WET ASPHALT ROADS, SIDEWALKS, BEACH & COASTAL HILLS
     ------------------------------------------------------------------------- */
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.94, metalness: 0.02 });
  const grassGround = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), grassMat);
  grassGround.rotation.x = -Math.PI / 2;
  grassGround.position.set(-70, -0.08, 0);
  grassGround.receiveShadow = true;
  scene.add(grassGround);

  // Rolling coastal hills on the West/North/South horizon
  const hillMat = new THREE.MeshStandardMaterial({ color: '#3b5332', roughness: 0.96 });
  for (let i = 0; i < 18; i++) {
    const angle = Math.PI * 0.55 + (i / 17) * Math.PI * 0.9;
    const dist = 115 + (i % 3) * 18;
    const r = 18 + (i % 4) * 6;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hillMat);
    hill.scale.set(1.8, 0.52, 1.4);
    hill.position.set(Math.cos(angle) * dist - 15, -0.5, Math.sin(angle) * dist);
    scene.add(hill);
  }

  // City Wet Asphalt Bed
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex.map,
    roughnessMap: asphaltTex.roughnessMap,
    bumpMap: asphaltTex.bumpMap,
    bumpScale: 0.08,
    roughness: 0.85,
    metalness: 0.12
  });
  const cityAsphalt = new THREE.Mesh(new THREE.BoxGeometry(148, 0.1, 148), roadMat);
  cityAsphalt.position.set(-22, -0.05, 0);
  cityAsphalt.receiveShadow = true;
  scene.add(cityAsphalt);

  // Road Lane Stripes (Dashed yellow/white coastal boulevard lines)
  const yellowLineMat = new THREE.MeshStandardMaterial({ color: '#f0b840', roughness: 0.5 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: '#e6e4de', roughness: 0.55 });

  [-34, 34].forEach((coord) => {
    for (let s = -64; s <= 64; s += 6) {
      if (Math.abs(s) < 9 || Math.abs(Math.abs(s) - 34) < 6) continue;
      const dashNS = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 3.0), yellowLineMat);
      dashNS.rotation.x = -Math.PI / 2;
      dashNS.position.set(coord, 0.012, s);
      scene.add(dashNS);

      if (coord === -34) {
        // Horizontal boulevards at z = -34 and z = 34
        [-34, 34].forEach((zLine) => {
          const dashEW = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.24), yellowLineMat);
          dashEW.rotation.x = -Math.PI / 2;
          dashEW.position.set(s - 6, 0.012, zLine);
          scene.add(dashEW);
        });
      }
    }
  });

  // Crosswalks around main intersections
  [
    { x: 0, z: 10.5, rot: 0 }, { x: 0, z: -10.5, rot: 0 },
    { x: 10.5, z: 0, rot: Math.PI / 2 }, { x: -10.5, z: 0, rot: Math.PI / 2 },
    { x: 34, z: 10.5, rot: 0 }, { x: 34, z: -10.5, rot: 0 }
  ].forEach((cw) => {
    const g = new THREE.Group();
    g.position.set(cw.x, 0.014, cw.z);
    g.rotation.y = cw.rot;
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 2.4), whiteLineMat);
      stripe.position.x = i * 1.45;
      g.add(stripe);
    }
    scene.add(g);
  });

  // Four Sidewalk Quadrant Blocks
  const blockMat = new THREE.MeshStandardMaterial({ map: sidewalkTex.clone(), roughness: 0.78 });
  blockMat.map.repeat.set(5, 5);
  [
    { x: -18, z: -18, w: 21, d: 21 },
    { x: 18, z: -18, w: 21, d: 21 },
    { x: -18, z: 18, w: 21, d: 21 },
    { x: 18, z: 18, w: 21, d: 21 }
  ].forEach((b) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.2, b.d), blockMat);
    slab.position.set(b.x, 0.1, b.z);
    slab.receiveShadow = true;
    slab.castShadow = true;
    scene.add(slab);
  });

  // Ocean Drive Boardwalk & Golden Sand Beach (East Coast)
  const boardwalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex.clone(), roughness: 0.72 });
  boardwalkMat.map.repeat.set(3, 28);
  const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.22, 148), boardwalkMat);
  boardwalk.position.set(43.5, 0.11, 0);
  boardwalk.receiveShadow = true;
  scene.add(boardwalk);

  const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.94 });
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(24, 190), sandMat);
  beach.rotation.x = -Math.PI / 2;
  beach.rotation.y = -0.02;
  beach.position.set(58, -0.02, 0);
  beach.receiveShadow = true;
  scene.add(beach);

  // Wooden Marina Pier extending into the Ocean (South-East)
  const pierGroup = new THREE.Group();
  pierGroup.position.set(55, 0.35, 54);
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(28, 0.35, 8.5), darkWoodMat);
  pierDeck.castShadow = true;
  pierDeck.receiveShadow = true;
  pierGroup.add(pierDeck);
  for (let px = -12; px <= 12; px += 4) {
    [-3.8, 3.8].forEach((pz) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.2, 8), darkWoodMat);
      piling.position.set(px, -0.7, pz);
      pierGroup.add(piling);
    });
  }
  // Shipping crates at Marina Docks
  const crateColors = ['#b83b32', '#26618a', '#357856', '#c4832b'];
  [
    { x: -12, z: -2.2, c: 0 }, { x: -7, z: 2.3, c: 1 },
    { x: 2, z: -2.1, c: 2 }, { x: 8, z: 2.1, c: 3 }
  ].forEach((cr, idx) => {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.2, 2.3),
      new THREE.MeshStandardMaterial({ color: crateColors[cr.c], roughness: 0.72, metalness: 0.2 })
    );
    crate.position.set(cr.x, 1.25, cr.z);
    crate.castShadow = true;
    crate.userData.crateIdx = idx;
    pierGroup.add(crate);
  });
  scene.add(pierGroup);

  /* -------------------------------------------------------------------------
     2. CENTRAL FOUNTAIN ROUNDABOUT
     ------------------------------------------------------------------------- */
  function buildCentralFountain() {
    const group = new THREE.Group();
    group.position.set(0, 0.08, 0);

    const island = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.1, 0.2, 32), warmStoneMat);
    island.receiveShadow = true;
    group.add(island);

    const basinWall = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.85, 16), warmStoneMat);
    basinWall.position.y = 0.45;
    basinWall.castShadow = true;
    group.add(basinWall);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: '#2597a8',
      roughness: 0.06,
      metalness: 0.1,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88
    });
    fountainWaterMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.14, 24), waterMat);
    fountainWaterMesh.position.y = 0.76;
    group.add(fountainWaterMesh);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.88, 2.2, 12), warmStoneMat);
    pedestal.position.y = 1.45;
    pedestal.castShadow = true;
    const midBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 0.6, 0.5, 16), warmStoneMat);
    midBowl.position.y = 2.45;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 1.1, 10), warmStoneMat);
    spire.position.y = 3.2;
    group.add(pedestal, midBowl, spire);

    const dropGeo = new THREE.SphereGeometry(0.065, 6, 6);
    const dropMat = new THREE.MeshStandardMaterial({ color: '#d8f9ff', emissive: '#62e0f5', emissiveIntensity: 0.6 });
    for (let i = 0; i < 24; i++) {
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.userData = { angle: (i / 24) * Math.PI * 2, phase: Math.random(), speed: 0.55 + Math.random() * 0.35, radius: 0.7 + Math.random() * 1.3 };
      group.add(drop);
      fountainDroplets.push(drop);
    }

    scene.add(group);
    walkObstacles.push({ minX: -4.2, maxX: 4.2, minZ: -4.2, maxZ: 4.2 });
    carObstacles.push({ minX: -4.8, maxX: 4.8, minZ: -4.8, maxZ: 4.8 });

    onRegisterLandmark({
      id: 'fountain',
      name: 'Plaza Fountain',
      category: 'Downtown Landmark',
      style: 'Neoclassical & Neon',
      era: 'Restored 2026',
      desc: 'The central roundabout linking Leonida’s historic quarter with Ocean Drive.',
      group,
      focusPos: new THREE.Vector3(10, 2.2, 10),
      focusTarget: new THREE.Vector3(0, 1.8, 0),
      hotspotPos: new THREE.Vector3(0, 4.8, 0)
    });
  }

  /* -------------------------------------------------------------------------
     3. MODERN SKYSCRAPERS, ART DECO NEON HOTELS & HISTORIC QUARTER
     ------------------------------------------------------------------------- */
  function createGlassSkyscraper(cfg) {
    const group = new THREE.Group();
    group.position.set(cfg.x, 0.1, cfg.z);
    group.rotation.y = cfg.rotY || 0;

    const { w, h, d } = cfg.size;
    walkObstacles.push({ minX: cfg.x - w / 2, maxX: cfg.x + w / 2, minZ: cfg.z - d / 2, maxZ: cfg.z + d / 2 });
    carObstacles.push({ minX: cfg.x - w / 2, maxX: cfg.x + w / 2, minZ: cfg.z - d / 2, maxZ: cfg.z + d / 2 });

    const facadeTex = createGlassSkyscraperTexture(cfg.tint || '#18324a', cfg.lit || '#ffd696');
    const glassBodyMat = new THREE.MeshPhysicalMaterial({
      map: facadeTex,
      roughness: 0.12,
      metalness: 0.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      emissive: new THREE.Color(cfg.lit || '#ffb866'),
      emissiveMap: facadeTex,
      emissiveIntensity: 0.32
    });

    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassBodyMat);
    tower.position.y = h / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    // Rooftop crown & glowing neon trim
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 2.6, d * 0.72), new THREE.MeshStandardMaterial({ color: '#1b2029', metalness: 0.7, roughness: 0.25 }));
    crown.position.y = h + 1.3;
    group.add(crown);

    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: cfg.neonColor || '#38e8ff',
      emissive: new THREE.Color(cfg.neonColor || '#38e8ff'),
      emissiveIntensity: 2.2
    });
    neonMaterials.push(neonTrimMat);

    const neonBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.35, d + 0.25), neonTrimMat);
    neonBand.position.y = h - 0.3;
    group.add(neonBand);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 6.5, 8), neonTrimMat);
    spire.position.y = h + 5.6;
    group.add(spire);

    if (cfg.signText) {
      const signTex = createNeonSignTexture(cfg.signText, cfg.signSub || '', cfg.neonColor || '#38e8ff');
      const sMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: '#ffffff', emissiveIntensity: 1.4 });
      neonMaterials.push(sMat);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 1.5, 0.22), sMat);
      sign.position.set(0, 4.2, d / 2 + 0.16);
      group.add(sign);
    }

    scene.add(group);
    onRegisterLandmark({
      id: cfg.id,
      name: cfg.name,
      category: cfg.category,
      style: 'Contemporary Glass High-Rise',
      era: '2026 Skyline',
      desc: cfg.desc,
      group,
      focusPos: new THREE.Vector3(cfg.x, 3.2, cfg.z + d / 2 + 16),
      focusTarget: new THREE.Vector3(cfg.x, h * 0.45, cfg.z),
      hotspotPos: new THREE.Vector3(cfg.x, h + 4.5, cfg.z)
    });
  }

  function createArtDecoOrHeritageBuilding(cfg) {
    const group = new THREE.Group();
    group.position.set(cfg.x, 0.16, cfg.z);
    group.rotation.y = cfg.rotY || 0;

    const { w, h, d } = cfg.size;
    const yaw = cfg.rotY || 0;
    const halfX = (Math.abs(Math.cos(yaw)) * w + Math.abs(Math.sin(yaw)) * d) / 2;
    const halfZ = (Math.abs(Math.sin(yaw)) * w + Math.abs(Math.cos(yaw)) * d) / 2;
    walkObstacles.push({ minX: cfg.x - halfX, maxX: cfg.x + halfX, minZ: cfg.z - halfZ, maxZ: cfg.z + halfZ });
    carObstacles.push({ minX: cfg.x - halfX, maxX: cfg.x + halfX, minZ: cfg.z - halfZ, maxZ: cfg.z + halfZ });

    const wallMat = new THREE.MeshStandardMaterial({ map: createPlasterTexture(cfg.wallColor), roughness: 0.82 });
    const trimMat = new THREE.MeshStandardMaterial({ color: cfg.trimColor || '#f4ede0', roughness: 0.72 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cornice / Art Deco stepped parapet
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.36, d + 0.4), trimMat);
    cornice.position.y = h - 0.1;
    group.add(cornice);

    if (cfg.neonColor) {
      const neonMat = new THREE.MeshStandardMaterial({
        color: cfg.neonColor,
        emissive: new THREE.Color(cfg.neonColor),
        emissiveIntensity: 2.3
      });
      neonMaterials.push(neonMat);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.2, d + 0.25), neonMat);
      strip.position.y = h - 0.45;
      group.add(strip);

      const vNeon = new THREE.Mesh(new THREE.BoxGeometry(0.24, h * 0.75, 0.24), neonMat);
      vNeon.position.set(0, h * 0.55, d / 2 + 0.14);
      group.add(vNeon);
    }

    if (!cfg.isArtDeco) {
      const roofMat = new THREE.MeshStandardMaterial({ map: cfg.roofType === 'mansard' ? slateRoofTex : terracottaRoofTex, roughness: 0.76 });
      const mansard = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.48, Math.max(w, d) * 0.7, 2.4, 4), roofMat);
      mansard.rotation.y = Math.PI / 4;
      mansard.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
      mansard.position.y = h + 1.2;
      mansard.castShadow = true;
      group.add(mansard);
    }

    // Windows with reflective glass over warm interior
    const winCols = w >= 8.5 ? 3 : 2;
    for (let f = 0; f < Math.max(1, cfg.floors - 1); f++) {
      const wy = 4.5 + f * 3.0;
      for (let c = 0; c < winCols; c++) {
        const wx = (winCols === 2 ? (c === 0 ? -0.25 : 0.25) : (c - 1) * 0.3) * w;
        const wFrame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.8, 0.16), trimMat);
        wFrame.position.set(wx, wy, d / 2 + 0.04);
        const wGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), sharedWindowGlowMat);
        wGlow.position.set(wx, wy, d / 2 + 0.13);
        const wReflect = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), sharedWindowGlassMat);
        wReflect.position.set(wx, wy, d / 2 + 0.145);
        group.add(wFrame, wGlow, wReflect);
      }
    }

    // Ground floor doorway & signboard
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.22), darkWoodMat);
    door.position.set(0, 1.3, d / 2 + 0.06);
    group.add(door);

    if (cfg.signText) {
      const sTex = createNeonSignTexture(cfg.signText, cfg.signSub || '', cfg.neonColor || '#ffbe55', cfg.isArtDeco ? '#160d20' : '#261b14');
      const sMat = new THREE.MeshStandardMaterial({ map: sTex, emissiveMap: sTex, emissive: '#ffffff', emissiveIntensity: cfg.neonColor ? 1.45 : 0.55 });
      if (cfg.neonColor) neonMaterials.push(sMat);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.76, 5.2), 1.1, 0.16), sMat);
      sign.position.set(0, 3.45, d / 2 + 0.18);
      group.add(sign);
    }

    scene.add(group);
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    onRegisterLandmark({
      id: cfg.id,
      name: cfg.name,
      category: cfg.category,
      style: cfg.isArtDeco ? 'Ocean Drive Art Deco' : 'Historic Quarter',
      era: cfg.era || '1920s–2026',
      desc: cfg.desc,
      group,
      focusPos: new THREE.Vector3(cfg.x, 1.85, cfg.z).addScaledVector(forward, Math.max(w, d) * 1.4 + 6),
      focusTarget: new THREE.Vector3(cfg.x, h * 0.45, cfg.z),
      hotspotPos: new THREE.Vector3(cfg.x, h + 3.0, cfg.z)
    });
  }

  /* -------------------------------------------------------------------------
     4. SWAYING COCONUT PALMS, LINDEN TREES & NEON STREET LAMPS
     ------------------------------------------------------------------------- */
  function createPalmTree(x, z, scale = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(x, 0.12, z);
    addContactShadow(tree, 1.4, 1.4, 0.02);

    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b5341', roughness: 0.92 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#396e35', roughness: 0.78, side: THREE.DoubleSide });

    let prevX = 0;
    for (let seg = 0; seg < 6; seg++) {
      const hSeg = 1.05;
      const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - seg * 0.018, 0.22 - seg * 0.018, hSeg, 8), trunkMat);
      prevX += seg * 0.06;
      segMesh.position.set(prevX, 0.5 + seg * 0.96, 0);
      segMesh.rotation.z = -seg * 0.045;
      segMesh.castShadow = true;
      tree.add(segMesh);
    }

    const crown = new THREE.Group();
    crown.position.set(prevX + 0.1, 6.0, 0);
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2;
      const frondGroup = new THREE.Group();
      frondGroup.rotation.y = angle;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.7, 5), leafMat);
      frond.scale.set(1.2, 1.0, 0.16);
      frond.rotation.z = -Math.PI * 0.34;
      frond.position.set(1.2, -0.25, 0);
      frond.castShadow = true;
      frondGroup.add(frond);
      crown.add(frondGroup);
    }
    tree.add(crown);
    tree.scale.setScalar(scale);
    scene.add(tree);

    swayingTrees.push({ canopy: crown, phase: Math.random() * 6, speed: 1.3 + Math.random() * 0.4 });
    carObstacles.push({ minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.55, maxZ: z + 0.55 });
  }

  function createStreetLamp(x, z, neonTint = '#ffaa4c') {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0.1, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 4.4, 8), wroughtIronMat);
    pole.position.y = 2.2;
    pole.castShadow = true;
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff4d2', emissive: new THREE.Color(neonTint), emissiveIntensity: 2.0 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bulbMat);
    head.position.y = 4.5;
    lamp.add(pole, head);
    streetLampBulbs.push(bulbMat);

    const light = new THREE.PointLight(neonTint, 2.2, 18, 1.7);
    light.position.y = 4.35;
    lamp.add(light);
    streetLampLights.push({ light, phase: Math.random() * 6, speed: 2.2 });
    scene.add(lamp);
  }

  /* -------------------------------------------------------------------------
     5. POPULATE BUILDINGS, PALM BOULEVARD & PROPS
     ------------------------------------------------------------------------- */
  buildCentralFountain();

  // Glass Skyscrapers
  createGlassSkyscraper({
    id: 'glass_tower',
    name: 'Leonida Horizon Tower',
    category: 'Downtown Skyscraper',
    size: { w: 9.5, h: 28, d: 9.5 },
    x: -20, z: -18,
    tint: '#142d46', lit: '#ffd28a', neonColor: '#38e8ff',
    signText: 'HORIZON CORP', signSub: 'Financial Tower',
    desc: 'A 28-meter glass curtain high-rise mirroring Leonida’s coastal sky and neon streets.'
  });

  createGlassSkyscraper({
    id: 'apex_tower',
    name: 'Apex Bay Plaza',
    category: 'Downtown Skyscraper',
    size: { w: 9.5, h: 32, d: 9.5 },
    x: -20, z: 18,
    tint: '#1d223f', lit: '#ffb7d5', neonColor: '#ff4ec7',
    signText: 'APEX BAY', signSub: 'Media & Vault',
    desc: 'The tallest tower in the quarter, crowned in magenta neon above the southern plaza.'
  });

  createGlassSkyscraper({
    id: 'ocean_condo',
    name: 'Oceanfront Residence',
    category: 'Coastal High-Rise',
    size: { w: 10, h: 24, d: 9 },
    x: 20, z: -52,
    tint: '#12384a', lit: '#ffe1a8', neonColor: '#45ffd2',
    signText: 'BAYVIEW', signSub: 'Luxury Suites',
    desc: 'Overlooking the northern boulevard and turquoise bay shoreline.'
  });

  // Art Deco Neon Strip & Historic Quarter
  createArtDecoOrHeritageBuilding({
    id: 'ocean_hotel',
    name: 'Hotel Ocean Sol',
    category: 'Art Deco Neon Hotel',
    isArtDeco: true,
    size: { w: 10, h: 12.5, d: 7.5 },
    x: 20, z: -18, rotY: Math.PI / 2,
    floors: 3, wallColor: '#f2dfd5', trimColor: '#ffffff',
    neonColor: '#ff4ec7', signText: 'HOTEL SOL', signSub: 'Ocean Drive',
    desc: 'Iconic pastel Art Deco beachfront hotel glowing in magenta and cyan neon.'
  });

  createArtDecoOrHeritageBuilding({
    id: 'neon_club',
    name: 'Club Neon Palms',
    category: 'Nightlife & Lounge',
    isArtDeco: true,
    size: { w: 10, h: 10.5, d: 7.5 },
    x: 20, z: 18, rotY: Math.PI / 2,
    floors: 2, wallColor: '#d4e9ec', trimColor: '#f8fafc',
    neonColor: '#38e8ff', signText: 'NEON PALMS', signSub: 'Lounge & Arcade',
    desc: 'A pulsing coastal lounge along Ocean Drive where informants and racers gather.'
  });

  createArtDecoOrHeritageBuilding({
    id: 'cafe_sol',
    name: 'Café de la Place',
    category: 'Bistro & Hangout',
    isArtDeco: false,
    size: { w: 7.6, h: 7.5, d: 6.2 },
    x: 13, z: -12, rotY: -Math.PI * 0.25,
    floors: 2, wallColor: '#dfd2ba', roofType: 'mansard',
    signText: 'CAFÉ SOL', signSub: 'Espresso & Intel',
    desc: 'Sunlit corner terrace overlooking the Plaza Fountain—Marco’s favorite meeting spot.'
  });

  createArtDecoOrHeritageBuilding({
    id: 'precinct',
    name: 'Leonida Precinct',
    category: 'Police Headquarters',
    isArtDeco: true,
    size: { w: 11, h: 8.5, d: 8 },
    x: -16, z: -52, rotY: 0,
    floors: 2, wallColor: '#cfd8e3', trimColor: '#eef2f6',
    neonColor: '#3b82f6', signText: 'PRECINCT 04', signSub: 'Leonida PD',
    desc: 'District patrol headquarters dispatching interceptor cruisers.'
  });

  createArtDecoOrHeritageBuilding({
    id: 'safehouse_garage',
    name: 'Vieux Bay Garage',
    category: 'Safe House & Tuning',
    isArtDeco: true,
    size: { w: 9.5, h: 6.5, d: 7.5 },
    x: -54, z: -24, rotY: Math.PI / 2,
    floors: 1, wallColor: '#d9c5a9', trimColor: '#262322',
    neonColor: '#ffb347', signText: 'GARAGE', signSub: 'Safe House',
    desc: 'Your private workshop and cooldown safe house on the western edge of town.'
  });

  createArtDecoOrHeritageBuilding({
    id: 'athenaeum',
    name: 'The Grand Athenaeum',
    category: 'Your Library (Return Home)',
    isArtDeco: false,
    size: { w: 11, h: 11.2, d: 8.8 },
    x: -60, z: 0, rotY: Math.PI / 2,
    floors: 3, wallColor: '#e4d4b4', trimColor: '#f6e9d1', roofType: 'mansard',
    signText: 'ATHENAEUM', signSub: 'Books & Archives',
    desc: 'Your historic library standing at the western boulevard entrance. Click or press E at the door to return inside.'
  });

  // Palm Boulevard along Ocean Drive & Downtown
  for (let pz = -62; pz <= 62; pz += 11) {
    if (Math.abs(pz) < 7) continue;
    createPalmTree(41.2, pz, 1.0 + (Math.abs(pz) % 3) * 0.12);
  }
  [
    [-10, -10], [10, -10], [-10, 10], [10, 10],
    [-44, -12], [-44, 12], [-30, -44], [2, -44], [28, -44], [-30, 44], [28, 44]
  ].forEach(([px, pz], idx) => createPalmTree(px, pz, 0.95 + (idx % 3) * 0.1));

  // Street Lamps with alternating warm amber and vice cyan/pink glow
  [
    [-8, -8, '#ffaa4c'], [8, -8, '#ffaa4c'], [-8, 8, '#ffaa4c'], [8, 8, '#ffaa4c'],
    [40.5, -24, '#ff4ec7'], [40.5, 0, '#38e8ff'], [40.5, 24, '#ff4ec7'], [40.5, 44, '#38e8ff'],
    [-28, -28, '#ffaa4c'], [-28, 28, '#ffaa4c'], [28, -28, '#ff4ec7'], [28, 28, '#38e8ff'],
    [-46, -8, '#ffaa4c'], [-46, 8, '#ffaa4c']
  ].forEach(([lx, lz, col]) => createStreetLamp(lx, lz, col));

  return {
    walkObstacles,
    carObstacles,
    streetLampLights,
    streetLampBulbs,
    neonMaterials,
    swayingTrees,
    fountainDroplets,
    fountainWaterMesh,
    sharedWindowGlowMat,
    contactShadowTex
  };
}
