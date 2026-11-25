import * as THREE from 'three';

export const LIGHTING_PRESETS = {
  sunset: {
    name: 'Vice Sunset',
    skyTop: new THREE.Color('#271c4a'),
    skyMid: new THREE.Color('#c85a6c'),
    skyHorizon: new THREE.Color('#ffbe6f'),
    sunGlow: new THREE.Color('#ffe0a3'),
    fogColor: new THREE.Color('#d47f78'),
    fogDensity: 0.0042,
    sunColor: new THREE.Color('#ffae62'),
    sunIntensity: 3.3,
    sunPos: new THREE.Vector3(95, 30, 55),
    hemiSky: new THREE.Color('#ffc4b0'),
    hemiGround: new THREE.Color('#3b2c3d'),
    hemiIntensity: 1.05,
    lampIntensity: 2.2,
    windowEmissive: 1.05,
    neonEmissive: 2.1,
    exposure: 1.12,
    starIntensity: 0.25,
    rainIntensity: 0
  },
  neonNight: {
    name: 'Neon Midnight',
    skyTop: new THREE.Color('#070b1a'),
    skyMid: new THREE.Color('#161b3a'),
    skyHorizon: new THREE.Color('#47244f'),
    sunGlow: new THREE.Color('#b6ccff'),
    fogColor: new THREE.Color('#13172e'),
    fogDensity: 0.0058,
    sunColor: new THREE.Color('#7f9be8'),
    sunIntensity: 0.85,
    sunPos: new THREE.Vector3(-75, 58, -45),
    hemiSky: new THREE.Color('#425794'),
    hemiGround: new THREE.Color('#14111c'),
    hemiIntensity: 0.65,
    lampIntensity: 4.0,
    windowEmissive: 1.75,
    neonEmissive: 3.2,
    exposure: 1.06,
    starIntensity: 0.95,
    rainIntensity: 0
  },
  tropicalNoon: {
    name: 'Tropical Noon',
    skyTop: new THREE.Color('#1e6fb8'),
    skyMid: new THREE.Color('#66b4e6'),
    skyHorizon: new THREE.Color('#d2f0fb'),
    sunGlow: new THREE.Color('#fff9e0'),
    fogColor: new THREE.Color('#bde2f4'),
    fogDensity: 0.0028,
    sunColor: new THREE.Color('#fff6e0'),
    sunIntensity: 3.2,
    sunPos: new THREE.Vector3(45, 92, 35),
    hemiSky: new THREE.Color('#ccecff'),
    hemiGround: new THREE.Color('#6a6254'),
    hemiIntensity: 1.25,
    lampIntensity: 0.15,
    windowEmissive: 0.2,
    neonEmissive: 0.75,
    exposure: 1.05,
    starIntensity: 0,
    rainIntensity: 0
  },
  stormDusk: {
    name: 'Stormy Wet Dusk',
    skyTop: new THREE.Color('#121924'),
    skyMid: new THREE.Color('#273342'),
    skyHorizon: new THREE.Color('#4d5866'),
    sunGlow: new THREE.Color('#8ea2bd'),
    fogColor: new THREE.Color('#2a3240'),
    fogDensity: 0.0075,
    sunColor: new THREE.Color('#8da6c9'),
    sunIntensity: 1.25,
    sunPos: new THREE.Vector3(-55, 42, 30),
    hemiSky: new THREE.Color('#627792'),
    hemiGround: new THREE.Color('#1a1f28'),
    hemiIntensity: 0.85,
    lampIntensity: 3.5,
    windowEmissive: 1.45,
    neonEmissive: 2.9,
    exposure: 1.02,
    starIntensity: 0,
    rainIntensity: 1.0
  }
};

export function createAtmosphericSky() {
  const uniforms = {
    topColor: { value: LIGHTING_PRESETS.sunset.skyTop.clone() },
    midColor: { value: LIGHTING_PRESETS.sunset.skyMid.clone() },
    horizonColor: { value: LIGHTING_PRESETS.sunset.skyHorizon.clone() },
    sunDir: { value: LIGHTING_PRESETS.sunset.sunPos.clone().normalize() },
    sunColor: { value: LIGHTING_PRESETS.sunset.sunGlow.clone() },
    starIntensity: { value: LIGHTING_PRESETS.sunset.starIntensity },
    uTime: { value: 0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform float starIntensity;
      uniform float uTime;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = dir.y;
        vec3 col = mix(horizonColor, midColor, smoothstep(-0.04, 0.28, h));
        col = mix(col, topColor, smoothstep(0.24, 0.82, h));

        float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sunDot, 10.0) * 0.45;
        col += sunColor * smoothstep(0.9965, 0.9993, sunDot) * 1.65;

        if (h > 0.03) {
          vec2 uv = dir.xz / (h + 0.22) * 1.85 + vec2(uTime * 0.008, uTime * 0.004);
          float c = fbm(uv);
          float cloudMask = smoothstep(0.50, 0.80, c) * smoothstep(0.03, 0.22, h) * 0.36;
          vec3 cloudLit = mix(horizonColor, sunColor, pow(sunDot, 3.0) * 0.6 + 0.25);
          col = mix(col, cloudLit, cloudMask);

          if (starIntensity > 0.01) {
            vec2 starCell = floor(dir.xz / (h + 0.5) * 140.0);
            float star = step(0.992, hash(starCell)) * smoothstep(0.22, 0.65, h);
            col += vec3(0.9, 0.95, 1.0) * star * starIntensity * 0.9;
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(320, 40, 24), mat);
  return { mesh, uniforms };
}

export function createOceanWater() {
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: LIGHTING_PRESETS.sunset.sunPos.clone().normalize() },
    uSunColor: { value: LIGHTING_PRESETS.sunset.sunGlow.clone() },
    uSkyColor: { value: LIGHTING_PRESETS.sunset.skyHorizon.clone() },
    uDeepColor: { value: new THREE.Color('#0a3b4e') },
    uShallowColor: { value: new THREE.Color('#1c8a92') }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vWave;
      void main() {
        vec3 p = position;
        float w1 = sin(p.x * 0.16 + uTime * 1.45) * 0.16;
        float w2 = cos(p.y * 0.14 + uTime * 1.15) * 0.12;
        p.z += w1 + w2;
        vWave = w1 + w2;
        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSkyColor;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      varying vec3 vWorldPos;
      varying float vWave;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float nx = cos(vWorldPos.x * 0.35 + uTime * 1.8) * 0.14 + sin(vWorldPos.z * 0.55 - uTime * 1.4) * 0.08;
        float nz = sin(vWorldPos.z * 0.38 + uTime * 1.5) * 0.14;
        vec3 normal = normalize(vec3(nx, 1.0, nz));

        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.4);
        float shoreBlend = smoothstep(105.0, 58.0, vWorldPos.x);
        vec3 baseWater = mix(uDeepColor, uShallowColor, shoreBlend * 0.72 + vWave * 0.5);
        vec3 col = mix(baseWater, uSkyColor * 0.92, clamp(fresnel * 0.88, 0.05, 0.92));

        vec3 halfVec = normalize(normalize(uSunDir) + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), 110.0);
        col += uSunColor * spec * 1.7;

        float foam = smoothstep(59.8, 56.8, vWorldPos.x) * (0.45 + 0.55 * sin(vWorldPos.z * 0.35 + uTime * 2.2));
        col = mix(col, vec3(0.92, 0.96, 0.98), clamp(foam * 0.65, 0.0, 0.65));

        gl_FragColor = vec4(col, 0.93);
      }
    `
  });

  const geo = new THREE.PlaneGeometry(180, 320, 72, 72);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(145, -0.38, 0);
  return { mesh, uniforms };
}

export const ViceColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.18 },
    uContrast: { value: 1.07 },
    uVignette: { value: 0.32 },
    uAberration: { value: 0.0012 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform float uAberration;
    varying vec2 vUv;

    void main() {
      vec2 offset = (vUv - 0.5) * uAberration;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      // Filmic saturation boost & subtle contrast curve
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;

      // Soft cinematic vignette
      float dist = distance(vUv, vec2(0.5));
      col *= smoothstep(0.95, 0.95 - uVignette, dist * 1.12);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};
