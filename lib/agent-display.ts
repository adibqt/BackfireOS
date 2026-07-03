import type { AgentId } from "@/lib/agents/types";

export type AgentPortraitConfig = {
  color: string;
  cycleMs: number;
  warpScale: number;
  /** SVG path keyframes (viewBox 0 0 240 240) */
  keyframes: string[];
};

export const AGENT_ROLES: Record<AgentId, string> = {
  meme_engineer: "Meme Engineer",
  regional_outsider: "Regional Outsider",
  cynical_journalist: "Cynical Journalist",
  rival_brand: "Rival Brand Social Team",
  regulatory_activist: "Regulatory Activist",
  brand_purist: "Brand Purist",
};

export function agentRole(agentId: AgentId): string {
  return AGENT_ROLES[agentId] ?? agentId;
}

export function severityBarColor(severity: number): string {
  if (severity >= 70) return "var(--signal)";
  if (severity >= 40) return "var(--ink-secondary)";
  return "var(--data-cool)";
}

/** Organic blob keyframes — hand-authored, non-geometric silhouettes */
export const AGENT_PORTRAIT_CONFIG: Record<AgentId, AgentPortraitConfig> = {
  meme_engineer: {
    color: "#7C5CBF",
    cycleMs: 6000,
    warpScale: 14,
    keyframes: [
      "M118 42 C148 38 178 62 172 98 C188 118 168 158 132 168 C98 182 58 162 52 128 C38 98 58 48 118 42 Z",
      "M122 48 C156 44 182 72 176 104 C192 128 162 164 124 172 C86 186 48 158 44 122 C32 92 54 52 122 48 Z",
      "M114 46 C142 40 174 58 168 94 C184 112 164 152 128 166 C94 178 56 158 50 124 C36 96 56 50 114 46 Z",
      "M120 44 C152 42 180 66 174 100 C190 122 170 160 130 170 C96 184 54 160 48 126 C34 94 56 46 120 44 Z",
    ],
  },
  regional_outsider: {
    color: "#2E7D8C",
    cycleMs: 14000,
    warpScale: 10,
    keyframes: [
      "M48 88 C72 52 128 38 168 58 C192 72 198 118 182 148 C162 188 98 198 62 172 C32 148 28 112 48 88 Z",
      "M52 92 C76 56 132 42 164 62 C188 78 194 122 178 152 C158 192 94 194 58 168 C34 144 32 116 52 92 Z",
      "M46 90 C70 54 126 40 166 56 C190 70 196 116 180 146 C160 186 96 196 60 170 C30 146 26 110 46 90 Z",
      "M50 86 C74 50 130 36 170 56 C194 70 200 114 184 144 C164 184 100 200 64 174 C36 150 30 114 50 86 Z",
    ],
  },
  cynical_journalist: {
    color: "#8C4A2E",
    cycleMs: 10000,
    warpScale: 12,
    keyframes: [
      "M96 58 C128 48 168 68 174 108 C182 142 158 178 118 182 C78 188 52 158 48 122 C44 88 68 62 96 58 Z",
      "M100 62 C132 52 164 72 170 112 C176 146 152 174 114 178 C74 184 56 154 52 118 C48 92 72 66 100 62 Z",
      "M94 60 C126 50 166 70 172 110 C180 144 156 176 116 180 C76 186 50 156 46 120 C42 86 66 60 94 60 Z",
      "M98 56 C130 46 170 66 176 106 C184 140 160 172 120 176 C80 182 54 152 50 116 C46 90 70 58 98 56 Z",
    ],
  },
  rival_brand: {
    color: "#2E5E8C",
    cycleMs: 8000,
    warpScale: 16,
    keyframes: [
      "M72 68 C108 44 156 52 178 88 C196 118 188 158 152 176 C112 192 68 172 58 132 C48 98 52 82 72 68 Z",
      "M76 72 C112 48 152 56 174 92 C192 122 184 162 148 180 C108 196 64 176 54 136 C44 102 56 76 76 72 Z",
      "M70 70 C106 46 154 54 176 90 C194 120 186 160 150 178 C110 194 66 174 56 134 C46 100 50 84 70 70 Z",
      "M74 66 C110 42 158 50 180 86 C198 116 190 156 154 174 C114 190 70 170 60 130 C50 96 54 80 74 66 Z",
    ],
  },
  regulatory_activist: {
    color: "#8C2E2E",
    cycleMs: 14000,
    warpScale: 8,
    keyframes: [
      "M88 52 C132 48 176 72 182 112 C188 152 162 188 122 192 C82 196 48 168 44 128 C40 88 58 56 88 52 Z",
      "M92 54 C136 50 172 74 178 114 C184 154 158 186 118 190 C78 194 52 166 48 126 C44 90 62 58 92 54 Z",
      "M86 50 C130 46 174 70 180 110 C186 150 160 184 120 188 C80 192 46 164 42 124 C38 86 56 54 86 50 Z",
      "M90 52 C134 48 178 72 184 112 C190 152 164 186 124 190 C84 194 50 166 46 126 C42 88 60 56 90 52 Z",
    ],
  },
  brand_purist: {
    color: "#2E8C4A",
    cycleMs: 12000,
    warpScale: 9,
    keyframes: [
      "M120 48 C152 46 178 68 180 104 C182 140 158 174 120 178 C82 182 58 154 56 118 C54 82 88 50 120 48 Z",
      "M120 52 C154 50 176 72 178 108 C180 144 156 170 120 174 C84 178 60 150 58 114 C56 86 90 54 120 52 Z",
      "M120 50 C156 48 180 70 182 106 C184 142 160 172 120 176 C84 180 60 152 58 116 C56 84 92 52 120 50 Z",
      "M120 46 C150 44 176 66 178 102 C180 138 156 176 120 180 C84 184 56 156 54 120 C52 80 86 48 120 46 Z",
    ],
  },
};
