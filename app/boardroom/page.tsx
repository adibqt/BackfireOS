import { BoardroomMode } from "@/components/boardroom-mode";
import { BoardroomAd } from "@/components/boardroom-ad";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";

/**
 * Boardroom is a member surface. When auth is configured and the visitor is
 * logged out, show the advertisement / sign-in wall instead of the live room.
 * With no auth backend (local / demo builds) the room stays open so the feature
 * remains reachable.
 */
export default async function BoardroomPage() {
  if (isSupabaseAuthConfigured()) {
    const user = await getUser();
    if (!user) return <BoardroomAd />;
  }
  return <BoardroomMode />;
}
