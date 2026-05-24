import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import type { AgentVerdict, CampaignInput, MemeResult } from "./agents/types";

interface MemeConcept {
  caption: string;
  visualPrompt: string;
  memeabilityScore: number;
}

function mockMemes(campaign: CampaignInput, verdicts: AgentVerdict[]): MemeResult[] {
  const memeEngineer = verdicts.find((v) => v.agentId === "meme_engineer");
  const baseScore = memeEngineer?.severity ?? 70;

  return [
    {
      caption: `POV: ${campaign.slogan} but make it cringe`,
      imageUrl: placeholderImage("Meme+1", baseScore),
      memeabilityScore: Math.min(100, baseScore + 5),
    },
    {
      caption: "Brand team vs Internet — who wins?",
      imageUrl: placeholderImage("Meme+2", baseScore - 5),
      memeabilityScore: Math.max(40, baseScore - 5),
    },
    {
      caption: "Dhaka Meme Engineer approved this roast",
      imageUrl: placeholderImage("Meme+3", baseScore),
      memeabilityScore: baseScore,
    },
    {
      caption: `Rival brand reply: "${campaign.slogan}? Really?"`,
      imageUrl: placeholderImage("Meme+4", baseScore + 2),
      memeabilityScore: Math.min(100, baseScore + 2),
    },
  ];
}

function placeholderImage(label: string, score: number): string {
  const text = encodeURIComponent(`${label} (${score})`);
  return `https://placehold.co/512x512/1a1a2e/e94560?text=${text}`;
}

async function generateMemeConcepts(
  campaign: CampaignInput,
  verdicts: AgentVerdict[]
): Promise<MemeConcept[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockMemes(campaign, verdicts).map((m) => ({
      caption: m.caption,
      visualPrompt: `Satirical Bangladeshi social media meme about: ${m.caption}`,
      memeabilityScore: m.memeabilityScore,
    }));
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const attacks = verdicts.map((v) => v.sampleAttack).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `Generate 4 parody meme concepts for this Bangladeshi campaign that could go viral for the WRONG reasons.

Slogan: ${campaign.slogan}
Sample attacks:
${attacks}

Return ONLY JSON array:
[
  {
    "caption": "Banglish meme caption",
    "visualPrompt": "Flux image generation prompt for satirical meme",
    "memeabilityScore": 0-100
  }
]`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === "text");
  const text = block?.type === "text" ? block.text : "[]";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as MemeConcept[];
}

async function generateImage(prompt: string): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) {
    const text = encodeURIComponent("Backfire Meme");
    return `https://placehold.co/512x512/16213e/0f3460?text=${text}`;
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const output = (await replicate.run("black-forest-labs/flux-schnell", {
    input: {
      prompt: `Satirical Bangladeshi social media meme, bold text, viral parody style: ${prompt}`,
      num_outputs: 1,
      aspect_ratio: "1:1",
    },
  })) as string[];

  return output[0] ?? placeholderImage("Flux", 70);
}

export async function generateMemes(
  campaign: CampaignInput,
  verdicts: AgentVerdict[]
): Promise<MemeResult[]> {
  const concepts = await generateMemeConcepts(campaign, verdicts);

  const memes = await Promise.all(
    concepts.slice(0, 4).map(async (concept) => {
      const imageUrl = await generateImage(concept.visualPrompt);
      return {
        caption: concept.caption,
        imageUrl,
        memeabilityScore: Math.max(
          0,
          Math.min(100, Math.round(concept.memeabilityScore))
        ),
      } satisfies MemeResult;
    })
  );

  return memes;
}
