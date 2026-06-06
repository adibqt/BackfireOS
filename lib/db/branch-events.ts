import type { SupabaseClient } from "@supabase/supabase-js";
import type { BranchEvent, BranchEventType } from "@/lib/branches/types";

const TABLE = "branch_events";

export interface EventCreate {
  id: string;
  campaignId: string | null;
  branchId: string | null;
  type: BranchEventType;
  message: string;
  ts: number;
}

type DbEvent = {
  id: string;
  branch_id: string | null;
  type: BranchEventType;
  message: string;
  created_at: string;
};

function mapEvent(row: DbEvent): BranchEvent {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    ts: new Date(row.created_at).getTime(),
    branchId: row.branch_id,
  };
}

export async function dbListEvents(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string | null,
  limit = 100
): Promise<BranchEvent[]> {
  let query = supabase
    .from(TABLE)
    .select("id, branch_id, type, message, created_at")
    .eq("user_id", userId);
  query = campaignId === null
    ? query.is("campaign_id", null)
    : query.eq("campaign_id", campaignId);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as DbEvent[] | null)?.map(mapEvent) ?? [];
}

export async function dbInsertEvent(
  supabase: SupabaseClient,
  userId: string,
  event: EventCreate
): Promise<BranchEvent> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: event.id,
      user_id: userId,
      campaign_id: event.campaignId,
      branch_id: event.branchId,
      type: event.type,
      message: event.message,
      created_at: new Date(event.ts).toISOString(),
    })
    .select("id, branch_id, type, message, created_at")
    .single();

  if (error) throw new Error(error.message);
  return mapEvent(data as DbEvent);
}
