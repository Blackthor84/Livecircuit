"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/lib/demo/naming-rights-data";
import { getBrandTheme } from "@/lib/demo/naming-rights-utils";

export function CustomizeVenueStep() {
  const { form, updateForm, displayCompany, arenaName, theme } = useSponsorVisualizer();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const baseTheme = getBrandTheme(displayCompany);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateForm({ logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <FadeUp className="glass-panel space-y-5 rounded-2xl p-6 sm:p-8">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={form.companyName}
              onChange={(e) => updateForm({ companyName: e.target.value })}
              className="h-12"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => v && updateForm({ industry: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => updateForm({ website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan</Label>
            <Input
              id="slogan"
              value={form.slogan}
              onChange={(e) => updateForm({ slogan: e.target.value })}
              placeholder="Powering live entertainment"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary">Primary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={form.primaryColor || "#6366f1"}
                  onChange={(e) => updateForm({ primaryColor: e.target.value })}
                  className="h-11 w-14 cursor-pointer p-1"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => updateForm({ primaryColor: e.target.value })}
                  placeholder={baseTheme.primary}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary">Secondary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary"
                  type="color"
                  value={form.secondaryColor || "#8b5cf6"}
                  onChange={(e) => updateForm({ secondaryColor: e.target.value })}
                  className="h-11 w-14 cursor-pointer p-1"
                />
                <Input
                  value={form.secondaryColor}
                  onChange={(e) => updateForm({ secondaryColor: e.target.value })}
                  placeholder={baseTheme.secondary}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo Upload</Label>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
              <Upload className="size-4" />
              Upload Logo
            </Button>
          </div>
        </FadeUp>
        <FadeUp delay={0.1} className="glass-panel flex flex-col items-center rounded-2xl p-6 text-center">
          <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="xl" className="mt-4" />
          <p className="mt-6 text-lg font-bold">{displayCompany}</p>
          <p className="mt-1 text-sm text-primary">{arenaName}</p>
          {form.slogan ? <p className="mt-3 text-xs italic text-muted-foreground">{form.slogan}</p> : null}
        </FadeUp>
      </div>
    </div>
  );
}
