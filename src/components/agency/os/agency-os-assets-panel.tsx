"use client";

import { useState, useTransition } from "react";
import { BookOpen, FolderOpen, Image } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAgencyAssetAction } from "@/lib/actions/agency-business-os";
import type { AgencyAssetsPayload } from "@/lib/agency/business-os-types";

const ASSET_CATEGORIES = ["photos", "logos", "videos", "press_kits", "media_kits", "sponsor_assets", "brand_guidelines", "contracts", "invoices", "social_graphics"] as const;

export function AgencyOsAssetsPanel({ orgId, data }: { orgId: string; data: AgencyAssetsPayload }) {
  const [search, setSearch] = useState("");

  const filteredAssets = data.assets.filter((a) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Tabs defaultValue="library" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
        {["library", "knowledge"].map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize data-[state=active]:bg-primary/15 data-[state=active]:text-primary">{t === "knowledge" ? "Knowledge base" : t}</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="library" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search assets, tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>
        <UploadAssetForm orgId={orgId} />
        {data.folders.length ? (
          <div className="flex flex-wrap gap-2">
            {data.folders.map((f) => (
              <Badge key={f.id} variant="secondary" className="gap-1"><FolderOpen className="size-3" /> {f.name}</Badge>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.length ? filteredAssets.map((a) => (
            <Card key={a.id} className="glass-panel border-white/10">
              <CardContent className="pt-6">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Image className="size-5 text-primary" />
                </div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{a.category.replace(/_/g, " ")}</p>
                {a.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )) : (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">Store artist photos, press kits, sponsor assets, and brand guidelines in one library.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="knowledge" className="grid gap-4 md:grid-cols-2">
        {data.articles.map((article) => (
          <Card key={article.id} className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" /> {article.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="capitalize">{article.category}</Badge>
              <p className="mt-2 text-xs text-muted-foreground">Updated {new Date(article.updated_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}

function UploadAssetForm({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>("photos");
  return (
    <form className="glass-panel flex flex-wrap gap-2 rounded-xl border border-white/10 p-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get("name"));
      startTransition(async () => {
        const r = await createAgencyAssetAction({
          orgId, name, category,
          storagePath: `agency/${orgId}/${Date.now()}-${name.replace(/\s+/g, "-").toLowerCase()}`,
          tags: String(fd.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean),
        });
        if (!r.ok) toast.error(r.error); else { toast.success("Asset registered"); e.currentTarget.reset(); }
      });
    }}>
      <Input name="name" placeholder="Asset name" required className="min-w-[140px] flex-1" />
      <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm capitalize" value={category} onChange={(e) => setCategory(e.target.value)}>
        {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
      </select>
      <Input name="tags" placeholder="Tags (comma-separated)" className="min-w-[160px]" />
      <Button type="submit" size="sm" disabled={pending}>Add asset</Button>
    </form>
  );
}
