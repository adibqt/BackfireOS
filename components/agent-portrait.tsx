"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AgentId } from "@/lib/agents/types";
import { AGENT_PORTRAIT_CONFIG } from "@/lib/agent-display";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

type AgentPortraitProps = {
  agentId: AgentId;
  hovered?: boolean;
  className?: string;
};

export function AgentPortrait({ agentId, hovered = false, className }: AgentPortraitProps) {
  const config = AGENT_PORTRAIT_CONFIG[agentId];
  const uid = useId().replace(/:/g, "");
  const filterId = `portrait-warp-${uid}`;
  const grainId = `portrait-grain-${uid}`;
  const rafRef = useRef(0);

  const [reduced, setReduced] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [morphT, setMorphT] = useState(0);
  const [warpBoost, setWarpBoost] = useState(0);
  const [warpPhase, setWarpPhase] = useState(0);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setWarpPhase((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, config.cycleMs]);

  useEffect(() => {
    const target = hovered ? 1 : 0;
    let raf = 0;
    const start = performance.now();
    const from = warpBoost;
    const duration = 400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setWarpBoost(from + (target - from) * t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hovered]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduced) {
      setFrameIndex(Math.floor(config.keyframes.length / 2));
      setMorphT(0);
      return;
    }

    const start = performance.now();
    const keyframeCount = config.keyframes.length;

    const tick = (now: number) => {
      const elapsed = now - start;
      const segmentDuration = config.cycleMs / keyframeCount;
      const total = config.cycleMs;
      const looped = elapsed % total;
      const idx = Math.floor(looped / segmentDuration) % keyframeCount;
      const localT = (looped % segmentDuration) / segmentDuration;
      setFrameIndex(idx);
      setMorphT(localT);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config, reduced]);

  const nextIndex = (frameIndex + 1) % config.keyframes.length;
  const currentPath = config.keyframes[frameIndex];
  const nextPath = config.keyframes[nextIndex];
  const staticPath = config.keyframes[Math.floor(config.keyframes.length / 2)];

  const warpScale = config.warpScale * (1 + warpBoost * 0.4);
  const baseFreq = reduced ? 0.012 : 0.008 + Math.sin(warpPhase / 15) * 0.002;

  return (
    <div
      className={cn(
        "relative h-[240px] w-[240px] overflow-hidden bg-[var(--bg-elevated)]",
        className
      )}
    >
      <svg
        viewBox="0 0 240 240"
        className="h-full w-full"
        aria-hidden
        role="presentation"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFreq}
              numOctaves={3}
              seed={agentId.length * 7}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={warpScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          {agentId === "cynical_journalist" && (
            <filter id={grainId}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="g" />
              <feColorMatrix type="saturate" values="0" in="g" result="gray" />
              <feBlend in="SourceGraphic" in2="gray" mode="multiply" />
            </filter>
          )}
        </defs>

        {reduced ? (
          <path
            d={staticPath}
            fill={config.color}
            fillOpacity={0.9}
            filter={
              agentId === "cynical_journalist"
                ? `url(#${grainId})`
                : `url(#${filterId})`
            }
          />
        ) : (
          <>
            <path
              d={currentPath}
              fill={config.color}
              fillOpacity={0.9 * (1 - morphT)}
              filter={`url(#${filterId})`}
            />
            <path
              d={nextPath}
              fill={config.color}
              fillOpacity={0.9 * morphT}
              filter={`url(#${filterId})`}
            />
          </>
        )}
      </svg>
    </div>
  );
}
