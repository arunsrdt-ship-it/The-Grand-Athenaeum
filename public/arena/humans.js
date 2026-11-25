import * as THREE from 'three';

export function createHumanModel(style = {}, contactShadowTex = null) {
  const root = new THREE.Group();

  if (contactShadowTex) {
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.68 })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.015;
    root.add(shadowMesh);
  }

  const skinMat = new THREE.MeshStandardMaterial({ color: style.skin || '#dba986', roughness: 0.65, metalness: 0.02 });
  const coatMat = new THREE.MeshStandardMaterial({ color: style.coat || '#2d4a66', roughness: 0.74, metalness: 0.06 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: style.shirt || '#f4efe6', roughness: 0.7 });
  const tieMat = new THREE.MeshStandardMaterial({ color: style.tieColor || '#c0284f', roughness: 0.55 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: style.pants || '#25262b', roughness: 0.84 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: '#181414', roughness: 0.32, metalness: 0.14 });
  const hairMat = new THREE.MeshStandardMaterial({ color: style.hairColor || '#2c1e16', roughness: 0.8 });
  const hatMat = new THREE.MeshStandardMaterial({ color: style.hatColor || '#322925', roughness: 0.8 });
  const lipMat = new THREE.MeshStandardMaterial({ color: '#b46a60', roughness: 0.58 });
  const beltMat = new THREE.MeshStandardMaterial({ color: '#1b1615', roughness: 0.45 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#e2bc68', roughness: 0.28, metalness: 0.85 });

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Pelvis / Waist & Belt
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.175, 0.2, 12), style.skirt ? coatMat : pantsMat);
  pelvis.position.y = 0.85;
  pelvis.scale.set(1.15, 1, 0.78);
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  if (style.skirt) {
    const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.3, 0.44, 14), coatMat);
    skirtMesh.position.y = 0.67;
    skirtMesh.castShadow = true;
    bodyPivot.add(skirtMesh);
  }

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.055, 14), beltMat);
  belt.position.y = 0.94;
  belt.scale.set(1.15, 1, 0.8);
  bodyPivot.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.025), brassMat);
  buckle.position.set(0, 0.94, 0.14);
  bodyPivot.add(buckle);

  // Tailored Torso + Shoulders + Shirt + Lapels
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.202, 0.164, 0.47, 14), coatMat);
  chest.position.y = 1.19;
  chest.scale.set(1.18, 1, 0.76);
  chest.castShadow = true;
  bodyPivot.add(chest);

  const shoulders = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.27, 6, 12), coatMat);
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 1.38;
  shoulders.scale.set(1, 1, 0.78);
  shoulders.castShadow = true;
  bodyPivot.add(shoulders);

  const shirtV = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.24, 0.04), shirtMat);
  shirtV.position.set(0, 1.31, 0.122);
  bodyPivot.add(shirtV);

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.2, 0.02), tieMat);
  tie.position.set(0, 1.29, 0.14);
  bodyPivot.add(tie);

  [-1, 1].forEach((side) => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.23, 0.028), coatMat);
    lapel.position.set(side * 0.065, 1.31, 0.13);
    lapel.rotation.z = side * -0.22;
    bodyPivot.add(lapel);
  });

  // Neck & Collar
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.066, 0.14, 12), skinMat);
  neck.position.y = 1.48;
  neck.castShadow = true;
  bodyPivot.add(neck);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.083, 0.055, 12), shirtMat);
  collar.position.y = 1.44;
  bodyPivot.add(collar);

  // Sculpted Head & Face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.63, 0.01);
  bodyPivot.add(headGroup);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 14), skinMat);
  cranium.scale.set(0.92, 1.08, 1.0);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.066, 0.105, 12), skinMat);
  jaw.position.set(0, -0.074, 0.018);
  jaw.scale.set(0.92, 1, 0.96);
  headGroup.add(jaw);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.023, 8, 8), skinMat);
    ear.scale.set(0.45, 1.15, 0.75);
    ear.position.set(side * 0.112, -0.01, -0.01);
    headGroup.add(ear);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.052, 6), skinMat);
  nose.rotation.x = Math.PI * 0.32;
  nose.position.set(0, -0.014, 0.125);
  headGroup.add(nose);

  const scleraMat = new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: style.eyeColor || '#385245', roughness: 0.2 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.1 });
  [-1, 1].forEach((side) => {
    const eyeX = side * 0.042;
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), scleraMat);
    sclera.scale.set(1.1, 0.82, 0.7);
    sclera.position.set(eyeX, 0.016, 0.106);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), irisMat);
    iris.position.set(eyeX, 0.016, 0.115);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 6, 6), pupilMat);
    pupil.position.set(eyeX, 0.016, 0.12);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0085, 0.012), hairMat);
    brow.position.set(eyeX, 0.039, 0.111);
    brow.rotation.z = side * -0.08;
    headGroup.add(sclera, iris, pupil, brow);
  });

  if (style.sunglasses) {
    const shadesMat = new THREE.MeshPhysicalMaterial({ color: '#121216', roughness: 0.08, metalness: 0.85, clearcoat: 1 });
    [-0.042, 0.042].forEach((sx) => {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.028, 0.014), shadesMat);
      lens.position.set(sx, 0.016, 0.124);
      headGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.012), shadesMat);
    bridge.position.set(0, 0.02, 0.124);
    headGroup.add(bridge);
  }

  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.011, 0.014), lipMat);
  lips.position.set(0, -0.056, 0.105);
  headGroup.add(lips);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.127, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hairCap.position.set(0, 0.018, -0.015);
  hairCap.rotation.x = -0.25;
  headGroup.add(hairCap);

  if (style.hatType === 'fedora') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.018, 16), hatMat);
    brim.position.set(0, 0.095, 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.132, 0.11, 14), hatMat);
    crown.position.set(0, 0.15, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.133, 0.134, 0.022, 14), tieMat);
    band.position.set(0, 0.11, 0);
    headGroup.add(brim, crown, band);
  } else if (style.hatType === 'cap') {
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.129, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hatMat);
    capDome.position.set(0, 0.03, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.11), hatMat);
    visor.position.set(0, 0.05, 0.12);
    visor.rotation.x = 0.12;
    headGroup.add(capDome, visor);
  } else {
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), hairMat);
    backHair.position.set(0, -0.01, -0.07);
    headGroup.add(backHair);
  }

  function createArm(side) {
    const shoulderJoint = new THREE.Group();
    shoulderJoint.position.set(side * 0.24, 1.38, 0);
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 5, 10), coatMat);
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    shoulderJoint.add(upperArm);

    const elbowJoint = new THREE.Group();
    elbowJoint.position.y = -0.28;
    shoulderJoint.add(elbowJoint);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.2, 5, 10), style.shortSleeves ? skinMat : coatMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    elbowJoint.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.039, 8, 8), skinMat);
    hand.scale.set(0.72, 1.25, 0.55);
    hand.position.y = -0.272;
    elbowJoint.add(hand);

    return { shoulderJoint, elbowJoint };
  }

  function createLeg(side) {
    const hipJoint = new THREE.Group();
    hipJoint.position.set(side * 0.102, 0.8, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, 0.28, 5, 10), pantsMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    hipJoint.add(thigh);

    const kneeJoint = new THREE.Group();
    kneeJoint.position.y = -0.38;
    hipJoint.add(kneeJoint);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.051, 0.28, 5, 10), pantsMat);
    shin.position.y = -0.18;
    shin.castShadow = true;
    kneeJoint.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.072, 0.205), shoeMat);
    shoe.position.set(0, -0.382, 0.045);
    shoe.castShadow = true;
    kneeJoint.add(shoe);

    return { hipJoint, kneeJoint };
  }

  const leftArmRig = createArm(-1);
  const rightArmRig = createArm(1);
  const leftLegRig = createLeg(-1);
  const rightLegRig = createLeg(1);

  bodyPivot.add(leftArmRig.shoulderJoint, rightArmRig.shoulderJoint, leftLegRig.hipJoint, rightLegRig.hipJoint);

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm: leftArmRig.shoulderJoint,
    rightArm: rightArmRig.shoulderJoint,
    leftElbow: leftArmRig.elbowJoint,
    rightElbow: rightArmRig.elbowJoint,
    leftLeg: leftLegRig.hipJoint,
    rightLeg: rightLegRig.hipJoint,
    leftKnee: leftLegRig.kneeJoint,
    rightKnee: rightLegRig.kneeJoint
  };
}

export function poseHumanDriving(rig, steerAngle) {
  rig.bodyPivot.position.y = -0.36;
  rig.leftLeg.rotation.x = -1.25;
  rig.rightLeg.rotation.x = -1.25;
  rig.leftKnee.rotation.x = 1.1;
  rig.rightKnee.rotation.x = 1.1;
  rig.leftArm.rotation.x = -0.82 - steerAngle * 0.25;
  rig.rightArm.rotation.x = -0.82 + steerAngle * 0.25;
  rig.leftArm.rotation.z = 0.14;
  rig.rightArm.rotation.z = -0.14;
  rig.leftElbow.rotation.x = -0.55;
  rig.rightElbow.rotation.x = -0.55;
  rig.headGroup.rotation.y = steerAngle * 0.35;
}

export function poseHumanWalking(rig, speedNorm, walkCycle, elapsed) {
  rig.bodyPivot.position.y = speedNorm > 0.04 ? Math.abs(Math.cos(walkCycle)) * 0.035 : Math.sin(elapsed * 2.1) * 0.008;
  if (speedNorm > 0.04) {
    const swing = Math.sin(walkCycle);
    rig.leftLeg.rotation.x = swing * 0.48 * speedNorm;
    rig.rightLeg.rotation.x = -swing * 0.48 * speedNorm;
    rig.leftKnee.rotation.x = Math.max(0, -swing) * 0.58 * speedNorm;
    rig.rightKnee.rotation.x = Math.max(0, swing) * 0.58 * speedNorm;
    rig.leftArm.rotation.x = -swing * 0.36 * speedNorm;
    rig.rightArm.rotation.x = swing * 0.36 * speedNorm;
    rig.leftElbow.rotation.x = -0.25 - Math.max(0, swing) * 0.28 * speedNorm;
    rig.rightElbow.rotation.x = -0.25 - Math.max(0, -swing) * 0.28 * speedNorm;
  } else {
    rig.leftLeg.rotation.x *= 0.82;
    rig.rightLeg.rotation.x *= 0.82;
    rig.leftKnee.rotation.x *= 0.82;
    rig.rightKnee.rotation.x *= 0.82;
    rig.leftArm.rotation.x *= 0.82;
    rig.rightArm.rotation.x *= 0.82;
    rig.leftElbow.rotation.x += (-0.1 - rig.leftElbow.rotation.x) * 0.15;
    rig.rightElbow.rotation.x += (-0.1 - rig.rightElbow.rotation.x) * 0.15;
  }
  rig.leftArm.rotation.z *= 0.82;
  rig.rightArm.rotation.z *= 0.82;
}

export function createNameplate(label, accent = '#ffdf9a') {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(18, 14, 24, 0.86)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 408, 84, 22);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.slice(0, 26), 210, 48, 380);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.0, 0.46, 1);
  sprite.position.set(0, 2.28, 0);
  sprite.renderOrder = 5;
  sprite.userData.name = label;
  return sprite;
}

export function populateCitizensAndNPCs(scene, contactShadowTex) {
  const pedestrians = [];
  const storyNPCs = [];

  const coats = ['#ff4e88', '#25b8d9', '#f2efe9', '#e8a238', '#3e4e6e', '#2c303a', '#7c4e8a', '#3a7d6c'];
  const pants = ['#20242c', '#d9d4c7', '#2f3a4a', '#1b1d22'];
  const skins = ['#edc5a8', '#d7a480', '#f3d1b7', '#b57b58', '#8d5b3e'];
  const hairs = ['#231812', '#52341e', '#141416', '#9a6b38'];

  const routes = [
    // Ocean Drive Boardwalk Stroll
    [
      new THREE.Vector3(44, 0.14, -48),
      new THREE.Vector3(44, 0.14, 48),
      new THREE.Vector3(49, 0.14, 48),
      new THREE.Vector3(49, 0.14, -48)
    ],
    // Downtown Central Plaza Loop
    [
      new THREE.Vector3(-12, 0.14, -12),
      new THREE.Vector3(12, 0.14, -12),
      new THREE.Vector3(12, 0.14, 12),
      new THREE.Vector3(-12, 0.14, 12)
    ],
    // North Neon Strip Sidewalk
    [
      new THREE.Vector3(-36, 0.14, -14),
      new THREE.Vector3(36, 0.14, -14),
      new THREE.Vector3(36, 0.14, -22),
      new THREE.Vector3(-36, 0.14, -22)
    ],
    // South & Harbor Promenade
    [
      new THREE.Vector3(-34, 0.14, 14),
      new THREE.Vector3(34, 0.14, 14),
      new THREE.Vector3(34, 0.14, 28),
      new THREE.Vector3(-34, 0.14, 28)
    ]
  ];

  for (let i = 0; i < 22; i++) {
    const route = routes[i % routes.length];
    const startIdx = i % route.length;
    const rig = createHumanModel({
      coat: coats[i % coats.length],
      pants: pants[i % pants.length],
      skin: skins[i % skins.length],
      hairColor: hairs[i % hairs.length],
      hatType: i % 5 === 0 ? 'cap' : i % 7 === 0 ? 'fedora' : 'hair',
      shortSleeves: i % 2 === 0,
      sunglasses: i % 3 === 0,
      skirt: i % 4 === 1
    }, contactShadowTex);

    const pos = route[startIdx].clone();
    pos.x += (Math.random() - 0.5) * 1.4;
    pos.z += (Math.random() - 0.5) * 1.4;
    rig.root.position.copy(pos);
    scene.add(rig.root);

    pedestrians.push({
      type: 'walker',
      rig,
      route,
      targetIdx: (startIdx + 1) % route.length,
      speed: 1.4 + Math.random() * 0.9,
      walkCycle: Math.random() * Math.PI * 2,
      pauseTimer: 0
    });
  }

  // Named Story NPCs
  const npcDefs = [
    {
      id: 'elena',
      name: 'Elena Vance',
      role: 'Archive Curator',
      x: -54, z: 3.5, rotY: Math.PI / 2,
      style: { coat: '#9e2b4b', pants: '#252126', skin: '#edd0ba', hairColor: '#3a2218', skirt: true, tieColor: '#ffd480' }
    },
    {
      id: 'marco',
      name: 'Marco "Keys"',
      role: 'Street Informant',
      x: 16.5, z: -15.5, rotY: -Math.PI * 0.25,
      style: { coat: '#1e788f', pants: '#ece6da', skin: '#c98e6b', hairColor: '#191618', hatType: 'fedora', sunglasses: true, shortSleeves: true }
    },
    {
      id: 'rico',
      name: 'Dockmaster Rico',
      role: 'Harbor Master',
      x: 41, z: 54, rotY: Math.PI,
      style: { coat: '#8a592e', pants: '#232b36', skin: '#b97b56', hairColor: '#211c19', hatType: 'cap', shortSleeves: true }
    },
    {
      id: 'viktor',
      name: 'Viktor Kaine',
      role: 'Rival Street Racer',
      x: 34, z: -36, rotY: -Math.PI * 0.75,
      style: { coat: '#1b1d24', pants: '#14151a', skin: '#e5bea2', hairColor: '#785a32', sunglasses: true, tieColor: '#ff3878' }
    }
  ];

  npcDefs.forEach((def) => {
    const rig = createHumanModel(def.style, contactShadowTex);
    rig.root.position.set(def.x, 0.14, def.z);
    rig.root.rotation.y = def.rotY;
    const plate = createNameplate(`${def.name}`, '#38e8ff');
    rig.root.add(plate);
    scene.add(rig.root);
    storyNPCs.push({ ...def, rig, phase: Math.random() * 6 });
  });

  return { pedestrians, storyNPCs };
}
