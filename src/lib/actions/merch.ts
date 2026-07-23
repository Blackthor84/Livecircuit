"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { notifyFollowers } from "@/lib/services/notifications.service";
import {
  deleteProductSchema,
  upsertProductSchema,
} from "@/lib/validations/messaging-merch";

export type MerchActionResult = { ok: true; productId?: string } | { ok: false; error: string };

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function ownedArtistId(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("id, slug").eq("user_id", userId).maybeSingle();
  return data;
}

export async function upsertProductAction(input: unknown): Promise<MerchActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  const parsed = upsertProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const artist = await ownedArtistId(user.id);
  if (!artist) return { ok: false, error: "Artist profile required" };

  const supabase = await createClient();
  const d = parsed.data;
  const payload = {
    artist_id: artist.id,
    name: d.name.trim(),
    slug: slugify(d.name),
    description: d.description?.trim() || null,
    price_cents: d.priceCents,
    product_type: d.productType,
    is_digital: d.isDigital ?? d.productType === "digital",
    is_vip_exclusive: d.isVipExclusive ?? false,
    inventory_count: d.inventoryCount ?? null,
    active: d.active ?? true,
  };

  if (d.productId) {
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", d.productId)
      .eq("artist_id", artist.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/artist/merch");
    revalidatePath(`/artists/${artist.slug}/merch`);
    return { ok: true, productId: d.productId };
  }

  let slug = payload.slug || "item";
  for (let i = 0; i < 10; i += 1) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, slug: candidate })
      .select("id")
      .single();
    if (!error && data) {
      await notifyFollowers({
        artistId: artist.id,
        type: "new_merch",
        title: `New merch: ${d.name}`,
        body: "Just dropped in the artist store.",
        link: `/artists/${artist.slug}/merch`,
      });
      revalidatePath("/artist/merch");
      revalidatePath(`/artists/${artist.slug}/merch`);
      return { ok: true, productId: data.id as string };
    }
    if (error?.code !== "23505") return { ok: false, error: error?.message ?? "Insert failed" };
  }

  return { ok: false, error: "Could not allocate product slug" };
}

export async function deleteProductAction(input: unknown): Promise<MerchActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid product" };

  const artist = await ownedArtistId(user.id);
  if (!artist) return { ok: false, error: "Artist profile required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", parsed.data.productId)
    .eq("artist_id", artist.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/artist/merch");
  revalidatePath(`/artists/${artist.slug}/merch`);
  return { ok: true };
}

export async function toggleProductActiveAction(productId: string, active: boolean): Promise<MerchActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const artist = await ownedArtistId(user.id);
  if (!artist) return { ok: false, error: "Artist profile required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", productId)
    .eq("artist_id", artist.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/artist/merch");
  revalidatePath(`/artists/${artist.slug}/merch`);
  return { ok: true, productId };
}
