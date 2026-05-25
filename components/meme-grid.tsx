import type { MemeResult } from "@/lib/agents/types";
import Image from "next/image";

export function MemeGrid({
  memes,
  imageWarning,
}: {
  memes: MemeResult[];
  imageWarning?: string;
}) {
  return (
    <div className="space-y-4">
      {imageWarning && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {imageWarning}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
      {memes.map((meme, index) => (
        <div
          key={`${meme.caption}-${index}`}
          className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/70"
        >
          <div className="relative aspect-square bg-zinc-800">
            <Image
              src={meme.imageUrl}
              alt={meme.caption}
              fill
              unoptimized
              className="object-cover"
            />
            {!meme.imageFallback && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-10">
                <p className="text-center text-sm font-semibold leading-snug text-white drop-shadow">
                  {meme.caption}
                </p>
              </div>
            )}
          </div>
          <div className="p-4">
            {meme.imageFallback && (
              <p className="text-sm text-white">{meme.caption}</p>
            )}
            <p className="mt-2 text-xs text-red-300">
              Memeability: {meme.memeabilityScore}/100
            </p>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
