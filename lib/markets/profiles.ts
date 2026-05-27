/**
 * Per-market cultural-stress profiles.
 *
 * Each market gets its own pool of summaries and trigger archetypes,
 * grounded in that city's specific linguistic, religious, regulatory,
 * class, and political context. Used by `mockStressMap` (and as a
 * grounding source when the LLM is unavailable) so every card on the
 * heat map tells a market-specific story instead of swapping the city
 * name into a generic template.
 *
 * Selection is deterministic — keyed by `hash(slogan + marketId)` —
 * so the same campaign always produces the same result per market,
 * while different campaigns vary the picked variant.
 */

import type { CulturalTrigger } from "@/lib/agents/types";

export interface TriggerArchetype {
  type: "copy" | "visual";
  /** "{slogan}" is replaced with the campaign slogan. */
  textTemplate: string;
  reason: string;
}

export interface MarketProfile {
  /** 1–3 summary lines per severity tier — picked deterministically. */
  summaries: {
    low: string[];
    medium: string[];
    high: string[];
  };
  /** Trigger archetypes — only surfaced when severity >= 40. */
  triggers: TriggerArchetype[];
  /** Optional: slogan-keyword boosts that nudge this market's severity up. */
  hotKeywords?: string[];
}

// ────────────────────────────────────────────────────────────────────
// SOUTH ASIA
// ────────────────────────────────────────────────────────────────────

const SOUTH_ASIA: Record<string, MarketProfile> = {
  dhaka: {
    summaries: {
      high: [
        "Dhaka is the meme-velocity capital — slogan is poised to be hijacked by satire pages within hours.",
        "High Dhaka backlash risk: copy lands in a hyper-online youth audience already primed to mock brand-speak.",
      ],
      medium: [
        "Dhaka friction: Banglish register may read as try-hard or corporate-cringe to Gen-Z timelines.",
        "Moderate Dhaka risk — the meme cycle is fast, and this slogan has a hookable phrase.",
      ],
      low: [
        "Dhaka reads cleanly — copy aligns with metro Banglish norms.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Phrasing is screenshot-ready — Dhaka meme pages will isolate and parody the hook within the first 24h.",
      },
      {
        type: "visual",
        textTemplate: "Polished agency-style hero visual",
        reason: "Over-produced visuals invite mockery from Dhaka's anti-corporate meme accounts (e.g. Trolls Dhaka).",
      },
    ],
    hotKeywords: ["cash", "bkash", "limited", "exclusive", "deal", "premium"],
  },

  chittagong: {
    summaries: {
      high: [
        "Chittagong reads metro-Dhaka condescension — port-city audience expects Chittagonian dialect anchoring.",
        "High CTG risk: campaign feels written for Dhaka and shipped to Chittagong without translation.",
      ],
      medium: [
        "Chittagong friction: Standard Bangla copy may feel imported; Chittagonian/local references are absent.",
      ],
      low: [
        "Chittagong reads fine — no strong regional tripwires detected.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Reads as written-in-Dhaka; Chittagong audiences are sensitive to being treated as an afterthought market.",
      },
      {
        type: "visual",
        textTemplate: "Dhaka skyline or capital-coded imagery",
        reason: "Capital-centric visuals reinforce the perception that brands prioritize Dhaka over the port city.",
      },
    ],
    hotKeywords: ["dhaka", "capital", "national"],
  },

  sylhet: {
    summaries: {
      high: [
        "Sylhet backlash likely — diaspora audience (UK/US prabashi) screens for religious modesty and family framing.",
        "High Sylhet risk: copy collides with the city's stricter religious-cultural register.",
      ],
      medium: [
        "Sylhet friction: tone may feel too secular-metro for the prabashi-influenced audience.",
      ],
      low: [
        "Sylhet reads neutrally — copy is unlikely to trigger diaspora or religious-conservative concern.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Casual or playful framing may read as religiously irreverent in Sylhet's more conservative public sphere.",
      },
      {
        type: "visual",
        textTemplate: "Casual social or party-coded visual",
        reason: "Visuals that imply nightlife/mixed-gender leisure can spark backlash from Sylheti diaspora communities.",
      },
    ],
    hotKeywords: ["party", "night", "cool", "free", "vibe"],
  },

  rural_bd: {
    summaries: {
      high: [
        "Rural Bangladesh comprehension gap: copy assumes urban literacy, smartphone fluency, and digital-finance habits.",
        "High rural risk — campaign reads as written for metro audiences who already have bank accounts.",
      ],
      medium: [
        "Rural friction: English loanwords and digital-first calls-to-action may exclude prepaid/cash-economy users.",
      ],
      low: [
        "Rural Bangladesh: copy is accessible enough for low-literacy and prepaid audiences.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Banglish or English-heavy copy excludes rural agrarian audiences who default to spoken Bangla.",
      },
      {
        type: "visual",
        textTemplate: "Smartphone / app-screen visual",
        reason: "Tech-forward imagery alienates feature-phone users still on cash, MFS agent-cashout flows.",
      },
    ],
    hotKeywords: ["app", "online", "digital", "premium", "exclusive"],
  },

  kolkata: {
    summaries: {
      high: [
        "Kolkata high risk — Bhadralok cultural gatekeepers will dissect the slogan in Bengali op-eds and tweet threads.",
        "Kolkata backlash likely: campaign reads as Bangladeshi-Bangla flavored, which raises hackles around West Bengal Bengali purity debates.",
      ],
      medium: [
        "Kolkata friction: Standard Bengali audiences may flag Banglish or cross-border code-mixing.",
      ],
      low: [
        "Kolkata reads cleanly — no major Bhadralok or cross-border sensitivities triggered.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Banglish or Dhaka-coded Bangla draws sharp pushback from West Bengal language-purist circles.",
      },
      {
        type: "visual",
        textTemplate: "Bangladeshi or East-Bengali coded visual cues",
        reason: "Visual signals associated with Bangladesh (rickshaw art, RMG aesthetic) can polarize Kolkata audiences.",
      },
    ],
    hotKeywords: ["bangla", "bengal", "bkash"],
  },

  mumbai: {
    summaries: {
      high: [
        "Mumbai high risk — Bollywood-adjacent meme machine will spin this into reels within a news cycle.",
        "Mumbai backlash plausible: MNS/regionalist accounts may amplify any Hindi-vs-Marathi mis-step.",
      ],
      medium: [
        "Mumbai friction: copy may register as North Indian / Delhi-coded to Marathi audiences.",
      ],
      low: [
        "Mumbai reads neutrally — copy avoids regional or language-political tripwires.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Hindi-heavy or Delhi-coded phrasing without Marathi acknowledgment risks MNS-style local-language pushback.",
      },
      {
        type: "visual",
        textTemplate: "Aspirational urban-elite casting",
        reason: "South-Bombay-only casting amplifies the city's well-documented class-divide critique on Mumbai Twitter.",
      },
    ],
    hotKeywords: ["hindi", "premium", "luxury", "exclusive", "rich"],
  },

  delhi: {
    summaries: {
      high: [
        "Delhi high risk — political-capital audience scrutinizes brand-government adjacency and Hindi/Urdu balance.",
        "Delhi backlash plausible: copy may be read through a partisan lens given the city's politically saturated discourse.",
      ],
      medium: [
        "Delhi friction: tone may feel performatively secular or accidentally partisan to NCR audiences.",
      ],
      low: [
        "Delhi reads cleanly — copy avoids political-capital partisanship.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Phrasing risks accidental Hindutva or anti-Hindutva read in Delhi's politically primed feed culture.",
      },
      {
        type: "visual",
        textTemplate: "Aspirational lifestyle visual",
        reason: "Delhi's wide income gap means aspirational visuals trigger 'who is this even for' commentary.",
      },
    ],
    hotKeywords: ["national", "patriot", "indian", "free"],
  },

  karachi: {
    summaries: {
      high: [
        "Karachi high risk — campaign collides with Pakistan's inflation/currency crisis tone, reads as insensitive.",
        "Karachi backlash likely: Banglish-coded copy registers as foreign in a Urdu/Sindhi/Mohajir-balanced city.",
      ],
      medium: [
        "Karachi friction: Urdu register absent; copy may feel cross-border or geopolitically tone-deaf.",
      ],
      low: [
        "Karachi reads neutrally — minor Urdu-register tuning could land harder.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Price-discount or scarcity messaging is radioactive in Karachi amid the ongoing inflation crisis.",
      },
      {
        type: "visual",
        textTemplate: "Affluent or import-coded visual",
        reason: "Imported-lifestyle imagery is sharply class-resented in Karachi's polarized economic moment.",
      },
    ],
    hotKeywords: ["price", "discount", "save", "cheap", "deal", "limited", "stock"],
  },

  lahore: {
    summaries: {
      high: [
        "Lahore high risk — Punjabi cultural-pride audience expects local-language anchoring; Urdu-only feels imported.",
        "Lahore backlash plausible: copy may be read as religiously irreverent in a city where religious conservatism remains mainstream.",
      ],
      medium: [
        "Lahore friction: tone may feel metro-Karachi or Westernized to Punjabi-first audiences.",
      ],
      low: [
        "Lahore reads cleanly — no major Punjabi-cultural or religious tripwires.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Absence of Punjabi linguistic warmth reads as 'corporate Urdu' to Lahore's culturally proud audiences.",
      },
      {
        type: "visual",
        textTemplate: "Mixed-gender or party-coded visual",
        reason: "Lahore's religious-conservative segment will surface and clip such visuals on social platforms.",
      },
    ],
    hotKeywords: ["urdu", "premium", "exclusive"],
  },

  colombo: {
    summaries: {
      high: [
        "Colombo high risk — post-crisis economic sensitivity makes price-positive messaging feel tone-deaf.",
        "Colombo backlash likely: copy must navigate Sinhala-Tamil-Muslim communal balance, currently absent.",
      ],
      medium: [
        "Colombo friction: English-elite tone alienates Sinhala/Tamil-first audiences still recovering from the crisis.",
      ],
      low: [
        "Colombo reads neutrally — no major communal or post-crisis economic sensitivities triggered.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Aspirational/scarcity copy lands poorly in Sri Lanka's post-Aragalaya economic fatigue.",
      },
      {
        type: "visual",
        textTemplate: "Single-community casting",
        reason: "Casting that reads as exclusively Sinhala (or exclusively Tamil) re-opens communal sensitivity online.",
      },
    ],
    hotKeywords: ["luxury", "imported", "exclusive", "cash"],
  },
};

// ────────────────────────────────────────────────────────────────────
// MENA
// ────────────────────────────────────────────────────────────────────

const MENA: Record<string, MarketProfile> = {
  dubai: {
    summaries: {
      high: [
        "Dubai high risk — UAE state-narrative adjacency is unavoidable; copy must not contradict government messaging.",
        "Dubai backlash plausible: expat audience tolerates more, but UAE regulators do not — content flagging is fast.",
      ],
      medium: [
        "Dubai friction: tone may collide with UAE Vision branding or appear politically casual.",
      ],
      low: [
        "Dubai reads cleanly — copy aligns with the expat-multinational comfort zone.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Geopolitically-tinged or politically casual phrasing risks UAE regulatory takedown notices.",
      },
      {
        type: "visual",
        textTemplate: "Mixed-gender leisure visual",
        reason: "Public-display-of-affection-adjacent imagery still triggers UAE moderation review even in Dubai.",
      },
    ],
    hotKeywords: ["free", "political", "limited"],
  },

  riyadh: {
    summaries: {
      high: [
        "Riyadh high risk — copy clashes with Vision 2030's curated modernity-with-modesty positioning.",
        "Riyadh backlash plausible: Wahhabi-traditional segment and reformist segment both surveil brand tone.",
      ],
      medium: [
        "Riyadh friction: tone may feel too casual or too Western for the Vision 2030 'authentic but modern' line.",
      ],
      low: [
        "Riyadh reads cleanly — copy avoids modesty and political-narrative tripwires.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Casual gendered framing or playful tone risks Hai'a-era social pushback even in reformist Riyadh.",
      },
      {
        type: "visual",
        textTemplate: "Women in non-modest framing",
        reason: "Visual modesty thresholds in Riyadh remain strict despite Vision 2030 social opening.",
      },
    ],
    hotKeywords: ["party", "night", "free", "modern"],
  },

  cairo: {
    summaries: {
      high: [
        "Cairo high risk — Egyptian Arabic satire culture (سخرية) will lampoon the copy within hours on TikTok and X.",
        "Cairo backlash plausible: pound-devaluation sensitivity makes any price/discount framing read as cruel.",
      ],
      medium: [
        "Cairo friction: MSA-only copy lacks Egyptian Arabic warmth; meme accounts will note the distance.",
      ],
      low: [
        "Cairo reads neutrally — copy avoids inflation-era price triggers and Egyptian satire bait.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Pound-devaluation context makes 'limited time' and 'price' framing feel exploitative in Cairo.",
      },
      {
        type: "visual",
        textTemplate: "Aspirational consumption visual",
        reason: "High-consumption imagery clashes with Cairo's subsidy-cut, cost-of-living-led discourse.",
      },
    ],
    hotKeywords: ["price", "save", "deal", "limited", "stock", "hurry"],
  },

  istanbul: {
    summaries: {
      high: [
        "Istanbul high risk — secular-religious cultural fault line makes any tonal choice politically legible.",
        "Istanbul backlash plausible: lira volatility makes price-positive copy feel exploitative.",
      ],
      medium: [
        "Istanbul friction: tone may align with one side of the secular/AKP axis and alienate the other.",
      ],
      low: [
        "Istanbul reads cleanly — copy avoids secular-religious and currency-crisis triggers.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Phrasing risks accidental alignment with secular/AKP discourse in a polarized Istanbul feed.",
      },
      {
        type: "visual",
        textTemplate: "Politically coded styling",
        reason: "Hijab inclusion/exclusion in Istanbul casting reads as a political statement either way.",
      },
    ],
    hotKeywords: ["lira", "price", "deal", "free"],
  },

  casablanca: {
    summaries: {
      high: [
        "Casablanca high risk — French-only copy excludes Darija-first audiences and reads as colonial-coded.",
        "Casablanca backlash plausible: monarchy-adjacent topics or perceived irreverence draw quick rebuke.",
      ],
      medium: [
        "Casablanca friction: copy needs Darija warmth to avoid feeling like an imported French campaign.",
      ],
      low: [
        "Casablanca reads cleanly — no major Maghreb-identity or language-political tripwires.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "French-only register reads as colonial-elite; Darija anchoring is the local-credibility test.",
      },
      {
        type: "visual",
        textTemplate: "Westernized lifestyle visual",
        reason: "Pure Westernized imagery alienates the Maghreb-identity segment that drives local virality.",
      },
    ],
    hotKeywords: ["luxury", "premium", "exclusive"],
  },
};

// ────────────────────────────────────────────────────────────────────
// SOUTHEAST ASIA
// ────────────────────────────────────────────────────────────────────

const SEA: Record<string, MarketProfile> = {
  jakarta: {
    summaries: {
      high: [
        "Jakarta high risk — Halal/MUI sensitivity is mainstream; copy must pass an Islamic-comfort sniff test.",
        "Jakarta backlash plausible: anti-foreign-brand sentiment can surface fast when copy feels imported.",
      ],
      medium: [
        "Jakarta friction: Bahasa Indonesia warmth absent; English-heavy copy feels like an outsider campaign.",
      ],
      low: [
        "Jakarta reads cleanly — no Halal, language, or anti-foreign tripwires triggered.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "English-dominant phrasing flags as 'colonial corporate' to Indonesia-first meme accounts.",
      },
      {
        type: "visual",
        textTemplate: "Non-Halal-aligned visual signals",
        reason: "Pork-adjacent, alcohol-adjacent, or modesty-violating imagery triggers MUI-aligned backlash.",
      },
    ],
    hotKeywords: ["bacon", "beer", "western", "imported", "premium"],
  },

  bangkok: {
    summaries: {
      high: [
        "Bangkok high risk — Thai politeness norms (kreng jai) make brash or scarcity copy land as rude.",
        "Bangkok backlash plausible: any monarchy-adjacent reading triggers lèse-majesté self-censorship and brand abandonment.",
      ],
      medium: [
        "Bangkok friction: copy may register as too direct or too Western for Thai social-media tone.",
      ],
      low: [
        "Bangkok reads cleanly — copy respects Thai politeness and monarchy-adjacent caution.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Direct or pressure-laden phrasing violates the kreng jai politeness norm Thai audiences expect.",
      },
      {
        type: "visual",
        textTemplate: "Royal-color or monarchy-adjacent visual",
        reason: "Yellow/blue color symbolism and any royal-adjacent imagery triggers lèse-majesté caution in Bangkok.",
      },
    ],
    hotKeywords: ["king", "yellow", "royal", "hurry", "now"],
  },

  manila: {
    summaries: {
      high: [
        "Manila high risk — OFW-family framing is the dominant emotional lens; tone-deaf copy gets called out.",
        "Manila backlash plausible: Catholic-conservative segment and progressive segment both have powerful meme machines.",
      ],
      medium: [
        "Manila friction: Taglish balance is off — copy reads as too English or too Tagalog without warmth.",
      ],
      low: [
        "Manila reads cleanly — copy navigates Taglish and OFW emotional context well.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Copy ignores the OFW/balikbayan emotional register that dominates Philippine consumer messaging.",
      },
      {
        type: "visual",
        textTemplate: "Lifestyle visual without family/community signal",
        reason: "Family-absent visuals feel cold in Manila's family-first social-media culture.",
      },
    ],
    hotKeywords: ["family", "ofw", "balikbayan", "save"],
  },

  ho_chi_minh: {
    summaries: {
      high: [
        "HCMC high risk — foreign-brand scrutiny is intense; copy must show genuine local grounding.",
        "HCMC backlash plausible: Communist Party messaging adjacency means political tonal caution is mandatory.",
      ],
      medium: [
        "HCMC friction: Northern-Vietnamese phrasing or Hanoi-coded tone alienates Southern audiences.",
      ],
      low: [
        "HCMC reads cleanly — copy avoids political and North-South dialect tripwires.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Phrasing risks reading as Hanoi-coded or politically loaded in HCMC's southern-dialect feed.",
      },
      {
        type: "visual",
        textTemplate: "Imported Western lifestyle visual",
        reason: "Western-imported imagery without Vietnamese cultural anchoring triggers anti-foreign-brand commentary.",
      },
    ],
    hotKeywords: ["western", "imported", "exclusive", "premium"],
  },

  kuala_lumpur: {
    summaries: {
      high: [
        "KL high risk — Bumi/Chinese/Indian race-politics make any single-community casting flammable.",
        "KL backlash plausible: Halal certification expectations are now table stakes; absence reads as exclusion.",
      ],
      medium: [
        "KL friction: tone may land as a single-race campaign in Malaysia's 3-community social media.",
      ],
      low: [
        "KL reads cleanly — copy navigates Bumi/Chinese/Indian balance and Halal expectations.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Phrasing risks reading as racially-coded in KL's hair-trigger Bumi/Chinese/Indian online discourse.",
      },
      {
        type: "visual",
        textTemplate: "Single-community casting",
        reason: "Mono-community casting in KL invites accusations of racial exclusion across all three communities.",
      },
    ],
    hotKeywords: ["bumi", "chinese", "indian", "halal", "ringgit"],
  },

  singapore: {
    summaries: {
      high: [
        "Singapore high risk — multiracial harmony rules are state-enforced; tonal mis-steps trigger POFMA-era pile-ons.",
        "Singapore backlash plausible: government-tone expectation is unusually high — copy must read as civically responsible.",
      ],
      medium: [
        "Singapore friction: copy may read as too informal or too foreign for SG's curated-civic register.",
      ],
      low: [
        "Singapore reads cleanly — copy aligns with multiracial-harmony and civic-tone expectations.",
      ],
    },
    triggers: [
      {
        type: "copy",
        textTemplate: "{slogan}",
        reason: "Tonal informality or perceived racial coding triggers Singapore's POFMA-era heightened civic scrutiny.",
      },
      {
        type: "visual",
        textTemplate: "Mono-ethnic casting",
        reason: "Singapore expects 'CMIO' (Chinese-Malay-Indian-Other) visual balance; mono-casting is conspicuous.",
      },
    ],
    hotKeywords: ["race", "free", "imported", "exclusive"],
  },
};

// ────────────────────────────────────────────────────────────────────
// Combined catalog
// ────────────────────────────────────────────────────────────────────

export const MARKET_PROFILES: Record<string, MarketProfile> = {
  ...SOUTH_ASIA,
  ...MENA,
  ...SEA,
};

/** Deterministic 32-bit hash — used to pick variants per (slogan, marketId). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function pickVariant<T>(arr: T[], seed: number): T {
  if (arr.length === 0) throw new Error("pickVariant: empty array");
  return arr[seed % arr.length];
}

/**
 * Build the trigger list for a market, deterministically picking which
 * archetypes apply given severity, visual presence, and seed.
 */
export function buildMarketTriggers(
  profile: MarketProfile,
  opts: {
    slogan: string;
    severity: number;
    hasVisual: boolean;
    seed: number;
  }
): CulturalTrigger[] {
  if (opts.severity < 40) return [];

  const triggers: CulturalTrigger[] = [];
  // Always include the first copy trigger we find, customized with the slogan.
  const copyArchs = profile.triggers.filter((t) => t.type === "copy");
  const visualArchs = profile.triggers.filter((t) => t.type === "visual");

  if (copyArchs.length > 0) {
    const pick = pickVariant(copyArchs, opts.seed);
    triggers.push({
      type: "copy",
      text: pick.textTemplate.replace("{slogan}", opts.slogan),
      reason: pick.reason,
    });
  }

  // Visual trigger only when there's a real visual AND severity is meaningful.
  if (opts.hasVisual && opts.severity >= 55 && visualArchs.length > 0) {
    const pick = pickVariant(visualArchs, opts.seed >> 3);
    triggers.push({
      type: "visual",
      text: pick.textTemplate.replace("{slogan}", opts.slogan),
      reason: pick.reason,
    });
  }

  // For very high severity, add a second copy trigger if available.
  if (opts.severity >= 75 && copyArchs.length > 1) {
    const second = copyArchs[(opts.seed >> 5) % copyArchs.length];
    if (second && second !== copyArchs[opts.seed % copyArchs.length]) {
      triggers.push({
        type: "copy",
        text: second.textTemplate.replace("{slogan}", opts.slogan),
        reason: second.reason,
      });
    }
  }

  return triggers;
}
