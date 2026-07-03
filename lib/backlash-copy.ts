import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function polarizationSpreadNote(
  locale: Locale,
  coefficient: number
): string {
  if (coefficient >= 25) {
    return locale === "bn"
      ? "সমালোচকরা একসাথে অনেক দিক থেকে আক্রমণ করছে — একটি সংশোধন যথেষ্ট নয়।"
      : "Critics are attacking from many unrelated directions at once. No single fix will neutralize the risk — this campaign needs a broad rethink.";
  }
  if (coefficient >= 12) {
    return locale === "bn"
      ? "কিছু সমালোচক একই চাপের বিন্দু শেয়ার করে — ওভারল্যাপিং ইস্যুগুলো আগে ঠিক করুন।"
      : "Some critics share the same pressure points, but others are coming from different angles. Prioritise the overlapping issues first.";
  }
  return locale === "bn"
    ? "সব সমালোচক একই দুর্বলতায় লক্ষ্য করছে — একটি লক্ষ্যবস্তু সংশোধন বেশিরভাগ ঝুঁকি কমাতে পারে।"
    : "All your critics are zeroing in on the same weakness. That's actually good news — one targeted fix could address most of the risk.";
}

export function networkDetailsIntro(locale: Locale): string {
  return locale === "bn"
    ? "সমালোচকদের মধ্যে রেখাগুলো দেখায় ক্যাম্পেইন কোথায় সবচেয়ে ঝুঁকিপূর্ণ। একটি কঠিন রেখা মানে দুই সমালোচক একই সাংস্কৃতিক ট্রিগার উল্লেখ করেছে। একটি ড্যাশ রেখা মানে তাদের তীব্রতা স্কোর কাছাকাছি — একজন সক্রিয় হলে অন্যজনও সম্ভবত সক্রিয় হবে।"
    : "The lines between critics show where your campaign is most exposed. A solid line means two critics referenced the exact same cultural flashpoint — a shared trigger that can set both off simultaneously. A dashed line means their severity scores are close, so a news cycle that activates one will likely activate the other too.";
}

export function spreadScoreLabel(locale: Locale): string {
  return locale === "bn"
    ? "সমালোচনা কত ছড়িয়ে?"
    : "How spread out is the criticism?";
}

export function spreadScoreHint(locale: Locale): string {
  return locale === "bn"
    ? "(০ = সবাই একমত · ৫০+ = সর্বদিক ছড়িয়ে)"
    : "(0 = everyone agrees · 50+ = all over the place)";
}

export function pileOnHeading(locale: Locale): string {
  return locale === "bn"
    ? "একসাথে পাইল অন করার সম্ভাবনা"
    : "Most likely to pile on together";
}

export function pileOnSub(locale: Locale): string {
  return locale === "bn"
    ? "এদের একজন ট্রিগার হলে অন্যজনও সম্ভবত ট্রিগার হবে।"
    : "If one of these critics gets triggered, the other probably will too.";
}

export function lineLegendHeading(locale: Locale): string {
  return locale === "bn" ? "রেখার অর্থ" : "What the lines mean";
}

export function solidLineLegend(locale: Locale): string {
  return locale === "bn"
    ? "একই সাংস্কৃতিক ট্রিগার — দুই সমালোচক"
    : "Same cultural flashpoint triggered both critics";
}

export function dashedLineLegend(locale: Locale): string {
  return locale === "bn"
    ? "অনুরূপ তীব্রতা — একসাথে ট্রেন্ড করতে পারে"
    : "Similar severity — likely to trend together";
}

export function sameTriggerLabel(locale: Locale): string {
  return locale === "bn" ? "একই ট্রিগার" : "same trigger";
}

export function similarSeverityLabel(locale: Locale): string {
  return locale === "bn" ? "অনুরূপ তীব্রতা" : "similar severity";
}

export function citationPairNote(locale: Locale): string {
  return locale === "bn"
    ? "উভয় সমালোচক ডেটাসেট থেকে একই সাংস্কৃতিক উদাহরণ উল্লেখ করেছে।"
    : "Both critics referenced the same cultural example from the dataset.";
}

export function severityPairNote(locale: Locale): string {
  return locale === "bn"
    ? "তাদের ঝুঁকি স্কোর কাছাকাছি — একজনকে বাড়ালে অন্যজনও বাড়তে পারে।"
    : "Their risk scores are close — a news cycle that amplifies one will likely amplify the other.";
}

export function mapDetailsSummary(
  locale: Locale,
  marketCount: number,
  flaggedCount: number
): string {
  return `${marketCount} ${t(locale, "marketsAnalyzed")} · ${flaggedCount} ${t(locale, "marketsFlagged")}`;
}
