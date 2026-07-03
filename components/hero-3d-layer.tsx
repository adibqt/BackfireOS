"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";

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

const PLANE_VERTEX = `
uniform float uTime;
uniform float uWarpAmplitude;
varying float vHeight;
${SIMPLEX_NOISE}

void main() {
  vec3 pos = position;
  float n1 = snoise(vec3(pos.x * 0.35, pos.y * 0.35, uTime * 0.03));
  float n2 = snoise(vec3(pos.x * 0.75, pos.y * 0.75, uTime * 0.03 + 12.0)) * 0.5;
  float n3 = snoise(vec3(pos.x * 1.5, pos.y * 1.5, uTime * 0.03 + 24.0)) * 0.25;
  float displacement = (n1 + n2 + n3) * uWarpAmplitude;
  pos.z += displacement;
  vHeight = displacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const PLANE_FRAGMENT = `
varying float vHeight;

void main() {
  float t = clamp(vHeight * 0.45 + 0.5, 0.0, 1.0);
  vec3 dark = vec3(0.059, 0.055, 0.047);
  vec3 light = vec3(0.086, 0.078, 0.071);
  gl_FragColor = vec4(mix(dark, light, t), 1.0);
}
`;

const ORB_VERTEX = `
uniform float uTime;
uniform float uWarpAmplitude;
varying vec3 vNormal;
varying float vNoise;
varying float vWetness;
${SIMPLEX_NOISE}

void main() {
  vec3 pos = position;
  vec3 n = normalize(normal);
  float t = uTime;

  float blob = snoise(n * 1.6 + vec3(t * 0.16, t * 0.12, t * 0.1));
  float ripple = snoise(n * 3.0 + vec3(t * 0.2 + 4.0, t * 0.15, t * 0.18)) * 0.42;
  float drip = sin(t * 0.65 + pos.y * 1.35 + pos.x * 0.6) * 0.12;
  float disp = (blob * 0.7 + ripple + drip) * uWarpAmplitude;

  pos += n * disp;
  pos.y += sin(t * 0.48 + pos.x * 0.9) * uWarpAmplitude * 0.06;

  vNormal = normalize(normalMatrix * n);
  vNoise = blob;
  vWetness = ripple + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const ORB_FRAGMENT = `
uniform float uOpacity;
varying vec3 vNormal;
varying float vNoise;
varying float vWetness;

void main() {
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  vec3 norm = normalize(vNormal);
  float fresnel = pow(1.0 - abs(dot(norm, viewDir)), 2.4);
  float wetSpec = pow(max(dot(norm, viewDir), 0.0), 6.0);

  vec3 core = vec3(0.114, 0.102, 0.090);
  vec3 mid = vec3(0.155, 0.118, 0.095);
  vec3 edge = vec3(0.290, 0.118, 0.071);

  vec3 col = mix(core, mid, vWetness * 0.18 + vNoise * 0.08);
  col = mix(col, edge, fresnel * 0.42);
  col += vec3(0.045, 0.035, 0.028) * wetSpec * 0.28;

  gl_FragColor = vec4(col, uOpacity);
}
`;

type Hero3DLayerProps = {
  scrollProgress: number;
};

function CameraRig({
  scrollProgress,
  reduced,
}: {
  scrollProgress: number;
  reduced: boolean;
}) {
  const { camera } = useThree();
  const targetZ = useRef(5);
  const targetY = useRef(0);

  useEffect(() => {
    targetZ.current = reduced ? 5 : 5 + scrollProgress * 2.5;
    targetY.current = reduced ? 0 : scrollProgress * 0.35;
  }, [scrollProgress, reduced]);

  useFrame(() => {
    if (reduced) {
      camera.position.z = 5;
      camera.position.y = 0;
      camera.lookAt(0, 0, 0);
      return;
    }
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ.current, 0.018);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY.current, 0.018);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function AmbientPlane({
  scrollProgress,
  reduced,
  segments,
}: {
  scrollProgress: number;
  reduced: boolean;
  segments: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWarpAmplitude: { value: 0.25 },
        },
        vertexShader: PLANE_VERTEX,
        fragmentShader: PLANE_FRAGMENT,
      }),
    []
  );

  useFrame((state) => {
    if (!reduced) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
    material.uniforms.uWarpAmplitude.value = reduced
      ? 0.25
      : 0.25 + scrollProgress * 0.25;
  });

  return (
    <mesh rotation={[-0.3, 0, 0]} position={[0, -1.2, -8]} material={material}>
      <planeGeometry args={[28, 18, segments, segments]} />
    </mesh>
  );
}

function InkOrb({
  scrollProgress,
  mouse,
  reduced,
}: {
  scrollProgress: number;
  mouse: { x: number; y: number };
  reduced: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef(0);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWarpAmplitude: { value: 0.32 },
          uOpacity: { value: 0.92 },
        },
        vertexShader: ORB_VERTEX,
        fragmentShader: ORB_FRAGMENT,
        transparent: true,
      }),
    []
  );

  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const s = scrollProgress;
    const parallaxY = -s * 0.45;
    const parallaxX = s * 0.12;
    const z = -3.8 + s * 0.6;
    const opacity = s > 0.82 ? 1 - (s - 0.82) / 0.18 : 0.92;
    const warp = 0.28 + s * 0.08;
    const t = state.clock.elapsedTime;

    groupRef.current.position.set(2.1 + parallaxX, 0.72 + parallaxY, z);

    if (!reduced) {
      spinRef.current += delta * 0.2;
      material.uniforms.uTime.value = t;

      tilt.current.x = THREE.MathUtils.lerp(tilt.current.x, mouse.y * 0.04, 0.03);
      tilt.current.y = THREE.MathUtils.lerp(tilt.current.y, mouse.x * 0.04, 0.03);

      groupRef.current.rotation.y = spinRef.current + tilt.current.y;
      groupRef.current.rotation.x =
        Math.sin(t * 0.32) * 0.07 + tilt.current.x;
      groupRef.current.rotation.z = Math.sin(t * 0.26 + 0.8) * 0.05;

      const breathe = Math.sin(t * 0.72);
      const sx = 1 + breathe * 0.028;
      const sy = 1 + Math.cos(t * 0.72) * 0.034;
      groupRef.current.scale.set(sx, sy, 1 / Math.sqrt(sx * sy));
    } else {
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.scale.setScalar(1);
    }

    material.uniforms.uWarpAmplitude.value = reduced ? 0.28 : warp;
    material.uniforms.uOpacity.value = reduced ? 0.88 : opacity;
  });

  return (
    <group ref={groupRef}>
      <mesh material={material}>
        <sphereGeometry args={[2.55, 64, 64]} />
      </mesh>
    </group>
  );
}

function HeroScene({
  scrollProgress,
  mouse,
  showOrb,
  reduced,
  planeSegments,
}: {
  scrollProgress: number;
  mouse: { x: number; y: number };
  showOrb: boolean;
  reduced: boolean;
  planeSegments: number;
}) {
  return (
    <>
      <color attach="background" args={["#0F0E0C"]} />
      <CameraRig scrollProgress={scrollProgress} reduced={reduced} />
      <AmbientPlane
        scrollProgress={scrollProgress}
        reduced={reduced}
        segments={planeSegments}
      />
      {showOrb && (
        <InkOrb scrollProgress={scrollProgress} mouse={mouse} reduced={reduced} />
      )}
    </>
  );
}

export function Hero3DLayer({ scrollProgress }: Hero3DLayerProps) {
  const [reduced, setReduced] = useState(true);
  const [showOrb, setShowOrb] = useState(false);
  const [planeSegments, setPlaneSegments] = useState(128);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const mouseTarget = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(max-width: 899px)");
    const apply = () => {
      setShowOrb(!mq.matches);
      setPlaneSegments(mq.matches ? 64 : 128);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: MouseEvent) => {
      mouseTarget.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener("mousemove", onMove);
    let raf = 0;
    const loop = () => {
      setMouse((prev) => ({
        x: THREE.MathUtils.lerp(prev.x, mouseTarget.current.x, 0.035),
        y: THREE.MathUtils.lerp(prev.y, mouseTarget.current.y, 0.035),
      }));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const effectiveScroll = reduced ? 0 : scrollProgress;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 bg-[var(--bg-base)]">
      <Suspense fallback={null}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5], fov: 48, near: 0.1, far: 100 }}
          gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%" }}
        >
          <HeroScene
            scrollProgress={effectiveScroll}
            mouse={mouse}
            showOrb={showOrb}
            reduced={reduced}
            planeSegments={planeSegments}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
