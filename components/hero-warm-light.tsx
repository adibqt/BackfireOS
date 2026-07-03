"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Hero3DPalette } from "@/lib/hero-3d-palette";

const SIMPLEX_NOISE = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const LIGHT_VERTEX = `
uniform vec2 uLightPos;
uniform float uLightRadius;

varying vec2 vUv;
varying float vRelief;
varying vec3 vNormal;

${SIMPLEX_NOISE}

float wallHeight(vec2 sampleUv, vec3 worldPos) {
  float litDist = length(sampleUv - uLightPos);
  float litMask = 1.0 - smoothstep(0.0, uLightRadius, litDist);

  float baseNoise = snoise(vec3(worldPos.x * 0.35, worldPos.y * 0.35, 0.0));
  float baseDisp = baseNoise * 0.1;

  float detailNoise = snoise(vec3(worldPos.x * 1.15, worldPos.y * 1.15, 1.4));
  float detailDisp = detailNoise * 0.25 * litMask;

  return baseDisp + detailDisp;
}

void main() {
  vUv = uv;
  vec3 pos = position;

  float litDist = length(uv - uLightPos);
  float litMask = 1.0 - smoothstep(0.0, uLightRadius, litDist);

  float baseNoise = snoise(vec3(pos.x * 0.35, pos.y * 0.35, 0.0));
  vRelief = baseNoise;

  float disp = wallHeight(uv, pos);
  pos.z += disp;

  float eps = 0.018;
  float dispX = wallHeight(uv + vec2(eps, 0.0), pos + vec3(eps, 0.0, 0.0));
  float dispY = wallHeight(uv + vec2(0.0, eps), pos + vec3(0.0, eps, 0.0));
  vec3 surfNormal = normalize(vec3(disp - dispX, disp - dispY, eps * 2.0));

  vNormal = normalize(normalMatrix * surfNormal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const LIGHT_FRAGMENT = `
uniform vec2 uLightPos;
uniform float uLightRadius;
uniform float uLightIntensity;
uniform vec3 uWallDark;
uniform vec3 uWallLight;
uniform vec3 uWarmTone;

varying vec2 vUv;
varying float vRelief;
varying vec3 vNormal;

void main() {
  float dist = length(vUv - uLightPos);
  float lightMask = smoothstep(uLightRadius, 0.0, dist) * uLightIntensity;
  if (lightMask < 0.002) discard;

  float reliefT = clamp(vRelief * 0.45 + 0.5, 0.0, 1.0);
  vec3 baseColor = mix(uWallDark, uWallLight, reliefT);

  vec3 brightened = mix(baseColor, baseColor * 1.35, lightMask);
  vec3 litColor = mix(brightened, uWarmTone, lightMask * 0.28);

  vec3 lightDir = normalize(vec3(-0.5, 0.7, 0.6));
  float ndotl = dot(normalize(vNormal), lightDir);
  litColor *= 1.0 + ndotl * 0.25 * lightMask;

  float innerMask = smoothstep(uLightRadius * 0.3, 0.0, dist) * uLightIntensity;
  litColor *= 1.0 + innerMask * 0.08;

  gl_FragColor = vec4(litColor, lightMask);
}
`;

type HeroWarmLightProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  segments: number;
  palette: Hero3DPalette;
};

function WarmLightMesh({
  containerRef,
  segments,
  palette,
  onCompileFail,
}: HeroWarmLightProps & { onCompileFail: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointerNdc = useMemo(() => new THREE.Vector2(), []);

  const targetUv = useRef(new THREE.Vector2(0.5, 0.5));
  const renderedUv = useRef(new THREE.Vector2(0.5, 0.5));
  const pointerInside = useRef(false);
  const pointerClient = useRef({ x: 0, y: 0 });
  const lightIntensity = useRef(0);
  const intensityTarget = useRef(0);
  const lastRenderedUv = useRef(new THREE.Vector2(0.5, 0.5));
  const velocity = useRef(0);
  const compileChecked = useRef(false);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uLightPos: { value: new THREE.Vector2(0.5, 0.5) },
          uLightRadius: { value: 0.14 },
          uLightIntensity: { value: 0 },
          uWallDark: { value: new THREE.Vector3(...palette.wallDark) },
          uWallLight: { value: new THREE.Vector3(...palette.wallLight) },
          uWarmTone: { value: new THREE.Vector3(...palette.warmTone) },
        },
        vertexShader: LIGHT_VERTEX,
        fragmentShader: LIGHT_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
      }),
    [palette]
  );

  const planeSize = useMemo(() => {
    const dist = 10;
    const vFov = THREE.MathUtils.degToRad(48);
    const height = 2 * Math.tan(vFov / 2) * dist * 1.25;
    const width = height * (size.width / Math.max(size.height, 1)) * 1.2;
    return { width, height };
  }, [size.width, size.height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onEnter = () => {
      pointerInside.current = true;
      intensityTarget.current = 1;
    };
    const onLeave = () => {
      pointerInside.current = false;
      intensityTarget.current = 0;
    };
    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      pointerClient.current.x = event.clientX;
      pointerClient.current.y = event.clientY;

      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(pointerNdc, camera);
      const mesh = meshRef.current;
      if (mesh) {
        const hits = raycaster.intersectObject(mesh, false);
        if (hits[0]?.uv) {
          targetUv.current.set(hits[0].uv.x, hits[0].uv.y);
          return;
        }
      }

      targetUv.current.set(
        THREE.MathUtils.clamp(pointerNdc.x * 0.5 + 0.5, 0.02, 0.98),
        THREE.MathUtils.clamp(pointerNdc.y * 0.5 + 0.5, 0.02, 0.98)
      );
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
    };
  }, [camera, containerRef, pointerNdc, raycaster]);

  useFrame((state, delta) => {
    if (!compileChecked.current && meshRef.current) {
      compileChecked.current = true;
      try {
        const { gl } = state;
        gl.compile(meshRef.current, camera);
        const shaderMat = material as THREE.ShaderMaterial & {
          program?: { program: WebGLProgram };
        };
        const ctx = gl.getContext();
        if (shaderMat.program) {
          const linked = ctx.getProgramParameter(
            shaderMat.program.program,
            ctx.LINK_STATUS
          );
          if (!linked) {
            onCompileFail();
            return;
          }
        }
      } catch {
        onCompileFail();
        return;
      }
    }

    const fadeInRate = delta / 0.3;
    const fadeOutRate = delta / 0.4;
    if (lightIntensity.current < intensityTarget.current) {
      lightIntensity.current = Math.min(
        intensityTarget.current,
        lightIntensity.current + fadeInRate
      );
    } else if (lightIntensity.current > intensityTarget.current) {
      lightIntensity.current = Math.max(
        intensityTarget.current,
        lightIntensity.current - fadeOutRate
      );
    }

    renderedUv.current.lerp(targetUv.current, 0.12);

    const dt = Math.max(delta, 0.001);
    velocity.current =
      renderedUv.current.distanceTo(lastRenderedUv.current) / dt;
    lastRenderedUv.current.copy(renderedUv.current);

    const radius = THREE.MathUtils.clamp(
      0.12 + velocity.current * 0.025,
      0.12,
      0.16
    );

    material.uniforms.uLightPos.value.copy(renderedUv.current);
    material.uniforms.uLightRadius.value = radius;
    material.uniforms.uLightIntensity.value = lightIntensity.current;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-0.3, 0, 0]}
      position={[0, -1.2, -5]}
      renderOrder={1}
      material={material}
    >
      <planeGeometry args={[planeSize.width, planeSize.height, segments, segments]} />
    </mesh>
  );
}

export function HeroWarmLight({
  containerRef,
  enabled,
  segments,
  palette,
}: HeroWarmLightProps & { enabled: boolean }) {
  const [compileFailed, setCompileFailed] = useState(false);

  if (!enabled || compileFailed) return null;

  return (
    <WarmLightMesh
      containerRef={containerRef}
      segments={segments}
      palette={palette}
      onCompileFail={() => setCompileFailed(true)}
    />
  );
}
