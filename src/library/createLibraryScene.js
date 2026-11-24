import * as THREE from 'three';
import { CURATED_BOOKS, getBookLocation } from './books.js';
import { FirstPersonController } from './FirstPersonController.js';

export function createLibraryScene({ container, getBookData = (index) => CURATED_BOOKS[index], onRead = () => {}, onHover = () => {}, onToast = () => {}, onPointerMove = () => {}, onJourneyState = () => {}, onViewChange = () => {}, onMoodChange = () => {}, onEnterTown = () => {}, onPose = () => {} }) {
const state = {
  mood: 'midnight', // 'midnight' | 'afternoon'
  highlightCurated: false,
  audioEnabled: false,
  lampOn: true,
  chandelierOn: true,
  sideCandlesOn: true,
  globeFastSpin: false,
  activeBookIndex: null,
  hoveredObject: null,
  cameraAnim: null,
  heldBookMesh: null,
  carriedBookIndex: null,
  autoJourney: false,
  bookAnimation: null,
  townDoorAnimation: null,
  townDoorOpen: false,
  placedBookCount: 0,
  deskGroup: null
};

const VIEWPOINTS = {
  grandHall: {
    pos: new THREE.Vector3(0.2, 1.68, 6.25),
    target: new THREE.Vector3(0.1, 1.62, 5.2)
  },
  readingDesk: {
    pos: new THREE.Vector3(0, 1.68, 2.35),
    target: new THREE.Vector3(0, 1.18, 0.85)
  },
  westShelves: {
    pos: new THREE.Vector3(-5.85, 1.68, 0.8),
    target: new THREE.Vector3(-6.85, 1.72, 0.8)
  },
  eastShelves: {
    pos: new THREE.Vector3(5.85, 1.68, 0.8),
    target: new THREE.Vector3(6.85, 1.72, 0.8)
  },
  upperGallery: {
    pos: new THREE.Vector3(0, 1.68, -5.8),
    target: new THREE.Vector3(0, 1.72, -6.8)
  }
};

/* =========================================================================
   3. PROCEDURAL CANVAS TEXTURE GENERATORS (Zero External Image Dependencies)
   ========================================================================= */
function createWoodTexture(baseHex = '#3a2214', grainHex = '#23130a', planks = 6, vertical = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wood grain waves
  for (let i = 0; i < 160; i++) {
    ctx.strokeStyle = i % 3 === 0 ? grainHex : 'rgba(255, 200, 140, 0.04)';
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    if (vertical) {
      const x = Math.random() * 512;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (Math.random() - 0.5) * 18, 170, x + (Math.random() - 0.5) * 18, 340, x + (Math.random() - 0.5) * 10, 512);
    } else {
      const y = Math.random() * 512;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 18, 340, y + (Math.random() - 0.5) * 18, 512, y + (Math.random() - 0.5) * 10);
    }
    ctx.stroke();
  }

  // Plank seams
  if (planks > 0) {
    ctx.strokeStyle = 'rgba(10, 5, 2, 0.55)';
    ctx.lineWidth = 2;
    const step = 512 / planks;
    for (let p = 1; p < planks; p++) {
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(p * step, 0);
        ctx.lineTo(p * step, 512);
      } else {
        ctx.moveTo(0, p * step);
        ctx.lineTo(512, p * step);
      }
      ctx.stroke();
    }

    if (!vertical && planks > 3) {
      const plankHeight = 512 / planks;
      ctx.fillStyle = 'rgba(12, 6, 3, 0.38)';
      for (let row = 0; row < planks; row++) {
        const stagger = row % 2 === 0 ? 0 : 512 / (planks * 2);
        for (let x = stagger; x < 512; x += 512 / (planks / 2)) {
          ctx.fillRect(x - 1.5, row * plankHeight, 3, plankHeight);
        }
      }
    }
  }

  // A few shallow knots make the grain read as cut timber rather than stripes.
  for (let i = 0; i < 7; i++) {
    const x = 28 + Math.random() * 456;
    const y = 28 + Math.random() * 456;
    const radius = 5 + Math.random() * 5;
    ctx.strokeStyle = 'rgba(12, 6, 3, 0.18)';
    ctx.lineWidth = 1;
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(x, y, vertical ? radius * 0.7 : radius * (1.2 + ring * 0.75), vertical ? radius * (1.2 + ring * 0.75) : radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBumpTexture(colorTexture, anisotropy) {
  const bumpTexture = new THREE.CanvasTexture(colorTexture.image);
  bumpTexture.wrapS = colorTexture.wrapS;
  bumpTexture.wrapT = colorTexture.wrapT;
  bumpTexture.repeat.copy(colorTexture.repeat);
  bumpTexture.colorSpace = THREE.NoColorSpace;
  bumpTexture.anisotropy = anisotropy;
  return bumpTexture;
}

function createLeatherTexture(baseHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const shade = Math.random() > 0.52 ? '255, 223, 190' : '20, 7, 8';
    const alpha = 0.018 + Math.random() * 0.045;
    const radius = 0.35 + Math.random() * 1.15;
    ctx.fillStyle = `rgba(${shade}, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 256, radius, radius * 0.72, Math.random(), 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPaperTexture(baseHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2300; i++) {
    const alpha = 0.025 + Math.random() * 0.05;
    ctx.strokeStyle = Math.random() > 0.5
      ? `rgba(255, 255, 235, ${alpha})`
      : `rgba(100, 63, 31, ${alpha})`;
    ctx.lineWidth = 0.35 + Math.random() * 0.8;
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2 + Math.random() * 14, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWallpaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep Victorian emerald-charcoal damask base
  ctx.fillStyle = '#1b241e';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle vertical stripes
  ctx.fillStyle = 'rgba(201, 155, 66, 0.045)';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 12, 256);
  }

  // Damask diamond motifs
  ctx.strokeStyle = 'rgba(201, 155, 66, 0.12)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y <= 256; y += 64) {
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x, y + 16);
      ctx.lineTo(x - 14, y);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = 'rgba(201, 155, 66, 0.08)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Rich Persian crimson field
  ctx.fillStyle = '#5e171c';
  ctx.fillRect(0, 0, 512, 512);

  // Ornate nested borders
  const borders = [
    { inset: 14, color: '#1b263b', width: 22 },
    { inset: 36, color: '#c99b42', width: 8 },
    { inset: 48, color: '#3b1014', width: 14 },
    { inset: 66, color: '#d9bc82', width: 4 }
  ];
  borders.forEach(b => {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.width;
    ctx.strokeRect(b.inset, b.inset, 512 - b.inset * 2, 512 - b.inset * 2);
  });

  // Decorative border dots
  ctx.fillStyle = '#e5c67a';
  for (let i = 24; i < 490; i += 22) {
    ctx.fillRect(i, 12, 6, 6);
    ctx.fillRect(i, 494, 6, 6);
    ctx.fillRect(12, i, 6, 6);
    ctx.fillRect(494, i, 6, 6);
  }

  // Central Medallion
  ctx.save();
  ctx.translate(256, 256);
  const drawDiamond = (rx, ry, fill, stroke) => {
    ctx.beginPath();
    ctx.moveTo(0, -ry);
    ctx.lineTo(rx, 0);
    ctx.lineTo(0, ry);
    ctx.lineTo(-rx, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  };
  drawDiamond(130, 155, '#1b263b', '#d9bc82');
  drawDiamond(90, 110, '#7c2227', '#e5c67a');
  drawDiamond(46, 58, '#c99b42', '#1b263b');
  drawDiamond(20, 26, '#f2e0b6', null);
  ctx.restore();

  // Subtle woven fabric noise
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,240,210,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBookSpineTexture(baseColor, accentColor, isCurated = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Leather base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 64, 256);

  // Edge shading for rounded spine illusion
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.04)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  // Gold spine bands
  ctx.fillStyle = accentColor;
  const bands = isCurated ? [24, 34, 72, 184, 222, 232] : [28, 224];
  bands.forEach(y => {
    ctx.fillRect(6, y, 52, isCurated ? 4 : 3);
  });

  // Decorative title plate / emblem for curated books
  if (isCurated) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 84, 44, 88);

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(32, 112);
    ctx.lineTo(42, 128);
    ctx.lineTo(32, 144);
    ctx.lineTo(22, 128);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPaintingTexture(theme = 'celestial') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  if (theme === 'celestial') {
    const bg = ctx.createLinearGradient(0, 0, 0, 320);
    bg.addColorStop(0, '#121a2d');
    bg.addColorStop(1, '#2a221b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 320);

    ctx.strokeStyle = 'rgba(226, 189, 107, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 150, 74, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(128, 150, 92, 32, -0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Crescent moon & stars
    ctx.fillStyle = '#f3d999';
    ctx.beginPath();
    ctx.arc(128, 150, 18, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 280, 2, 2);
    }
  } else {
    // Moody vintage landscape
    const sky = ctx.createLinearGradient(0, 0, 0, 200);
    sky.addColorStop(0, '#2a2c38');
    sky.addColorStop(0.6, '#876342');
    sky.addColorStop(1, '#cfa165');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 320);

    // Distant hills
    ctx.fillStyle = '#2d261e';
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.quadraticCurveTo(80, 155, 160, 195);
    ctx.quadraticCurveTo(210, 175, 256, 205);
    ctx.lineTo(256, 320);
    ctx.lineTo(0, 320);
    ctx.fill();

    // Foreground cypress trees
    ctx.fillStyle = '#18140f';
    ctx.fillRect(0, 240, 256, 80);
    ctx.beginPath();
    ctx.ellipse(60, 220, 14, 48, 0, 0, Math.PI * 2);
    ctx.ellipse(195, 230, 12, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aged oil varnish vignette
  const vig = ctx.createRadialGradient(128, 160, 50, 128, 160, 190);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(15,8,2,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 256, 320);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGlobeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  // Equirectangular world map on aged parchment.
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#d5bd8d');
  ocean.addColorStop(0.5, '#c8aa74');
  ocean.addColorStop(1, '#b89560');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const project = ([longitude, latitude]) => [
    ((longitude + 180) / 360) * width,
    ((90 - latitude) / 180) * height,
  ];
  const continents = [
    // North America
    [[-168, 70], [-160, 69], [-153, 60], [-145, 59], [-137, 58], [-132, 55], [-128, 51], [-124, 48], [-123, 42], [-117, 32], [-111, 31], [-106, 31], [-104, 29], [-97, 26], [-97, 19], [-91, 18], [-87, 21], [-84, 22], [-81, 25], [-80, 31], [-76, 35], [-75, 40], [-70, 45], [-67, 47], [-61, 46], [-57, 51], [-61, 56], [-67, 59], [-71, 63], [-78, 64], [-83, 68], [-91, 70], [-101, 73], [-112, 72], [-122, 70], [-132, 71], [-144, 70], [-154, 72], [-163, 71]],
    // Alaska and Greenland
    [[-168, 65], [-166, 61], [-162, 59], [-157, 58], [-153, 56], [-149, 59], [-145, 59], [-140, 61], [-142, 65], [-148, 68], [-153, 71], [-160, 70]],
    [[-52, 83], [-40, 82], [-30, 80], [-22, 76], [-25, 70], [-31, 65], [-37, 60], [-45, 59], [-53, 63], [-58, 69], [-56, 76]],
    // Central and South America
    [[-92, 18], [-88, 16], [-85, 13], [-82, 10], [-79, 8], [-77, 8], [-78, 12], [-83, 15], [-87, 17]],
    [[-81, 12], [-76, 9], [-72, 11], [-68, 10], [-62, 8], [-56, 5], [-51, 1], [-48, -2], [-44, -3], [-38, -8], [-35, -12], [-39, -19], [-43, -23], [-48, -27], [-51, -34], [-54, -39], [-59, -46], [-67, -55], [-73, -48], [-75, -38], [-72, -28], [-70, -18], [-77, -5]],
    // Europe and Asia
    [[-10, 36], [-10, 43], [-6, 47], [-1, 50], [5, 52], [8, 55], [13, 55], [18, 60], [20, 65], [25, 70], [31, 70], [36, 66], [43, 67], [50, 69], [60, 70], [72, 73], [88, 74], [103, 75], [118, 73], [131, 69], [145, 64], [159, 61], [170, 61], [179, 56], [170, 51], [161, 54], [151, 51], [146, 47], [141, 44], [137, 40], [132, 42], [128, 39], [125, 35], [122, 31], [121, 27], [119, 23], [115, 21], [111, 19], [108, 22], [104, 22], [101, 17], [98, 11], [94, 9], [92, 14], [88, 21], [84, 23], [80, 28], [76, 30], [78, 25], [80, 20], [83, 8], [77, 7], [73, 20], [68, 24], [64, 25], [60, 27], [55, 26], [51, 28], [47, 30], [43, 36], [39, 37], [35, 40], [31, 42], [28, 45], [24, 42], [19, 40], [15, 38], [12, 35], [9, 37], [5, 43], [1, 43], [-4, 41]],
    // Arabian Peninsula and Africa
    [[56, 26], [53, 24], [51, 19], [49, 15], [45, 12], [43, 17], [42, 22], [46, 25], [51, 27]],
    [[-17, 37], [-7, 37], [0, 35], [10, 37], [16, 33], [25, 32], [33, 31], [36, 23], [43, 12], [50, 11], [48, 2], [42, -5], [40, -12], [35, -22], [32, -29], [28, -34], [20, -35], [16, -29], [13, -17], [9, -5], [2, 5], [-5, 5], [-10, 10], [-16, 15], [-17, 23], [-12, 29]],
    // Japan, island Southeast Asia, Madagascar, Australia and New Zealand
    [[130, 31], [132, 34], [135, 35], [138, 38], [141, 41], [145, 44], [144, 40], [140, 36], [136, 34], [133, 32]],
    [[79.5, 9.8], [81.8, 8.5], [81.2, 6.2], [79.5, 7.2]],
    [[95, 5], [101, 2], [105, -2], [108, -6], [105, -7], [101, -4], [98, 0]],
    [[105, -6], [112, -7], [115, -8], [113, -9], [108, -8]],
    [[109, 7], [116, 7], [119, 3], [117, -2], [113, -4], [109, 0]],
    [[130, -2], [137, -2], [142, -5], [148, -6], [151, -10], [146, -9], [142, -8], [137, -5], [133, -4]],
    [[120, 18], [123, 18], [126, 15], [125, 10], [122, 7], [120, 11]],
    [[49, -12], [50, -16], [49, -22], [47, -25], [44, -19], [45, -14]],
    [[113, -11], [119, -14], [123, -17], [129, -15], [135, -12], [139, -15], [145, -15], [153, -25], [149, -35], [143, -39], [133, -35], [124, -34], [115, -31], [113, -23]],
    [[144, -40], [148, -42], [147, -44], [145, -43]],
    [[166, -34], [174, -36], [178, -40], [173, -46], [168, -44]],
    // Antarctica
    [[-180, -68], [-150, -71], [-120, -70], [-90, -72], [-60, -70], [-30, -73], [0, -70], [30, -72], [60, -69], [90, -72], [120, -70], [150, -72], [180, -68]],
  ];

  function traceGeoPath(points, close = false) {
    points.forEach((point, index) => {
      const [x, y] = project(point);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (close) ctx.closePath();
  }

  // Latitude and longitude grid in the ocean.
  ctx.strokeStyle = 'rgba(72, 46, 20, 0.2)';
  ctx.lineWidth = 1;
  for (let longitude = -150; longitude <= 180; longitude += 30) {
    const x = ((longitude + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = ((90 - latitude) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Coastline silhouettes use longitude and latitude, so the continents sit in
  // their actual geographic positions when the texture wraps around the sphere.
  ctx.beginPath();
  continents.forEach((polygon) => traceGeoPath(polygon, true));
  ctx.fillStyle = '#80572f';
  ctx.fill();
  ctx.strokeStyle = '#4c301b';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Approximate political borders, clipped to the land silhouettes.
  const countryLines = [
    [[-124, 49], [-116, 49], [-110, 49], [-103, 49], [-96, 49]],
    [[-117, 32], [-111, 31], [-106, 31], [-103, 29], [-97, 26]],
    [[-103, 22], [-99, 19], [-95, 18], [-91, 18]],
    [[-72, -18], [-66, -20], [-63, -25], [-58, -30], [-54, -35]],
    [[-69, -17], [-69, -25], [-70, -34], [-68, -44]],
    [[-8, 5], [4, 5], [14, 5], [23, 7], [31, 10]],
    [[8, 35], [10, 25], [12, 15], [15, 5], [20, -5]],
    [[22, 32], [24, 22], [28, 12], [30, 0], [32, -10]],
    [[29, -1], [35, -4], [40, -4], [42, -1]],
    [[-5, 50], [4, 50], [10, 51], [15, 54], [20, 55]],
    [[14, 45], [20, 46], [25, 45], [30, 46]],
    [[30, 50], [38, 50], [45, 48], [50, 50]],
    [[45, 40], [52, 42], [58, 40], [62, 36]],
    [[68, 25], [73, 22], [78, 20], [83, 18]],
    [[88, 28], [92, 25], [96, 24], [100, 22]],
    [[103, 45], [110, 43], [117, 42], [123, 42]],
    [[115, 35], [112, 30], [109, 26], [105, 23]],
  ];
  ctx.save();
  ctx.beginPath();
  continents.forEach((polygon) => traceGeoPath(polygon, true));
  ctx.clip();
  ctx.strokeStyle = 'rgba(229, 204, 157, 0.48)';
  ctx.lineWidth = 1.2;
  countryLines.forEach((line) => {
    ctx.beginPath();
    traceGeoPath(line);
    ctx.stroke();
  });
  ctx.restore();

  // Small engraved labels reinforce the atlas look without overwhelming the map.
  ctx.fillStyle = 'rgba(58, 38, 21, 0.58)';
  ctx.font = '600 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('NORTH AMERICA', 225, 160);
  ctx.fillText('SOUTH AMERICA', 335, 340);
  ctx.fillText('EUROPE', 555, 136);
  ctx.fillText('AFRICA', 565, 285);
  ctx.fillText('ASIA', 740, 150);
  ctx.fillText('AUSTRALIA', 850, 365);

  // Fine parchment grain beneath the varnish.
  for (let i = 0; i < 1700; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255, 239, 203, 0.08)' : 'rgba(71, 46, 22, 0.045)';
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* =========================================================================
   4. WEB AUDIO API PROCEDURAL AMBIENCE (Rain / Hearth + Gentle Chime)
   ========================================================================= */
class LibraryAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.isRunning = false;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);

    // Soft Rain / Hearth Brown-Pink Noise
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.025 * white)) / 1.025;
      lastOut = output[i];
      output[i] *= 2.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.0;

    noise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);
    noise.start();
  }

  toggle(enable) {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isRunning = enable;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.linearRampToValueAtTime(enable ? 0.14 : 0.0, now + 0.8);
  }

  playBookChime() {
    if (!state.audioEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // Warm C major triad
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.05, now + idx * 0.06 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 1.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 1.15);
    });
  }

  playSwitchClick() {
    if (!state.audioEnabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  dispose() {
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close();
  }
}

const audioEngine = new LibraryAudio();
const showToast = (message) => onToast(message);

/* =========================================================================
   5. THREE.JS SCENE, RENDERER & CONTROLS SETUP
   ========================================================================= */
const scene = new THREE.Scene();
const remotePlayers = new Map();
scene.background = new THREE.Color('#0c0806');
scene.fog = new THREE.FogExp2('#120c09', 0.032);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.copy(VIEWPOINTS.grandHall.pos);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const getRenderPixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.75);
renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
renderer.setPixelRatio(getRenderPixelRatio());
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Walk through the Grand Athenaeum');
container.appendChild(renderer.domElement);

// Collections for interactive raycasting & animation
const interactiveBooks = [];
const interactiveProps = [];
const candleFlames = [];
const lightShafts = [];
const lookTarget = VIEWPOINTS.grandHall.target.clone();
const walkObstacles = [
  { minX: -1.78, maxX: 1.78, minZ: -0.02, maxZ: 1.68 },
  { minX: -0.72, maxX: 0.72, minZ: -1.25, maxZ: -0.08 },
];

function registerInteractiveProp(mesh, details) {
  mesh.userData = { ...mesh.userData, ...details };
  interactiveProps.push(mesh);
  return mesh;
}

function canWalkTo(x, z) {
  const radius = 0.28;
  if (x < -6.55 + radius || x > 6.55 - radius || z < -6.55 + radius || z > 6.55 - radius) return false;
  return !walkObstacles.some((obstacle) => (
    x + radius > obstacle.minX
      && x - radius < obstacle.maxX
      && z + radius > obstacle.minZ
      && z - radius < obstacle.maxZ
  ));
}

const controller = new FirstPersonController({
  camera,
  element: renderer.domElement,
  startPosition: VIEWPOINTS.grandHall.pos,
  startLookAt: VIEWPOINTS.grandHall.target,
  canWalkTo,
  onInteract: interact,
});
controller.setInputEnabled(false);

/* =========================================================================
   6. SHARED MATERIALS
   ========================================================================= */
const floorTex = createWoodTexture('#2e1a10', '#180d07', 12, false);
floorTex.repeat.set(4, 4);
const darkWalnutTex = createWoodTexture('#351e12', '#1d0f08', 0, true);
const mahoganyTex = createWoodTexture('#452116', '#240f09', 0, true);
const wallpaperTex = createWallpaperTexture();
const rugTex = createRugTexture();
const leatherTex = createLeatherTexture('#4d191d');
const blotterTex = createLeatherTexture('#173828');
const parchmentTex = createPaperTexture('#efe2c2');
const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
[
  floorTex,
  darkWalnutTex,
  mahoganyTex,
  wallpaperTex,
  rugTex,
  leatherTex,
  blotterTex,
  parchmentTex,
].forEach((texture) => { texture.anisotropy = maxAnisotropy; });
const floorBumpTex = createBumpTexture(floorTex, maxAnisotropy);
const walnutBumpTex = createBumpTexture(darkWalnutTex, maxAnisotropy);
const mahoganyBumpTex = createBumpTexture(mahoganyTex, maxAnisotropy);
const wallpaperBumpTex = createBumpTexture(wallpaperTex, maxAnisotropy);
const rugBumpTex = createBumpTexture(rugTex, maxAnisotropy);
const leatherBumpTex = createBumpTexture(leatherTex, maxAnisotropy);
const blotterBumpTex = createBumpTexture(blotterTex, maxAnisotropy);
const parchmentBumpTex = createBumpTexture(parchmentTex, maxAnisotropy);

const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorBumpTex, bumpScale: 0.025, roughness: 0.72, metalness: 0.025 });
const matWalnut = new THREE.MeshStandardMaterial({ map: darkWalnutTex, bumpMap: walnutBumpTex, bumpScale: 0.02, roughness: 0.72, metalness: 0.025 });
const matMahogany = new THREE.MeshStandardMaterial({ map: mahoganyTex, bumpMap: mahoganyBumpTex, bumpScale: 0.018, roughness: 0.52, metalness: 0.035 });
const matWallpaper = new THREE.MeshStandardMaterial({ map: wallpaperTex, bumpMap: wallpaperBumpTex, bumpScale: 0.008, roughness: 0.96 });
const matBrass = new THREE.MeshStandardMaterial({ color: '#cfa349', roughness: 0.36, metalness: 0.72 });
const matDarkIron = new THREE.MeshStandardMaterial({ color: '#24201c', roughness: 0.5, metalness: 0.7 });
const matEmeraldGlass = new THREE.MeshStandardMaterial({
  color: '#0e6b43',
  emissive: '#0c8a4b',
  emissiveIntensity: 0.9,
  roughness: 0.26,
  metalness: 0.04
});
const matLeatherBurgundy = new THREE.MeshStandardMaterial({ map: leatherTex, bumpMap: leatherBumpTex, bumpScale: 0.025, roughness: 0.82, metalness: 0.015 });
const matGreenBlotter = new THREE.MeshStandardMaterial({ map: blotterTex, bumpMap: blotterBumpTex, bumpScale: 0.018, roughness: 0.9 });
const matParchment = new THREE.MeshStandardMaterial({ map: parchmentTex, bumpMap: parchmentBumpTex, bumpScale: 0.012, roughness: 0.94 });

/* =========================================================================
   7. BUILD THE GRAND VICTORIAN ROOM ARCHITECTURE
   ========================================================================= */
function buildRoom() {
  const W = 16, D = 16, H = 9.5;

  // Hardwood Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ornate Persian Rug
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 5.4),
    new THREE.MeshStandardMaterial({ map: rugTex, bumpMap: rugBumpTex, bumpScale: 0.032, roughness: 0.96 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.015, 0.8);
  rug.receiveShadow = true;
  registerInteractiveProp(rug, {
    type: 'rug',
    title: 'Persian Reading Rug',
    sub: 'Click or press E to return to the center of the library',
  });
  scene.add(rug);

  // Coffered Timber Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matWalnut);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  scene.add(ceiling);

  // Ceiling Beams
  for (let i = -6; i <= 6; i += 4) {
    const beamX = new THREE.Mesh(new THREE.BoxGeometry(W, 0.35, 0.42), matWalnut);
    beamX.position.set(0, H - 0.18, i);
    scene.add(beamX);

    const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, D), matWalnut);
    beamZ.position.set(i, H - 0.18, 0);
    scene.add(beamZ);
  }

  // Four Walls
  const wallGeo = new THREE.PlaneGeometry(W, H);
  const walls = [
    { pos: [0, H / 2, -D / 2], rotY: 0 },        // North (Back)
    { pos: [0, H / 2, D / 2], rotY: Math.PI },   // South (Front behind camera)
    { pos: [-W / 2, H / 2, 0], rotY: Math.PI / 2 }, // West
    { pos: [W / 2, H / 2, 0], rotY: -Math.PI / 2 }  // East
  ];
  walls.forEach(w => {
    const mesh = new THREE.Mesh(wallGeo, matWallpaper);
    mesh.position.set(...w.pos);
    mesh.rotation.y = w.rotY;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // Lower Wood Wainscoting around perimeter
  const wainscotHeight = 1.45;
  const wainscotDefs = [
    { size: [W, wainscotHeight, 0.18], pos: [0, wainscotHeight / 2, -D / 2 + 0.09] },
    { size: [6.6, wainscotHeight, 0.18], pos: [-4.7, wainscotHeight / 2, D / 2 - 0.09] },
    { size: [6.6, wainscotHeight, 0.18], pos: [4.7, wainscotHeight / 2, D / 2 - 0.09] },
    { size: [0.18, wainscotHeight, D], pos: [-W / 2 + 0.09, wainscotHeight / 2, 0] },
    { size: [0.18, wainscotHeight, D], pos: [W / 2 - 0.09, wainscotHeight / 2, 0] }
  ];
  wainscotDefs.forEach(d => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...d.size), matWalnut);
    m.position.set(...d.pos);
    m.receiveShadow = true;
    scene.add(m);
  });

  // Tall Arched Gothic Window on the North Wall (z = -7.9)
  buildArchedWindow();
  buildTownDoor();
}

let windowSkyMat;
function buildArchedWindow() {
  const winGroup = new THREE.Group();
  winGroup.position.set(0, 0, -7.88);
  const windowInteraction = {
    type: 'window',
    title: 'Arched Library Window',
    sub: 'Click or press E to change the light outside',
  };

  // Sky backdrop plane behind window glass
  windowSkyMat = new THREE.MeshBasicMaterial({ color: '#1b2b52' });
  const skyRect = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.6), windowSkyMat);
  skyRect.position.set(0, 3.8, -0.02);
  registerInteractiveProp(skyRect, windowInteraction);
  winGroup.add(skyRect);

  const skyArch = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32, 0, Math.PI), windowSkyMat);
  skyArch.position.set(0, 6.1, -0.02);
  winGroup.add(skyArch);

  // Stone/Wood Window Frame Pillars & Sill
  const pillarGeo = new THREE.BoxGeometry(0.32, 4.9, 0.45);
  const leftPillar = new THREE.Mesh(pillarGeo, matWalnut);
  leftPillar.position.set(-1.82, 3.8, 0.12);
  const rightPillar = new THREE.Mesh(pillarGeo, matWalnut);
  rightPillar.position.set(1.82, 3.8, 0.12);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.24, 0.65), matWalnut);
  sill.position.set(0, 1.48, 0.18);
  [leftPillar, rightPillar, sill].forEach((part) => registerInteractiveProp(part, windowInteraction));
  winGroup.add(leftPillar, rightPillar, sill);

  // Arched Frame Top
  const archRing = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.18, 12, 36, Math.PI), matWalnut);
  archRing.position.set(0, 6.1, 0.12);
  registerInteractiveProp(archRing, windowInteraction);
  winGroup.add(archRing);

  // Mullions (window pane dividers)
  const vMullionGeo = new THREE.BoxGeometry(0.08, 6.1, 0.12);
  [-0.6, 0.6].forEach(x => {
    const m = new THREE.Mesh(vMullionGeo, matWalnut);
    m.position.set(x, 4.5, 0.06);
    registerInteractiveProp(m, windowInteraction);
    winGroup.add(m);
  });
  [2.6, 3.8, 5.0, 6.1].forEach(y => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.12), matWalnut);
    m.position.set(0, y, 0.06);
    registerInteractiveProp(m, windowInteraction);
    winGroup.add(m);
  });

  // Atmospheric Light Shafts streaming inward from the window
  const shaftMat = new THREE.MeshBasicMaterial({
    color: '#8ab4ff',
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  for (let i = -1; i <= 1; i++) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 8.5), shaftMat);
    shaft.position.set(i * 1.15, 3.6, 3.2);
    shaft.rotation.x = -0.62;
    shaft.rotation.y = i * 0.08;
    winGroup.add(shaft);
    lightShafts.push(shaft);
  }

  scene.add(winGroup);
}

function createTownPortalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#31454a');
  sky.addColorStop(0.48, '#c18753');
  sky.addColorStop(1, '#f0bc70');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sun = ctx.createRadialGradient(256, 330, 8, 256, 330, 230);
  sun.addColorStop(0, 'rgba(255, 229, 171, 0.92)');
  sun.addColorStop(0.42, 'rgba(255, 194, 112, 0.32)');
  sun.addColorStop(1, 'rgba(255, 194, 112, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 100, 512, 520);

  // Warm, narrow facades echo the town waiting on the other side of the door.
  const buildings = [
    { points: [[0, 160], [150, 205], [176, 610], [0, 720]], color: '#755044', roof: '#3c3430', windows: 4 },
    { points: [[512, 130], [370, 195], [340, 610], [512, 720]], color: '#806248', roof: '#393633', windows: 4 },
    { points: [[0, 330], [92, 350], [118, 650], [0, 715]], color: '#ae7950', roof: '#564035', windows: 3 },
    { points: [[512, 300], [420, 338], [396, 660], [512, 715]], color: '#a2704c', roof: '#514036', windows: 3 },
  ];
  buildings.forEach((building) => {
    ctx.fillStyle = building.color;
    ctx.beginPath();
    building.points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = building.roof;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(building.points[0][0], building.points[0][1]);
    ctx.lineTo(building.points[1][0], building.points[1][1]);
    ctx.stroke();

    for (let row = 0; row < building.windows; row++) {
      const y = 255 + row * 82;
      const leftX = building.points[0][0] === 0 ? 36 + row * 3 : 410 - row * 3;
      ctx.fillStyle = row % 2 ? '#372d29' : '#e4ad63';
      ctx.fillRect(leftX, y, 30, 48);
      ctx.fillStyle = 'rgba(255, 227, 172, 0.28)';
      ctx.fillRect(leftX + 4, y + 5, 4, 36);
    }
  });

  const street = ctx.createLinearGradient(0, 475, 0, 768);
  street.addColorStop(0, '#80614a');
  street.addColorStop(1, '#352d29');
  ctx.fillStyle = street;
  ctx.beginPath();
  ctx.moveTo(198, 440);
  ctx.lineTo(314, 440);
  ctx.lineTo(512, 768);
  ctx.lineTo(0, 768);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(238, 207, 159, 0.28)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 9; row++) {
    const t = (row + 1) / 9;
    const y = 440 + t * t * 328;
    const halfWidth = 58 + t * 245;
    ctx.beginPath();
    ctx.moveTo(256 - halfWidth, y);
    ctx.lineTo(256 + halfWidth, y);
    ctx.stroke();
  }
  for (let column = -4; column <= 4; column++) {
    ctx.beginPath();
    ctx.moveTo(256 + column * 7, 440);
    ctx.lineTo(256 + column * 72, 768);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(256, 390, 150, 256, 390, 520);
  vignette.addColorStop(0, 'rgba(14, 10, 8, 0)');
  vignette.addColorStop(1, 'rgba(14, 10, 8, 0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let townDoorPivot;
let townPortalLight;
function buildTownDoor() {
  const frame = new THREE.Group();
  frame.position.set(0, 0, 7.68);

  const frameMat = new THREE.MeshStandardMaterial({ color: '#57301d', map: matMahogany.map, roughness: 0.48, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#c59a4a', roughness: 0.38, metalness: 0.68 });
  const framePieces = [
    { size: [0.28, 3.8, 0.42], pos: [-1.26, 1.9, 0] },
    { size: [0.28, 3.8, 0.42], pos: [1.26, 1.9, 0] },
    { size: [2.8, 0.3, 0.42], pos: [0, 3.78, 0] },
    { size: [2.46, 0.055, 0.45], pos: [0, 0.12, 0] },
  ];
  framePieces.forEach(({ size, pos }, index) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(...size), index === 3 ? trimMat : frameMat);
    piece.position.set(...pos);
    piece.castShadow = true;
    piece.receiveShadow = true;
    frame.add(piece);
  });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.12, 12, 36, Math.PI), frameMat);
  arch.position.set(0, 3.68, 0.02);
  arch.castShadow = true;
  frame.add(arch);
  const archInlay = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.025, 8, 36, Math.PI), trimMat);
  archInlay.position.set(0, 3.68, 0.13);
  frame.add(archInlay);

  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(2.22, 3.52),
    new THREE.MeshBasicMaterial({ map: createTownPortalTexture(), color: '#ffe1ad', side: THREE.DoubleSide })
  );
  portal.position.set(0, 1.86, 0.285);
  frame.add(portal);

  townDoorPivot = new THREE.Group();
  townDoorPivot.position.set(-1.08, 0.08, 0.05);
  frame.add(townDoorPivot);

  const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.15, 3.48, 0.18), frameMat);
  leaf.position.set(1.075, 1.74, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  registerInteractiveProp(leaf, {
    type: 'townDoor',
    title: 'The Old Town Door',
    sub: 'Click or press E to open the door and enter Vieux Quartier',
  });
  townDoorPivot.add(leaf);

  const panelMat = new THREE.MeshStandardMaterial({ color: '#291910', roughness: 0.65, metalness: 0.03 });
  [-0.72, 0.72].forEach((y, index) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.54, index ? 1.08 : 1.16, 0.035), panelMat);
    panel.position.set(0, y, 0.108);
    leaf.add(panel);

    const border = new THREE.Mesh(new THREE.BoxGeometry(1.64, index ? 1.18 : 1.26, 0.025), trimMat);
    border.position.set(0, 0, 0.025);
    panel.add(border);
    border.position.z = -0.025;
  });

  const handlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.035), trimMat);
  handlePlate.position.set(1.86, 1.78, 0.115);
  townDoorPivot.add(handlePlate);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), trimMat);
  handle.position.set(1.88, 1.78, 0.18);
  townDoorPivot.add(handle);

  for (const x of [-1.08, 1.08]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.07), trimMat);
    hinge.position.set(x, 1.18, 0.12);
    frame.add(hinge);
  }

  townPortalLight = new THREE.PointLight('#ffc879', 0.32, 7.5, 2);
  townPortalLight.position.set(0, 1.65, 6.95);
  scene.add(townPortalLight);
  scene.add(frame);
}

/* =========================================================================
   8. BOOKSHELVES, HUNDREDS OF VINTAGE BOOKS & CURATED VOLUMES
   ========================================================================= */
const decorativeBookColors = [
  '#5b1d22', '#233b2e', '#1e2c45', '#6b4723', '#422618',
  '#7d5c2b', '#382230', '#2b3e42', '#8c6d46', '#4a1b1f', '#323a29'
];
const bookSpineMatCache = new Map();
const bookCoverTextureCache = new Map();

function getBookCoverTexture(coverImage) {
  if (!coverImage) return null;
  if (!bookCoverTextureCache.has(coverImage)) {
    const texture = new THREE.TextureLoader().load(
      coverImage,
      undefined,
      undefined,
      () => console.warn(`Could not load book cover: ${coverImage}`)
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    bookCoverTextureCache.set(coverImage, texture);
  }
  return bookCoverTextureCache.get(coverImage);
}

function getBookSpineMaterial(color, accent, isCurated) {
  const key = `${color}_${accent}_${isCurated}`;
  if (!bookSpineMatCache.has(key)) {
    const tex = createBookSpineTexture(color, accent, isCurated);
    bookSpineMatCache.set(key, new THREE.MeshStandardMaterial({
      map: tex,
      bumpMap: createBumpTexture(tex, maxAnisotropy),
      bumpScale: isCurated ? 0.012 : 0.018,
      roughness: isCurated ? 0.38 : 0.62,
      metalness: isCurated ? 0.25 : 0.08,
      emissive: new THREE.Color('#c99b42'),
      emissiveIntensity: 0
    }));
  }
  // Curated books need unique material instances so hover glow affects only one book
  if (isCurated) {
    return bookSpineMatCache.get(key).clone();
  }
  return bookSpineMatCache.get(key);
}

function createBookMesh(width, height, depth, color, accent, curatedIndex = null) {
  const isCurated = curatedIndex !== null;
  const spineMat = getBookSpineMaterial(color, accent, isCurated);
  const bookData = isCurated ? CURATED_BOOKS[curatedIndex] : null;
  const coverTexture = bookData ? getBookCoverTexture(bookData.coverImage) : null;
  const coverMat = new THREE.MeshStandardMaterial({
    color: coverTexture ? '#ffffff' : color,
    map: coverTexture,
    roughness: 0.6,
  });
  const pageMat = matParchment;

  // BoxGeometry faces: +x, -x, +y, -y, +z (spine faces outward along +z in local space), -z
  const materials = [coverMat, coverMat, pageMat, pageMat, spineMat, pageMat];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (isCurated) {
    // Add tiny golden bookmark ribbon protruding slightly from the top/bottom
    const ribbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.09, 0.012),
      new THREE.MeshStandardMaterial({ color: '#e8c15a', emissive: '#b88628', emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.7 })
    );
    ribbon.position.set(0, -height / 2 + 0.03, depth / 2 + 0.008);
    mesh.add(ribbon);
  }

  return mesh;
}

function buildBookshelfUnit(x, z, rotY, width, height, shelfCount, curatedSlots = [], shelfTitle = 'Library Shelves', viewName = 'grandHall') {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  const shelfInteraction = {
    type: 'bookshelf',
    title: shelfTitle,
    sub: 'Click or press E to browse this shelf wall',
    viewName,
  };

  const depth = 0.72;
  const sideThick = 0.1;

  // Back panel
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), matWalnut);
  back.position.set(0, height / 2, -depth / 2 + 0.03);
  back.receiveShadow = true;
  registerInteractiveProp(back, shelfInteraction);
  group.add(back);

  // Side panels
  const sideGeo = new THREE.BoxGeometry(sideThick, height, depth);
  const leftSide = new THREE.Mesh(sideGeo, matMahogany);
  leftSide.position.set(-width / 2 + sideThick / 2, height / 2, 0);
  leftSide.castShadow = true;
  const rightSide = new THREE.Mesh(sideGeo, matMahogany);
  rightSide.position.set(width / 2 - sideThick / 2, height / 2, 0);
  rightSide.castShadow = true;
  registerInteractiveProp(leftSide, shelfInteraction);
  registerInteractiveProp(rightSide, shelfInteraction);
  group.add(leftSide, rightSide);

  // Base plinth & Top crown molding
  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.35, depth + 0.1), matMahogany);
  base.position.set(0, 0.175, 0.03);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.28, depth + 0.18), matMahogany);
  crown.position.set(0, height + 0.14, 0.06);
  registerInteractiveProp(base, shelfInteraction);
  registerInteractiveProp(crown, shelfInteraction);
  group.add(base, crown);

  // Brass ladder rail along upper shelf
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, width, 12), matBrass);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, height - 1.45, depth / 2 + 0.06);
  registerInteractiveProp(rail, shelfInteraction);
  group.add(rail);

  // Shelves & Books
  const usableHeight = height - 0.6;
  const shelfSpacing = usableHeight / shelfCount;
  const innerWidth = width - sideThick * 2 - 0.08;

  for (let s = 0; s < shelfCount; s++) {
    const shelfY = 0.35 + s * shelfSpacing;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.06, depth - 0.04), matMahogany);
    plank.position.set(0, shelfY, 0);
    plank.receiveShadow = true;
    registerInteractiveProp(plank, shelfInteraction);
    group.add(plank);

    // Check if this shelf has a curated book assigned
    const curatedSlotsForShelf = curatedSlots.filter(c => c.shelf === s);

    let cursorX = -innerWidth / 2 + 0.05;
    let bookIdxOnShelf = 0;

    while (cursorX < innerWidth / 2 - 0.12) {
      const curatedSlot = curatedSlotsForShelf.find(c => bookIdxOnShelf === c.posIndex);
      const isTargetSlot = Boolean(curatedSlot);

      if (isTargetSlot) {
        const bookData = CURATED_BOOKS[curatedSlot.bookIndex];
        const bw = 0.12;
        const bh = Math.min(shelfSpacing - 0.14, 0.56);
        const bd = 0.44;
        const bookMesh = createBookMesh(bw, bh, bd, bookData.color, bookData.accent, curatedSlot.bookIndex);
        bookMesh.position.set(cursorX + bw / 2, shelfY + 0.03 + bh / 2, 0.1);
        group.add(bookMesh);

        // Register shelf volumes for interaction and hover feedback.
        registerInteractiveBook(bookMesh, curatedSlot.bookIndex, group, new THREE.Vector3(0, 0, 1));
        cursorX += bw + 0.025;
      } else {
        // Random gap occasionally for natural library look
        if (Math.random() < 0.08 && cursorX < innerWidth / 2 - 0.4) {
          cursorX += 0.14 + Math.random() * 0.15;
          continue;
        }
        const bw = 0.065 + Math.random() * 0.065;
        const bh = Math.min(shelfSpacing - 0.16, 0.36 + Math.random() * 0.24);
        const bd = 0.34 + Math.random() * 0.1;
        const col = decorativeBookColors[Math.floor(Math.random() * decorativeBookColors.length)];
        const bookMesh = createBookMesh(bw, bh, bd, col, '#c99b42', null);
        bookMesh.position.set(cursorX + bw / 2, shelfY + 0.03 + bh / 2, 0.04 + (Math.random() - 0.5) * 0.04);

        // Occasional subtle lean
        if (Math.random() < 0.08 && cursorX + bw + 0.15 < innerWidth / 2) {
          bookMesh.rotation.z = (Math.random() > 0.5 ? 1 : -1) * 0.08;
        }
        group.add(bookMesh);
        cursorX += bw + 0.012;
      }
      bookIdxOnShelf++;
    }
  }

  scene.add(group);
  return group;
}

function registerInteractiveBook(mesh, bookIndex, parentGroup, localOutwardNormal) {
  mesh.userData = {
    type: 'book',
    bookIndex,
    baseLocalPos: mesh.position.clone(),
    outwardNormal: localOutwardNormal.clone(),
    hoverProgress: 0,
    originalScale: mesh.scale.clone(),
    isHeld: false,
    isPlaced: false,
    parentGroup
  };
  interactiveBooks.push(mesh);
}

function getCuratedShelfSlots(wall, unit) {
  return CURATED_BOOKS.flatMap((book, bookIndex) => {
    const placement = book.placement;
    if (placement?.type !== 'shelf' || placement.wall !== wall || placement.unit !== unit) return [];
    return [{ shelf: placement.level, posIndex: placement.position, bookIndex }];
  });
}

function populateLibraryShelves() {
  // West Wall: 3 tall grand bookshelves (facing +X, rotY = Math.PI/2)
  buildBookshelfUnit(-7.52, -4.4, Math.PI / 2, 4.0, 6.9, 7, getCuratedShelfSlots('west', 0), 'West Shelves', 'westShelves');
  buildBookshelfUnit(-7.52, 0.0, Math.PI / 2, 4.2, 6.9, 7, getCuratedShelfSlots('west', 1), 'West Shelves', 'westShelves');
  buildBookshelfUnit(-7.52, 4.4, Math.PI / 2, 4.0, 6.9, 7, getCuratedShelfSlots('west', 2), 'West Shelves', 'westShelves');

  // East Wall: 3 tall grand bookshelves (facing -X, rotY = -Math.PI/2)
  buildBookshelfUnit(7.52, -4.4, -Math.PI / 2, 4.0, 6.9, 7, getCuratedShelfSlots('east', 0), 'East Shelves', 'eastShelves');
  buildBookshelfUnit(7.52, 0.0, -Math.PI / 2, 4.2, 6.9, 7, getCuratedShelfSlots('east', 1), 'East Shelves', 'eastShelves');
  buildBookshelfUnit(7.52, 4.4, -Math.PI / 2, 4.0, 6.9, 7, getCuratedShelfSlots('east', 2), 'East Shelves', 'eastShelves');

  // North Wall: Flanking shelves left & right of the tall arched window (facing +Z, rotY = 0)
  buildBookshelfUnit(-4.6, -7.52, 0, 3.6, 6.9, 7, getCuratedShelfSlots('north', 0), 'Upper Gallery', 'upperGallery');
  buildBookshelfUnit(4.6, -7.52, 0, 3.6, 6.9, 7, getCuratedShelfSlots('north', 1), 'Upper Gallery', 'upperGallery');
}

/* =========================================================================
   9. FURNITURE, PROPS, BANKER'S LAMP, CHANDELIER & ROLLING LADDER
   ========================================================================= */
let bankerLampLight, bankerLampShadeMat;
let chandelierLight, chandelierBulbs = [];

function buildReadingDeskArea() {
  const deskGroup = new THREE.Group();
  deskGroup.position.set(0, 0, 0.85);
  state.deskGroup = deskGroup;

  // Desk Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.14, 1.55), matMahogany);
  top.position.set(0, 1.05, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  top.userData = { type: 'readingDesk', title: 'Reading Table', sub: 'Click or press E to come here, or place the book you are carrying' };
  deskGroup.add(top);
  interactiveProps.push(top);

  // Green Leather Desk Blotter
  const blotter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.015, 0.92), matGreenBlotter);
  blotter.position.set(0, 1.125, 0.05);
  blotter.receiveShadow = true;
  deskGroup.add(blotter);

  // Left & Right Drawer Pedestals
  const pedGeo = new THREE.BoxGeometry(0.76, 1.0, 1.38);
  const leftPed = new THREE.Mesh(pedGeo, matWalnut);
  leftPed.position.set(-1.05, 0.5, 0);
  leftPed.castShadow = true;
  const rightPed = new THREE.Mesh(pedGeo, matWalnut);
  rightPed.position.set(1.05, 0.5, 0);
  rightPed.castShadow = true;
  registerInteractiveProp(leftPed, { type: 'deskAccessory', title: 'Desk Drawer', sub: 'Click or press E to inspect the writing desk' });
  registerInteractiveProp(rightPed, { type: 'deskAccessory', title: 'Desk Drawer', sub: 'Click or press E to inspect the writing desk' });
  deskGroup.add(leftPed, rightPed);

  // Brass Drawer Pulls
  [-1.05, 1.05].forEach(px => {
    [0.28, 0.54, 0.8].forEach(py => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.05), matBrass);
      handle.position.set(px, py, 0.71);
      registerInteractiveProp(handle, { type: 'deskAccessory', title: 'Brass Drawer Pull', sub: 'Click or press E to inspect the writing desk' });
      deskGroup.add(handle);
    });
  });

  // Open Antique Ledger on the Blotter
  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.48), matParchment);
  leftPage.position.set(-0.19, 1.145, 0.08);
  leftPage.rotation.z = -0.04;
  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.48), matParchment);
  rightPage.position.set(0.19, 1.145, 0.08);
  rightPage.rotation.z = 0.04;
  registerInteractiveProp(leftPage, {
    type: 'ledger',
    title: 'Open Visitor Ledger',
    sub: 'Click or press E to inspect the library ledger',
  });
  registerInteractiveProp(rightPage, {
    type: 'ledger',
    title: 'Open Visitor Ledger',
    sub: 'Click or press E to inspect the library ledger',
  });
  deskGroup.add(leftPage, rightPage);

  // Brass Inkwell & Quill
  const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.07, 12), matBrass);
  inkwell.position.set(0.56, 1.16, -0.18);
  registerInteractiveProp(inkwell, {
    type: 'deskAccessory',
    title: 'Brass Inkwell',
    sub: 'Click or press E to inspect this writing set',
  });
  deskGroup.add(inkwell);

  const quill = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.34, 6), matParchment);
  quill.position.set(0.58, 1.3, -0.18);
  quill.rotation.z = -0.35;
  registerInteractiveProp(quill, {
    type: 'deskAccessory',
    title: 'Quill Pen',
    sub: 'Click or press E to inspect this writing set',
  });
  deskGroup.add(quill);

  // Curated books with a desk placement sit flat beside the blotter.
  const deskBooks = CURATED_BOOKS
    .map((book, bookIndex) => ({ book, bookIndex }))
    .filter(({ book }) => book.placement?.type === 'desk')
    .slice(0, 4);

  deskBooks.forEach(({ book, bookIndex }, slot) => {
    const deskPosition = Number.isInteger(book.placement.position) ? book.placement.position : slot;
    const column = deskPosition % 2;
    const row = Math.floor(deskPosition / 2);
    const deskBook = createBookMesh(0.11, 0.46, 0.34, book.color, book.accent, bookIndex);
    deskBook.position.set(0.62 + column * 0.42, 1.12 + row * 0.12, -0.16 + column * 0.36);
    deskBook.rotation.set(0, -0.35 + column * 0.25, Math.PI / 2);
    deskGroup.add(deskBook);
    registerInteractiveBook(deskBook, bookIndex, deskGroup, new THREE.Vector3(0, 1, 0));
  });

  // Glowing Emerald-Green Banker's Lamp (Interactive!)
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-1.05, 1.12, -0.25);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.05, 20), matBrass);
  lampBase.position.y = 0.025;
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.46, 12), matBrass);
  lampStem.position.y = 0.25;

  bankerLampShadeMat = matEmeraldGlass.clone();
  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.36, 16, 1, false, 0, Math.PI),
    bankerLampShadeMat
  );
  lampShade.rotation.z = Math.PI / 2;
  lampShade.rotation.y = 0.4;
  lampShade.position.set(0.04, 0.48, 0.04);

  lampGroup.add(lampBase, lampStem, lampShade);

  // Register lamp parts for click interaction
  [lampBase, lampStem, lampShade].forEach(part => {
    registerInteractiveProp(part, { type: 'lamp', title: "Emerald Banker's Lamp", sub: 'Click or press E to toggle the desk light' });
  });

  bankerLampLight = new THREE.PointLight('#ffcf75', 3.4, 7.5, 1.7);
  bankerLampLight.position.set(0.06, 0.36, 0.06);
  bankerLampLight.castShadow = true;
  const lampShadowResolution = window.innerWidth < 760 ? 256 : 512;
  bankerLampLight.shadow.mapSize.set(lampShadowResolution, lampShadowResolution);
  bankerLampLight.shadow.bias = -0.0008;
  bankerLampLight.shadow.normalBias = 0.02;
  lampGroup.add(bankerLampLight);

  deskGroup.add(lampGroup);
  scene.add(deskGroup);

  // Antique Tufted Leather Armchair behind the desk
  buildArmchair(0, -0.55, 0);
}

function buildArmchair(x, z, rotY) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotY;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 0.95), matLeatherBurgundy);
  seat.position.set(0, 0.52, 0);
  seat.castShadow = true;
  registerInteractiveProp(seat, {
    type: 'armchair',
    title: 'Reading Chair',
    sub: 'Click or press E to settle in at the reading desk',
  });

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 0.2), matLeatherBurgundy);
  back.position.set(0, 1.05, -0.4);
  back.rotation.x = -0.12;
  back.castShadow = true;
  registerInteractiveProp(back, {
    type: 'armchair',
    title: 'Reading Chair',
    sub: 'Click or press E to settle in at the reading desk',
  });

  const armGeo = new THREE.BoxGeometry(0.18, 0.42, 0.95);
  const leftArm = new THREE.Mesh(armGeo, matLeatherBurgundy);
  leftArm.position.set(-0.52, 0.72, 0);
  const rightArm = new THREE.Mesh(armGeo, matLeatherBurgundy);
  rightArm.position.set(0.52, 0.72, 0);
  [leftArm, rightArm].forEach((part) => registerInteractiveProp(part, {
    type: 'armchair',
    title: 'Reading Chair',
    sub: 'Click or press E to settle in at the reading desk',
  }));

  const legGeo = new THREE.CylinderGeometry(0.04, 0.025, 0.44, 10);
  [[-0.44, -0.38], [0.44, -0.38], [-0.44, 0.38], [0.44, 0.38]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, matWalnut);
    leg.position.set(lx, 0.22, lz);
    registerInteractiveProp(leg, {
      type: 'armchair',
      title: 'Reading Chair',
      sub: 'Click or press E to settle in at the reading desk',
    });
    chair.add(leg);
  });

  chair.add(seat, back, leftArm, rightArm);
  scene.add(chair);
}

function buildRollingLadder() {
  const ladder = new THREE.Group();
  ladder.position.set(-6.75, 0, 2.8);
  ladder.rotation.y = Math.PI / 2;
  ladder.rotation.x = -0.17; // Leaning cleanly against West shelf

  const railGeo = new THREE.BoxGeometry(0.06, 5.8, 0.09);
  const leftRail = new THREE.Mesh(railGeo, matMahogany);
  leftRail.position.set(-0.26, 2.9, 0);
  const rightRail = new THREE.Mesh(railGeo, matMahogany);
  rightRail.position.set(0.26, 2.9, 0);
  const ladderInteraction = {
    type: 'ladder',
    title: 'Rolling Library Ladder',
    sub: 'Click or press E to browse the west shelves',
  };
  registerInteractiveProp(leftRail, ladderInteraction);
  registerInteractiveProp(rightRail, ladderInteraction);
  ladder.add(leftRail, rightRail);

  // Rungs
  for (let y = 0.45; y < 5.4; y += 0.45) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.07), matMahogany);
    rung.position.set(0, y, 0);
    registerInteractiveProp(rung, ladderInteraction);
    ladder.add(rung);
  }

  // Brass Hooks at the top
  [-0.26, 0.26].forEach(hx => {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI), matBrass);
    hook.position.set(hx, 5.75, -0.05);
    hook.rotation.y = Math.PI / 2;
    registerInteractiveProp(hook, ladderInteraction);
    ladder.add(hook);
  });

  scene.add(ladder);
}

function buildStandingGlobe() {
  const globeGroup = new THREE.Group();
  globeGroup.position.set(3.8, 0, -4.4);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.14, 20), matWalnut);
  base.position.y = 0.07;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.05, 14), matWalnut);
  post.position.y = 0.62;

  const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 10, 32), matBrass);
  meridian.position.y = 1.52;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.41, 28, 28),
    new THREE.MeshStandardMaterial({ map: createGlobeTexture(), roughness: 0.5, metalness: 0.1 })
  );
  sphere.position.y = 1.52;
  sphere.rotation.z = 0.41; // Earth axial tilt
  sphere.castShadow = true;
  const globeInteraction = {
    type: 'globe',
    title: 'Antique Standing Globe',
    sub: 'Click or press E to change the globe’s spin',
  };
  [base, post, meridian, sphere].forEach((part) => registerInteractiveProp(part, globeInteraction));

  globeGroup.add(base, post, meridian, sphere);
  scene.add(globeGroup);

  return sphere;
}

function buildFramedArtAndCandles() {
  // Two framed vintage paintings on the South-West & South-East upper walls
  const createPainting = (x, y, z, rotY, theme) => {
    const frameGroup = new THREE.Group();
    frameGroup.position.set(x, y, z);
    frameGroup.rotation.y = rotY;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.15, 0.1), matBrass);
    const canvasMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.48, 1.92),
      new THREE.MeshStandardMaterial({ map: createPaintingTexture(theme), roughness: 0.6 })
    );
    canvasMesh.position.z = 0.055;
    const paintingInteraction = {
      type: 'painting',
      title: theme === 'celestial' ? 'Celestial Chart' : 'Evening Landscape',
      sub: 'Click or press E to inspect this framed artwork',
    };
    registerInteractiveProp(frame, paintingInteraction);
    registerInteractiveProp(canvasMesh, paintingInteraction);
    frameGroup.add(frame, canvasMesh);
    scene.add(frameGroup);
  };

  createPainting(-3.6, 3.8, 7.86, Math.PI, 'celestial');
  createPainting(3.6, 3.8, 7.86, Math.PI, 'landscape');

  // Decorative Side Table with Flickering Candles near the West Alcove
  const table = new THREE.Group();
  table.position.set(-4.1, 0, -4.2);
  const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), matMahogany);
  tTop.position.y = 0.95;
  registerInteractiveProp(tTop, {
    type: 'sideCandles',
    title: 'Candle Table',
    sub: 'Click or press E to light or extinguish the candles',
  });
  const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.92, 12), matWalnut);
  tLeg.position.y = 0.46;
  const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 18), matWalnut);
  tBase.position.y = 0.03;
  const candleInteraction = {
    type: 'sideCandles',
    title: 'Candle Table',
    sub: 'Click or press E to light or extinguish the candles',
  };
  registerInteractiveProp(tLeg, candleInteraction);
  registerInteractiveProp(tBase, candleInteraction);
  table.add(tTop, tLeg, tBase);

  // Pair of Wax Candles on Brass Holders
  [[-0.14, 0.24, 0.05], [0.12, 0.18, -0.08]].forEach(([cx, ch, cz]) => {
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.04, 14), matBrass);
    holder.position.set(cx, 1.0, cz);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, ch, 12), matParchment);
    wax.position.set(cx, 1.02 + ch / 2, cz);

    const flameMat = new THREE.MeshBasicMaterial({ color: '#ffdf88' });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), flameMat);
    flame.scale.set(0.7, 1.5, 0.7);
    flame.position.set(cx, 1.04 + ch, cz);
    [holder, wax, flame].forEach((part) => registerInteractiveProp(part, candleInteraction));
    candleFlames.push({ mesh: flame, baseY: flame.position.y, phase: Math.random() * 10 });

    table.add(holder, wax, flame);
  });

  const candleLight = new THREE.PointLight('#ffaa44', 1.6, 6.5, 2);
  candleLight.position.set(0, 1.45, 0);
  table.add(candleLight);
  candleFlames.push({ light: candleLight, baseIntensity: 1.6, phase: 2.1 });

  scene.add(table);
}

function buildChandelier() {
  const chGroup = new THREE.Group();
  chGroup.position.set(0, 7.1, 0.2);

  // Suspension chain/rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 10), matBrass);
  rod.position.y = 1.2;
  chGroup.add(rod);

  // Main Brass Ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.055, 12, 36), matBrass);
  ring.rotation.x = Math.PI / 2;
  chGroup.add(ring);

  // Central Finial
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), matBrass);
  chGroup.add(finial);

  // 8 Radial Arms with Candle Bulbs
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ax = Math.cos(angle) * 1.35;
    const az = Math.sin(angle) * 1.35;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.04, 0.04), matBrass);
    arm.position.set(ax * 0.5, 0, az * 0.5);
    arm.rotation.y = -angle;
    chGroup.add(arm);

    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 10), matParchment);
    candle.position.set(ax, 0.14, az);
    chGroup.add(candle);

    const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffe5a3' });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), bulbMat);
    bulb.scale.set(0.8, 1.4, 0.8);
    bulb.position.set(ax, 0.29, az);
    chGroup.add(bulb);
    chandelierBulbs.push(bulb);
  }

  // Clickable collider sphere for easy chandelier toggling
  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.6, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false })
  );
  hitMesh.userData = { type: 'chandelier', title: 'Brass Candle Chandelier', sub: 'Click or press E to toggle chandelier candles' };
  chGroup.add(hitMesh);
  interactiveProps.push(hitMesh);

  chandelierLight = new THREE.PointLight('#ffbd66', 4.8, 18, 1.5);
  chandelierLight.position.set(0, -0.3, 0);
  // The window key light and desk lamp already cast shadows; skip a second
  // dynamic point-light shadow map for the chandelier to keep frame cost down.
  chandelierLight.castShadow = false;
  chGroup.add(chandelierLight);

  scene.add(chGroup);
}

/* =========================================================================
   10. AMBIENT LIGHTING
   ========================================================================= */
const ambientLight = new THREE.AmbientLight('#43384f', 0.42);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight('#5c72a8', '#2a1a10', 0.5);
scene.add(hemiLight);

// Directional Moon / Sun Light streaming through the North arched window
const windowDirLight = new THREE.DirectionalLight('#7fa4ff', 2.0);
windowDirLight.position.set(0.6, 6.2, -10.5);
windowDirLight.target.position.set(0, 1.0, 2.5);
windowDirLight.castShadow = true;
const shadowResolution = window.innerWidth < 760 ? 1024 : 2048;
windowDirLight.shadow.mapSize.set(shadowResolution, shadowResolution);
windowDirLight.shadow.camera.near = 1;
windowDirLight.shadow.camera.far = 24;
windowDirLight.shadow.camera.left = -8;
windowDirLight.shadow.camera.right = 8;
windowDirLight.shadow.camera.top = 8;
windowDirLight.shadow.camera.bottom = -4;
windowDirLight.shadow.bias = -0.0002;
windowDirLight.shadow.normalBias = 0.025;
scene.add(windowDirLight, windowDirLight.target);

/* =========================================================================
   11. LIGHTING MOOD & PROP TOGGLES
   ========================================================================= */
function applyLightingMood(mood) {
  state.mood = mood;
  onMoodChange(mood);
  const isMidnight = mood === 'midnight';

  if (isMidnight) {
    scene.background.set('#0b090e');
    scene.fog.color.set('#110d14');
    scene.fog.density = 0.032;
    ambientLight.color.set('#403854');
    ambientLight.intensity = 0.42;
    hemiLight.color.set('#5874b8');
    hemiLight.groundColor.set('#26180f');
    hemiLight.intensity = 0.5;
    windowDirLight.color.set('#80a8ff');
    windowDirLight.intensity = 2.0;
    windowSkyMat.color.set('#18284d');
    lightShafts.forEach(s => {
      s.material.color.set('#88b2ff');
      s.material.opacity = 0.055;
    });
  } else {
    // Golden Afternoon
    scene.background.set('#24180e');
    scene.fog.color.set('#2e1f12');
    scene.fog.density = 0.022;
    ambientLight.color.set('#8f6c43');
    ambientLight.intensity = 0.66;
    hemiLight.color.set('#ffd99e');
    hemiLight.groundColor.set('#472c18');
    hemiLight.intensity = 0.72;
    windowDirLight.color.set('#ffcf78');
    windowDirLight.intensity = 2.7;
    windowSkyMat.color.set('#f5cb7a');
    lightShafts.forEach(s => {
      s.material.color.set('#ffd685');
      s.material.opacity = 0.095;
    });
  }

}

function toggleBankerLamp() {
  state.lampOn = !state.lampOn;
  bankerLampLight.intensity = state.lampOn ? 3.4 : 0;
  bankerLampShadeMat.emissiveIntensity = state.lampOn ? 0.9 : 0.06;
  audioEngine.playSwitchClick();
  showToast(state.lampOn ? "Banker's Lamp Illuminated" : "Banker's Lamp Dimmed");
}

function toggleChandelier() {
  state.chandelierOn = !state.chandelierOn;
  chandelierLight.intensity = state.chandelierOn ? 4.8 : 0;
  chandelierBulbs.forEach(b => b.visible = state.chandelierOn);
  audioEngine.playSwitchClick();
  showToast(state.chandelierOn ? 'Chandelier Candles Lit' : 'Chandelier Extinguished');
}

function toggleSideCandles() {
  state.sideCandlesOn = !state.sideCandlesOn;
  candleFlames.forEach((candle) => {
    if (candle.mesh) candle.mesh.visible = state.sideCandlesOn;
    if (candle.light) candle.light.intensity = state.sideCandlesOn ? candle.baseIntensity : 0;
  });
  audioEngine.playSwitchClick();
  showToast(state.sideCandlesOn ? 'Side Table Candles Lit' : 'Side Table Candles Extinguished');
}

function toggleGlobeSpin() {
  state.globeFastSpin = !state.globeFastSpin;
  audioEngine.playSwitchClick();
  showToast(state.globeFastSpin ? 'The antique globe spins faster' : 'The antique globe slows to a gentle turn');
}

/* =========================================================================
   12. FIRST-PERSON JOURNEY & BOOK INTERACTIONS
   ========================================================================= */
function flyCameraTo(targetPos, targetLookAt, duration = 1150, onComplete = null) {
  if (!state.cameraAnim) lookTarget.copy(controller.getLookTarget());
  controller.setActive(false);
  state.cameraAnim = {
    startPos: camera.position.clone(),
    endPos: targetPos.clone(),
    startTarget: lookTarget.clone(),
    endTarget: targetLookAt.clone(),
    startTime: performance.now(),
    duration,
    onComplete
  };
}

function updateJourney(phase, prompt, bookIndex = state.carriedBookIndex) {
  const book = Number.isInteger(bookIndex) ? getBookData(bookIndex) : null;
  onJourneyState({ phase, prompt, bookTitle: book?.title ?? '' });
}

function getHeldBookPose() {
  camera.updateMatrixWorld(true);
  const position = camera.localToWorld(new THREE.Vector3(0.38, -0.3, -1.0));
  const bookFacing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
  return { position, quaternion: camera.quaternion.clone().multiply(bookFacing) };
}

function finishBookAnimation(animation) {
  if (animation.kind === 'pickup') {
    state.heldBookMesh = animation.mesh;
    state.carriedBookIndex = animation.bookIndex;
    animation.mesh.userData.isHeld = true;
    controller.setActive(true);
    updateJourney('carrying', 'Carry your book to the reading desk, then press E.', animation.bookIndex);

    const tableTarget = new THREE.Vector3(0, 1.18, 0.85);
    const walkDuration = Math.max(1800, camera.position.distanceTo(VIEWPOINTS.readingDesk.pos) / 1.6 * 1000);
    updateJourney('walkingToDesk', 'Carrying your volume to the reading table...', animation.bookIndex);
    flyCameraTo(VIEWPOINTS.readingDesk.pos, tableTarget, walkDuration, () => placeHeldBook(true, true));
    return;
  }

  const { mesh, bookIndex, localPosition, localRotation, worldTarget, openAfter } = animation;
  state.deskGroup.attach(mesh);
  mesh.position.copy(localPosition);
  mesh.scale.copy(mesh.userData.originalScale);
  mesh.userData.parentGroup = state.deskGroup;
  mesh.userData.baseLocalPos = localPosition.clone();
  mesh.userData.outwardNormal.set(0, 1, 0);
  mesh.userData.isHeld = false;
  mesh.userData.isPlaced = true;
  mesh.userData.hoverProgress = 0;
  mesh.rotation.copy(localRotation);
  state.heldBookMesh = null;
  state.carriedBookIndex = null;
  state.placedBookCount += 1;

  if (!openAfter) {
    state.autoJourney = false;
    controller.setActive(true);
    updateJourney('explore', 'Your book is on the desk. Choose another volume from the shelves.');
    return;
  }

  updateJourney('settling', 'Settling into the reading chair…', bookIndex);
  const readingPosition = new THREE.Vector3(0, 1.68, 2.28);
  flyCameraTo(readingPosition, worldTarget, 750, () => {
    state.autoJourney = false;
    state.activeBookIndex = bookIndex;
    updateJourney('reading', 'Reading in the Athenaeum.', bookIndex);
    onRead(bookIndex);
  });
}

function takeBook(bookIndex, { ignoreDistance = false } = {}) {
  if (state.heldBookMesh || state.bookAnimation || state.activeBookIndex !== null) return false;
  const mesh = interactiveBooks.find((book) => book.userData.bookIndex === bookIndex && !book.userData.isHeld && !book.userData.isPlaced);
  if (!mesh) return false;

  const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
  if (!ignoreDistance && camera.position.distanceTo(worldPosition) > 3.25) {
    onToast('Walk closer to the shelf before taking this book.');
    return false;
  }

  hideTooltip();
  state.autoJourney = true;
  const startPosition = worldPosition.clone();
  const startQuaternion = mesh.getWorldQuaternion(new THREE.Quaternion());
  const startScale = mesh.getWorldScale(new THREE.Vector3());
  state.deskGroup?.updateMatrixWorld(true);
  scene.attach(mesh);
  mesh.position.copy(startPosition);
  mesh.quaternion.copy(startQuaternion);
  mesh.scale.copy(startScale);
  mesh.userData.isHeld = true;

  const handPose = getHeldBookPose();
  state.bookAnimation = {
    kind: 'pickup',
    mesh,
    bookIndex,
    startPosition,
    startQuaternion,
    startScale,
    endScale: startScale.clone(),
    endPosition: handPose.position,
    endQuaternion: handPose.quaternion,
    startTime: performance.now(),
    duration: 620,
  };
  controller.setActive(false);
  audioEngine.playBookChime();
  updateJourney('fetching', 'Pulling the volume from its shelf…', bookIndex);
  return true;
}

function isNearReadingDesk() {
  return Math.hypot(camera.position.x, camera.position.z - 2.28) < 1.25;
}

function placeHeldBook(force = false, openAfter = true) {
  const mesh = state.heldBookMesh;
  const bookIndex = state.carriedBookIndex;
  if (!mesh || !Number.isInteger(bookIndex) || state.bookAnimation) return false;
  if (!force && !isNearReadingDesk()) {
    onToast('Walk up to the reading desk to place your book.');
    updateJourney('carrying', 'Carry your book to the reading desk, then press E.', bookIndex);
    return false;
  }

  const deskSlots = [
    new THREE.Vector3(-0.62, 1.19, 0.08),
    new THREE.Vector3(0.62, 1.19, 0.08),
    new THREE.Vector3(-0.62, 1.19, -0.38),
    new THREE.Vector3(0.62, 1.19, -0.38),
  ];
  const localPosition = deskSlots[state.placedBookCount % deskSlots.length].clone();
  const localRotation = new THREE.Euler(0, -0.15, Math.PI / 2);
  const targetQuaternion = new THREE.Quaternion().setFromEuler(localRotation);
  const worldTarget = state.deskGroup.localToWorld(localPosition.clone().add(new THREE.Vector3(0, 0.1, 0)));
  const targetPosition = state.deskGroup.localToWorld(localPosition.clone());
  const handPose = getHeldBookPose();

  state.bookAnimation = {
    kind: 'place',
    mesh,
    bookIndex,
    localPosition,
    localRotation,
    targetQuaternion,
    worldTarget,
    startPosition: handPose.position,
    startQuaternion: handPose.quaternion,
    startScale: mesh.userData.originalScale.clone(),
    endPosition: targetPosition,
    endQuaternion: state.deskGroup.quaternion.clone().multiply(targetQuaternion),
    endScale: mesh.userData.originalScale.clone(),
    startTime: performance.now(),
    duration: 640,
    openAfter,
  };
  controller.setActive(false);
  updateJourney('placing', 'Setting the book on the blotter…', bookIndex);
  return true;
}

function getReticleTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const books = interactiveBooks.filter((book) => !book.userData.isHeld);
  const hit = raycaster.intersectObjects([...books, ...interactiveProps], false)
    .find((intersection) => intersection.distance <= 3.25);
  return hit?.object ?? null;
}

function beginTownEntry() {
  if (!townDoorPivot || state.townDoorAnimation || state.townDoorOpen) return;
  hideTooltip();
  controller.setActive(false);
  audioEngine.playSwitchClick();
  state.townDoorAnimation = {
    startTime: performance.now(),
    duration: 980,
    startAngle: townDoorPivot.rotation.y,
    endAngle: Math.PI * 0.5,
    enterWhenOpen: true,
  };
}

function goToInteractiveView(viewName, message) {
  const viewpoint = VIEWPOINTS[viewName];
  if (!viewpoint) return;
  onViewChange(viewName);
  flyCameraTo(viewpoint.pos, viewpoint.target, 900, () => showToast(message));
}

function activateInteractiveTarget(target) {
  if (!target || state.activeBookIndex !== null || state.bookAnimation || state.cameraAnim || state.autoJourney || state.townDoorAnimation || state.townDoorOpen) return;

  const { type } = target.userData;
  if (type === 'book') {
    hideTooltip();
    if (target.userData.isPlaced) openPlacedBook(target.userData.bookIndex);
    else takeBook(target.userData.bookIndex);
    return;
  }

  switch (type) {
    case 'townDoor':
      beginTownEntry();
      break;
    case 'readingDesk':
      if (state.heldBookMesh) placeHeldBook();
      else goToInteractiveView('readingDesk', 'The reading desk is ready for your next volume.');
      break;
    case 'bookshelf':
      goToInteractiveView(target.userData.viewName, `Browsing the ${target.userData.title.toLowerCase()}.`);
      break;
    case 'ladder':
      goToInteractiveView('westShelves', 'The rolling ladder brings the upper shelves within reach.');
      break;
    case 'armchair':
      goToInteractiveView('readingDesk', 'You settle in at the reading desk.');
      break;
    case 'lamp':
      toggleBankerLamp();
      break;
    case 'chandelier':
      toggleChandelier();
      break;
    case 'sideCandles':
      toggleSideCandles();
      break;
    case 'window':
      applyLightingMood(state.mood === 'midnight' ? 'afternoon' : 'midnight');
      audioEngine.playSwitchClick();
      showToast(state.mood === 'midnight' ? 'Moonlight pours through the arched window' : 'Golden afternoon fills the library');
      break;
    case 'globe':
      toggleGlobeSpin();
      break;
    case 'rug':
      goToInteractiveView('grandHall', 'Back to the heart of the Athenaeum.');
      break;
    case 'painting':
    case 'ledger':
    case 'deskAccessory':
      audioEngine.playSwitchClick();
      showToast(`You inspect the ${target.userData.title.toLowerCase()}.`);
      break;
    default:
      showToast('This piece is part of the library collection.');
  }
}

function interact(hitObject = null) {
  if (state.activeBookIndex !== null || state.bookAnimation || state.cameraAnim || state.autoJourney || state.townDoorAnimation || state.townDoorOpen) return;
  const target = hitObject ?? getReticleTarget();
  if (target?.userData.type === 'townDoor') {
    activateInteractiveTarget(target);
    return;
  }
  if (state.heldBookMesh) {
    placeHeldBook();
    return;
  }

  if (target) activateInteractiveTarget(target);
  else onToast('Look at a book or a library object and press E to interact.');
}

function openPlacedBook(bookIndex) {
  const mesh = interactiveBooks.find((book) => book.userData.bookIndex === bookIndex && book.userData.isPlaced && !book.userData.isHeld);
  if (!mesh || state.activeBookIndex !== null || state.autoJourney || state.bookAnimation || state.cameraAnim) return false;
  if (state.heldBookMesh) {
    onToast('Set down the book you are carrying before opening another.');
    return false;
  }

  hideTooltip();
  const bookTarget = mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
  const readingPosition = VIEWPOINTS.readingDesk.pos.clone();
  const walkDuration = Math.max(650, camera.position.distanceTo(readingPosition) / 1.6 * 1000);
  state.autoJourney = true;
  updateJourney('returningToBook', 'Walking back to your book...', bookIndex);
  flyCameraTo(readingPosition, bookTarget, walkDuration, () => {
    state.autoJourney = false;
    state.activeBookIndex = bookIndex;
    updateJourney('reading', 'Reading in the Athenaeum.', bookIndex);
    onRead(bookIndex);
  });
  return true;
}

function guideBookJourney(bookIndex) {
  if (state.heldBookMesh || state.bookAnimation || state.cameraAnim || state.autoJourney) {
    onToast('Place the book you are carrying before choosing another volume.');
    return;
  }

  const placedBook = interactiveBooks.find((book) => book.userData.bookIndex === bookIndex && book.userData.isPlaced && !book.userData.isHeld);
  if (placedBook) {
    openPlacedBook(bookIndex);
    return;
  }

  const mesh = interactiveBooks.find((book) => book.userData.bookIndex === bookIndex && !book.userData.isHeld && !book.userData.isPlaced);
  if (!mesh) return;
  hideTooltip();
  const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
  const worldQuaternion = mesh.getWorldQuaternion(new THREE.Quaternion());
  const outward = mesh.userData.outwardNormal.clone().applyQuaternion(worldQuaternion).normalize();
  const approachPosition = worldPosition.clone().addScaledVector(outward, 1.75);
  approachPosition.y = 1.68;
  approachPosition.x = THREE.MathUtils.clamp(approachPosition.x, -6.2, 6.2);
  approachPosition.z = THREE.MathUtils.clamp(approachPosition.z, -6.2, 6.2);
  updateJourney('approaching', 'Walking to the selected shelf…', bookIndex);
  const walkDuration = Math.max(1500, camera.position.distanceTo(approachPosition) / 1.6 * 1000);
  flyCameraTo(approachPosition, worldPosition, walkDuration, () => takeBook(bookIndex, { ignoreDistance: true }));
}

/* =========================================================================
   13. RAYCASTING (HOVER & CLICK INTERACTIONS)
   ========================================================================= */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerDownPositions = new Map();
const activeTouchPointers = new Set();
let hadMultiTouchGesture = false;

let lastHoverKey = null;

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function handlePointerMove(e) {
  onPointerMove(e.clientX, e.clientY);
  if (state.activeBookIndex !== null) {
    state.hoveredObject = null;
    hideTooltip();
    return;
  }
  updatePointer(e);
  raycaster.setFromCamera(pointer, camera);

  const visibleBooks = interactiveBooks.filter((book) => !book.userData.isHeld);
  const hits = raycaster.intersectObjects([...visibleBooks, ...interactiveProps], false);
  if (hits.length > 0) {
    const hitObj = hits[0].object;
    state.hoveredObject = hitObj;
    renderer.domElement.style.cursor = 'pointer';
    const isBook = hitObj.userData.type === 'book';
    const hoverKey = isBook ? `book:${hitObj.userData.bookIndex}` : `fixture:${hitObj.userData.title}`;
    if (hoverKey === lastHoverKey) return;
  renderer.shadowMap.needsUpdate = true;
    lastHoverKey = hoverKey;
    if (hitObj.userData.type === 'book') {
      const book = getBookData(hitObj.userData.bookIndex);
      const actionHint = hitObj.userData.isPlaced ? 'Click or press E to read it again' : 'Walk close and press E to take it';
      onHover({ kicker: `${book.category} • ${book.year}`, title: book.title, sub: `${getBookLocation(book)} — ${actionHint}` });
    } else {
      onHover({ kicker: 'Interactive Fixture', title: hitObj.userData.title, sub: hitObj.userData.sub });
    }
  } else {
    state.hoveredObject = null;
    renderer.domElement.style.cursor = 'grab';
    if (lastHoverKey !== null) renderer.shadowMap.needsUpdate = true;
    hideTooltip();
  }
}

function handlePointerDown(e) {
  pointerDownPositions.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (e.pointerType === 'touch') {
    activeTouchPointers.add(e.pointerId);
    if (activeTouchPointers.size > 1) hadMultiTouchGesture = true;
  }
  // Cancel ongoing automatic flight if user manually grabs the camera
  if (state.cameraAnim && state.activeBookIndex === null && !state.autoJourney) {
    state.cameraAnim = null;
    controller.setActive(true);
    controller.lookAt(lookTarget);
    controller.handlePointerDown(e);
    updateJourney('explore', 'Journey paused. Walk to a shelf, take a volume, then bring it to the reading desk.');
  }
}

function handlePointerUp(e) {
  const pointerDown = pointerDownPositions.get(e.pointerId);
  pointerDownPositions.delete(e.pointerId);
  const wasMultiTouchGesture = hadMultiTouchGesture;
  if (e.pointerType === 'touch') {
    activeTouchPointers.delete(e.pointerId);
    if (activeTouchPointers.size === 0) hadMultiTouchGesture = false;
  }
  if (!pointerDown) return;
  const dist = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  if (dist > 7 || wasMultiTouchGesture || state.activeBookIndex !== null || state.autoJourney || state.bookAnimation) return; // Ignore drag and automatic book movement

  updatePointer(e);
  raycaster.setFromCamera(pointer, camera);
  const visibleBooks = interactiveBooks.filter((book) => !book.userData.isHeld);
  const hits = raycaster.intersectObjects([...visibleBooks, ...interactiveProps], false);
  if (hits.length > 0) {
    const hitObj = hits[0].object;
    activateInteractiveTarget(hitObj);
  }
}

function handlePointerCancel(e) {
  pointerDownPositions.delete(e.pointerId);
  if (e.pointerType === 'touch') {
    activeTouchPointers.delete(e.pointerId);
    if (activeTouchPointers.size === 0) hadMultiTouchGesture = false;
  }
}

renderer.domElement.addEventListener('pointermove', handlePointerMove);
renderer.domElement.addEventListener('pointerdown', handlePointerDown);
renderer.domElement.addEventListener('pointerup', handlePointerUp);
renderer.domElement.addEventListener('pointercancel', handlePointerCancel);

function hideTooltip() {
  if (lastHoverKey !== null) {
    renderer.shadowMap.needsUpdate = true;
    lastHoverKey = null;
    onHover(null);
  }
}

function returnFromBook() {
  if (state.activeBookIndex === null) return;
  state.activeBookIndex = null;
  controller.setActive(true);
  updateJourney('explore', 'Your book is on the table. Aim at it and press E to read again, or walk the shelves for another.');
}
/* =========================================================================
   16. ASSEMBLE SCENE & RUN ANIMATION LOOP
   ========================================================================= */
buildRoom();
populateLibraryShelves();
buildReadingDeskArea();
buildRollingLadder();
const globeMesh = buildStandingGlobe();
buildFramedArtAndCandles();
buildChandelier();
applyLightingMood('midnight');

const PLAYER_COLORS = ['#597957', '#785a86', '#9a5a43', '#4b7281', '#a17b3c', '#5d6b9b', '#826a5a', '#557c72'];

function playerColor(playerId) {
  let hash = 0;
  for (let index = 0; index < playerId.length; index += 1) hash = (hash * 31 + playerId.charCodeAt(index)) | 0;
  return PLAYER_COLORS[((hash % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];
}

function makePlayerNameplate(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(30, 20, 13, 0.88)';
  context.beginPath();
  context.roundRect(6, 6, 372, 84, 22);
  context.fill();
  context.strokeStyle = 'rgba(229, 189, 113, 0.9)';
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = '#fff0cf';
  context.font = 'bold 39px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name.slice(0, 24), 192, 48, 340);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  plate.scale.set(1.9, 0.48, 1);
  plate.position.set(0, 2.25, 0);
  plate.renderOrder = 5;
  return plate;
}

function makePlayerAvatar(player) {
  const root = new THREE.Group();
  const coatMaterial = new THREE.MeshStandardMaterial({ color: playerColor(player.id), roughness: 0.84 });
  const trouserMaterial = new THREE.MeshStandardMaterial({ color: '#342c28', roughness: 0.91 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#d7ad8d', roughness: 0.86 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.78, 9), coatMaterial);
  torso.position.y = 1.02;
  torso.castShadow = true;
  root.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skinMaterial);
  head.position.y = 1.62;
  head.castShadow = true;
  root.add(head);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.11, 10), new THREE.MeshStandardMaterial({ color: '#473326', roughness: 0.92 }));
  hat.position.y = 1.82;
  root.add(hat);

  const armGeometry = new THREE.CapsuleGeometry(0.065, 0.43, 3, 7);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.29, 1.33, 0);
  const leftArmMesh = new THREE.Mesh(armGeometry, coatMaterial);
  leftArmMesh.position.y = -0.19;
  leftArm.add(leftArmMesh);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.29, 1.33, 0);
  const rightArmMesh = new THREE.Mesh(armGeometry, coatMaterial);
  rightArmMesh.position.y = -0.19;
  rightArm.add(rightArmMesh);
  root.add(leftArm, rightArm);

  const legGeometry = new THREE.CapsuleGeometry(0.075, 0.42, 3, 7);
  const leftLeg = new THREE.Mesh(legGeometry, trouserMaterial);
  leftLeg.position.set(-0.12, 0.37, 0);
  const rightLeg = new THREE.Mesh(legGeometry, trouserMaterial);
  rightLeg.position.set(0.12, 0.37, 0);
  root.add(leftLeg, rightLeg, makePlayerNameplate(player.name));
  root.userData.remoteAvatar = { leftArm, rightArm, leftLeg, rightLeg, target: new THREE.Vector3(), targetYaw: 0, walking: false, phase: 0, waveUntil: 0 };
  return root;
}

function setRemotePlayers(players) {
  const liveIds = new Set(players.map(({ id }) => id));
  for (const [id, avatar] of remotePlayers) {
    if (liveIds.has(id)) continue;
    scene.remove(avatar);
    avatar.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose();
      object.material?.map?.dispose();
    });
    remotePlayers.delete(id);
  }

  players.forEach((player) => {
    let avatar = remotePlayers.get(player.id);
    if (!avatar) {
      avatar = makePlayerAvatar(player);
      remotePlayers.set(player.id, avatar);
      scene.add(avatar);
    } else {
      const nameplate = avatar.children.find((child) => child.isSprite);
      if (nameplate?.userData.name !== player.name) {
        if (nameplate) {
          avatar.remove(nameplate);
          nameplate.material.map?.dispose();
          nameplate.material.dispose();
        }
        const nextNameplate = makePlayerNameplate(player.name);
        nextNameplate.userData.name = player.name;
        avatar.add(nextNameplate);
      }
    }
    const avatarState = avatar.userData.remoteAvatar;
    avatarState.target.set(player.pose?.x ?? 0, 0, player.pose?.z ?? 0);
    avatarState.targetYaw = player.pose?.yaw ?? 0;
    avatarState.walking = Boolean(player.pose?.moving);
    const nameplate = avatar.children.find((child) => child.isSprite);
    if (nameplate) nameplate.userData.name = player.name;
  });
}

function showPlayerAction(playerId, action) {
  if (action !== 'wave') return;
  const avatar = remotePlayers.get(playerId);
  if (avatar) avatar.userData.remoteAvatar.waveUntil = performance.now() + 1300;
}

const clock = new THREE.Clock();
let animationFrameId = 0;
let poseClock = 0;

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  for (const avatar of remotePlayers.values()) {
    const remote = avatar.userData.remoteAvatar;
    avatar.position.lerp(remote.target, 1 - Math.exp(-10 * delta));
    let yawDelta = remote.targetYaw - avatar.rotation.y;
    yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
    avatar.rotation.y += yawDelta * (1 - Math.exp(-10 * delta));
    if (remote.walking) {
      remote.phase += delta * 8;
      remote.leftLeg.rotation.x = Math.sin(remote.phase) * 0.34;
      remote.rightLeg.rotation.x = -Math.sin(remote.phase) * 0.34;
      remote.leftArm.rotation.x = -Math.sin(remote.phase) * 0.22;
    } else {
      remote.leftLeg.rotation.x *= 0.8;
      remote.rightLeg.rotation.x *= 0.8;
      remote.leftArm.rotation.x *= 0.8;
    }
    remote.rightArm.rotation.z = performance.now() < remote.waveUntil ? -0.9 + Math.sin(elapsed * 23) * 0.45 : remote.rightArm.rotation.z * 0.78;
  }

  if (state.townDoorAnimation) {
    const animation = state.townDoorAnimation;
    const t = Math.min((performance.now() - animation.startTime) / animation.duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    townDoorPivot.rotation.y = animation.startAngle + (animation.endAngle - animation.startAngle) * ease;
    townPortalLight.intensity = 0.32 + ease * 1.25;

    if (t >= 1) {
      state.townDoorAnimation = null;
      state.townDoorOpen = animation.enterWhenOpen;
      if (animation.enterWhenOpen) onEnterTown();
      else controller.setActive(true);
    }
  }

  // 1. Smooth Camera Flight Interpolation
  if (state.cameraAnim) {
    const anim = state.cameraAnim;
    const t = Math.min((performance.now() - anim.startTime) / anim.duration, 1);
    // Cubic Ease In-Out
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(anim.startPos, anim.endPos, ease);
    camera.position.y += Math.sin((performance.now() - anim.startTime) * 0.012) * 0.022 * Math.sin(Math.PI * t);
    lookTarget.lerpVectors(anim.startTarget, anim.endTarget, ease);
    controller.lookAt(lookTarget);

    if (t >= 1) {
      const cb = anim.onComplete;
      state.cameraAnim = null;
      controller.setPose(anim.endPos, anim.endTarget);
      controller.setActive(true);
      if (cb) cb();
    }
  } else {
    controller.update(delta);
  }

  poseClock += delta;
  if (poseClock >= 0.1) {
    poseClock = 0;
    onPose({ x: controller.position.x, z: controller.position.z, yaw: camera.rotation.y, pitch: camera.rotation.x, moving: controller.movementAmount > 0.04 });
  }

  if (state.bookAnimation) {
    const animation = state.bookAnimation;
    const t = Math.min((performance.now() - animation.startTime) / animation.duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    animation.mesh.position.lerpVectors(animation.startPosition, animation.endPosition, ease);
    animation.mesh.quaternion.slerpQuaternions(animation.startQuaternion, animation.endQuaternion, ease);
    animation.mesh.scale.lerpVectors(animation.startScale, animation.endScale ?? animation.startScale, ease);
    if (t >= 1) {
      state.bookAnimation = null;
      finishBookAnimation(animation);
    }
  } else if (state.heldBookMesh) {
    const handPose = getHeldBookPose();
    state.heldBookMesh.position.copy(handPose.position);
    state.heldBookMesh.quaternion.copy(handPose.quaternion);
  }

  // 2. Interactive Books Hover Slide & Golden Emissive Glint
  const highlightPulse = state.highlightCurated ? (0.45 + Math.sin(elapsed * 3.2) * 0.25) : 0.06;
  for (let i = 0; i < interactiveBooks.length; i++) {
    const book = interactiveBooks[i];
    if (book.userData.isHeld || book.userData.isPlaced) continue;
    const isHovered = state.hoveredObject === book;
    const targetHover = isHovered ? 1 : 0;
    book.userData.hoverProgress += (targetHover - book.userData.hoverProgress) * 0.14;

    const slideDist = book.userData.outwardNormal.y > 0.7 ? 0.06 : 0.14;
    book.position.copy(book.userData.baseLocalPos).addScaledVector(
      book.userData.outwardNormal,
      book.userData.hoverProgress * slideDist
    );

    // Spine material is index 4
    const spineMat = book.material[4];
    const targetEmissive = isHovered ? 0.85 : highlightPulse;
    spineMat.emissiveIntensity += (targetEmissive - spineMat.emissiveIntensity) * 0.12;
  }

  // 3. Subtle Candlelight Flicker
  for (const c of candleFlames) {
    const flicker = Math.sin(elapsed * 9 + c.phase) * 0.08 + Math.sin(elapsed * 17 + c.phase) * 0.05;
    if (c.mesh) {
      c.mesh.scale.set(0.7 + flicker * 0.3, 1.5 + flicker, 0.7 + flicker * 0.3);
      c.mesh.visible = state.sideCandlesOn;
    }
    if (c.light) {
      c.light.intensity = state.sideCandlesOn ? c.baseIntensity + flicker * 1.2 : 0;
    }
  }
  if (state.chandelierOn) {
    chandelierLight.intensity = 4.8 + Math.sin(elapsed * 6.5) * 0.18 + Math.sin(elapsed * 13) * 0.08;
  }

  // 5. Gentle Antique Globe Rotation
  if (globeMesh) {
    globeMesh.rotation.y += delta * (state.globeFastSpin ? 0.8 : 0.08);
  }

  renderer.render(scene, camera);
}

function handleResize() {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  renderer.setPixelRatio(getRenderPixelRatio());
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
resizeObserver?.observe(container);
window.addEventListener('resize', handleResize);
handleResize();
animate();

return {
  setRemotePlayers,
  showPlayerAction,
  getPose() {
    return { x: controller.position.x, z: controller.position.z, yaw: camera.rotation.y, pitch: camera.rotation.x, moving: controller.movementAmount > 0.04 };
  },
  setLightingMood: applyLightingMood,
  setHighlights(enabled) {
    state.highlightCurated = enabled;
  },
  setAudioEnabled(enabled) {
    state.audioEnabled = enabled;
    audioEngine.toggle(enabled);
  },
  goToView(viewName) {
    const viewpoint = VIEWPOINTS[viewName];
    if (!viewpoint || state.autoJourney) return;
    if (state.activeBookIndex !== null) returnFromBook();
    flyCameraTo(viewpoint.pos, viewpoint.target, 1100);
  },
  visitBook(bookIndex) {
    guideBookJourney(bookIndex);
  },
  setMovementInput(direction, active) {
    controller.setMovement(direction, active);
  },
  setInputEnabled(enabled) {
    controller.setInputEnabled(enabled);
  },
  interact,
  zoom(factor) {
    controller.zoom(factor);
  },
  closeBook: returnFromBook,
  closeTownDoor() {
    if (!state.townDoorOpen || state.townDoorAnimation) return;
    state.townDoorOpen = false;
    controller.setActive(false);
    state.townDoorAnimation = {
      startTime: performance.now(),
      duration: 720,
      startAngle: townDoorPivot.rotation.y,
      endAngle: 0,
      enterWhenOpen: false,
    };
  },
  dispose() {
    cancelAnimationFrame(animationFrameId);
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleResize);
    renderer.domElement.removeEventListener('pointermove', handlePointerMove);
    renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
    renderer.domElement.removeEventListener('pointerup', handlePointerUp);
    renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
    controller.dispose();
    audioEngine.dispose();
    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value?.isTexture) value.dispose();
        });
        material.dispose();
      });
    });
    renderer.dispose();
    renderer.domElement.remove();
  },
};
}

