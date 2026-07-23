"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  deleteProductAction,
  toggleProductActiveAction,
  upsertProductAction,
} from "@/lib/actions/merch";
import { formatCents } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  product_type: string;
  is_digital: boolean;
  is_vip_exclusive: boolean;
  inventory_count: number | null;
  active: boolean;
};

export function ArtistMerchManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("25");
  const [digital, setDigital] = useState(false);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cents = Math.round(parseFloat(priceDollars || "0") * 100);
    const result = await upsertProductAction({
      name,
      description,
      priceCents: cents,
      productType: digital ? "digital" : "physical",
      isDigital: digital,
    });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Product saved");
      setName("");
      setDescription("");
      router.refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const result = await deleteProductAction({ productId: id });
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    const result = await toggleProductActiveAction(id, active);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={createProduct} className="glass-panel space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-semibold">Add product</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Switch id="digital" checked={digital} onCheckedChange={setDigital} />
            <Label htmlFor="digital">Digital download</Label>
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Publish product"}
        </Button>
      </form>

      <div>
        <h2 className="text-lg font-semibold">Your products</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No merch listed yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {p.name}{" "}
                    {!p.active ? (
                      <span className="text-xs text-muted-foreground">(hidden)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCents(p.price_cents)} · {p.product_type}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleActive(p.id, !p.active)}
                  >
                    {p.active ? "Hide" : "Show"}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => void remove(p.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
