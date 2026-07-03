"use client";

import Image from "next/image";
import type { AgentId } from "@/lib/agents/types";
import { agentAvatarPath, agentRole } from "@/lib/agent-display";
import { cn } from "@/lib/utils";

type AgentPortraitProps = {
  agentId: AgentId;
  hovered?: boolean;
  className?: string;
};

export function AgentPortrait({ agentId, hovered = false, className }: AgentPortraitProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full min-h-0 overflow-hidden bg-[var(--bg-elevated)]",
        className
      )}
    >
      <Image
        src={agentAvatarPath(agentId)}
        alt={agentRole(agentId)}
        fill
        sizes="(max-width: 640px) 100vw, 320px"
        className={cn(
          "object-cover object-center transition-transform duration-500 ease-out",
          hovered && "scale-[1.04]"
        )}
        priority={false}
      />
    </div>
  );
}
