import * as THREE from 'three';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createWetAsphaltTextures(maxAnisotropy = 4) {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d');

  ctx.fillStyle = '#25272b';
  ctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#c8c8c8';
  rctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  // Aggregate asphalt grain
  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 28 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
    ctx.fillRect(x, y, 2, 2);

    const bv = 105 + Math.floor(Math.random() * 50);
    bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bctx.fillRect(x, y, 2, 2);
  }

  // Glossy wet rain puddles (low roughness = mirror-like specular reflections!)
  for (let p = 0; p < 16; p++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 55 + Math.random() * 95;
    const grad = rctx.createRadialGradient(px, py, pr * 0.12, px, py, pr);
    grad.addColorStop(0, '#141414');
    grad.addColorStop(0.65, '#2b2b2b');
    grad.addColorStop(1, 'rgba(200,200,200,0)');
    rctx.fillStyle = grad;
    rctx.beginPath();
    rctx.arc(px, py, pr, 0, Math.PI * 2);
    rctx.fill();

    // Slightly darker wet asphalt albedo inside puddles
    const cgrad = ctx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
    cgrad.addColorStop(0, 'rgba(12,14,18,0.42)');
    cgrad.addColorStop(1, 'rgba(12,14,18,0)');
    ctx.fillStyle = cgrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(14, 14);
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(14, 14);
  roughnessMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(14, 14);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, roughnessMap, bumpMap };
}

export function createSidewalkPaverTexture(maxAnisotropy = 4) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#9b9183';
  ctx.fillRect(0, 0, size, size);

  const cols = 8;
  const rows = 8;
  const cw = size / cols;
  const ch = size / rows;
  const tones = ['#cfc4b2', '#c5b8a4', '#d8cebe', '#bdb09c'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = tones[(r * 3 + c * 5) % tones.length];
      ctx.fillRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4);
      ctx.strokeStyle = 'rgba(65, 55, 45, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4);
    }
  }

  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,250,240,0.08)' : 'rgba(50,42,34,0.08)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSandTexture(maxAnisotropy = 4) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dfca9f';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6500; i++) {
    const shade = Math.random();
    ctx.fillStyle = shade > 0.65 ? '#ebd9b3' : shade > 0.3 ? '#d4bc8e' : '#c7ae7f';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 18);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGrassTexture(maxAnisotropy = 4) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#486036';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const shade = Math.random();
    ctx.fillStyle = shade > 0.65 ? '#5b7642' : shade > 0.3 ? '#3f562f' : '#344727';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 2, 4 + Math.random() * 5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGlassSkyscraperTexture(tintHex = '#1e3954', litAccent = '#ffd89a') {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, w, h);

  const cols = 8;
  const rows = 18;
  const cw = w / cols;
  const ch = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() < 0.38;
      if (lit) {
        const grad = ctx.createLinearGradient(c * cw, r * ch, c * cw, (r + 1) * ch);
        grad.addColorStop(0, litAccent);
        grad.addColorStop(1, '#584434');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = Math.random() > 0.5 ? '#162c42' : '#1b354d';
      }
      ctx.fillRect(c * cw + 5, r * ch + 5, cw - 10, ch - 10);
    }
  }

  // Mullion grid
  ctx.strokeStyle = '#0d151d';
  ctx.lineWidth = 6;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, h);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ch);
    ctx.lineTo(w, r * ch);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createNeonSignTexture(title, subtitle = '', neonColor = '#ff4ec7', bgColor = '#160d1f') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = neonColor;
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 5;
  roundRect(ctx, 10, 10, 492, 140, 18);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px Inter, sans-serif';
  ctx.fillText(title, 256, subtitle ? 68 : 82, 460);

  if (subtitle) {
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillStyle = neonColor;
    ctx.fillText(subtitle, 256, 120, 440);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPlasterTexture(baseHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 26;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, Math.random() > 0.45 ? 'rgba(255,250,240,0.09)' : 'rgba(40,30,25,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRoofTileTexture(baseHex, accentHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const rows = 10;
  const cols = 10;
  const rw = size / cols;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * rw + (r % 2) * (rw * 0.5) - rw * 0.5;
      const y = r * rh;
      ctx.fillStyle = Math.random() > 0.5 ? baseHex : accentHex;
      ctx.beginPath();
      ctx.arc(x + rw * 0.5, y + rh * 0.5, rw * 0.52, 0, Math.PI, false);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

export function createContactShadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(12, 10, 14, 0.58)');
  grad.addColorStop(0.55, 'rgba(12, 10, 14, 0.24)');
  grad.addColorStop(1, 'rgba(12, 10, 14, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
