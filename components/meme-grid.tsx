import type { MemeResult } from "@/lib/agents/types";
import Image from "next/image";

export function MemeGrid({ memes }: { memes: MemeResult[] }) {
  return (
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
          </div>
          <div className="p-4">
            <p className="text-sm text-white">{meme.caption}</p>
            <p className="mt-2 text-xs text-red-300">
              Memeability: {meme.memeabilityScore}/100
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
