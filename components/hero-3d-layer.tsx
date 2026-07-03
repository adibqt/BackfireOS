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
  float n1 = snoise(vec3(pos.x * 0.35, pos.y * 0.35, uTime * 0.08));
  float n2 = snoise(vec3(pos.x * 0.75, pos.y * 0.75, uTime * 0.08 + 12.0)) * 0.5;
  float n3 = snoise(vec3(pos.x * 1.5, pos.y * 1.5, uTime * 0.08 + 24.0)) * 0.25;
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
${SIMPLEX_NOISE}

void main() {
  vec3 pos = position;
  float cycle = uTime * (6.2831853 / 12.0);
  float n = snoise(normalize(pos) * 2.0 + vec3(cycle * 0.15, cycle * 0.2, cycle * 0.1));
  pos += normal * n * uWarpAmplitude;
  vNormal = normalize(normalMatrix * normal);
  vNoise = n;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const ORB_FRAGMENT = `
uniform float uOpacity;
varying vec3 vNormal;
varying float vNoise;

void main() {
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.2);
  vec3 core = vec3(0.114, 0.102, 0.090);
  vec3 edge = vec3(0.290, 0.118, 0.071);
  vec3 col = mix(core, edge, fresnel * 0.65 + vNoise * 0.12 + 0.15);
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

  useEffect(() => {
    targetZ.current = reduced ? 5 : 5 + scrollProgress * 4;
  }, [scrollProgress, reduced]);

  useFrame(() => {
    if (reduced) {
      camera.position.z = 5;
      camera.lookAt(0, 0, 0);
      return;
    }
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ.current, 0.06);
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
          uWarpAmplitude: { value: 0.3 },
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
      ? 0.3
      : 0.3 + scrollProgress * 0.9;
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
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWarpAmplitude: { value: 0.4 },
          uOpacity: { value: 1 },
        },
        vertexShader: ORB_VERTEX,
        fragmentShader: ORB_FRAGMENT,
        transparent: true,
      }),
    []
  );

  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state) => {
    if (!groupRef.current) return;

    const s = scrollProgress;
    let z = -3;
    let scale = 1;
    let opacity = 1;
    let warp = 0.4;

    if (s <= 0.3) {
      z = -3;
    } else if (s <= 0.7) {
      const t = (s - 0.3) / 0.4;
      z = -3 + t * 4;
      scale = 1 + t * 0.4;
      warp = 0.4 + t * 0.35;
    } else {
      const t = (s - 0.7) / 0.3;
      z = 1 + t * 0.6;
      scale = 1.4 + t * 0.25;
      opacity = 1 - t;
      warp = 0.75 + t * 0.15;
    }

    if (reduced) {
      z = -3;
      scale = 1;
      opacity = 0.85;
      warp = 0.4;
    }

    groupRef.current.position.set(2.6, 0.15, z);
    groupRef.current.scale.setScalar(scale);

    if (!reduced) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
      tilt.current.x = THREE.MathUtils.lerp(tilt.current.x, mouse.y * 0.15, 0.04);
      tilt.current.y = THREE.MathUtils.lerp(
        tilt.current.y,
        mouse.x * 0.15 + state.clock.elapsedTime * 0.08,
        0.04
      );
      groupRef.current.rotation.x = tilt.current.x;
      groupRef.current.rotation.y = tilt.current.y;
    }

    material.uniforms.uWarpAmplitude.value = warp;
    material.uniforms.uOpacity.value = opacity;
  });

  return (
    <group ref={groupRef}>
      <mesh material={material}>
        <sphereGeometry args={[2.4, 64, 64]} />
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
        x: THREE.MathUtils.lerp(prev.x, mouseTarget.current.x, 0.06),
        y: THREE.MathUtils.lerp(prev.y, mouseTarget.current.y, 0.06),
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
