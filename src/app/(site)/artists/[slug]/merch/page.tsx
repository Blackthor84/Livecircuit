import type { Metadata } from "next";

import Image from "next/image";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getArtistProducts } from "@/lib/data/queries";

import { formatCents } from "@/lib/format";



export const metadata: Metadata = { title: "Merch" };



const demoProducts: { id: string; name: string; price_cents: number; image_url?: string | null }[] = [

  { id: "demo-tee", name: "Tour Tee", price_cents: 3500 },

  { id: "demo-poster", name: "Signed poster", price_cents: 4500 },

  { id: "demo-album", name: "Digital album", price_cents: 1200 },

];



type Props = { params: Promise<{ slug: string }> };



export default async function MerchPage({ params }: Props) {

  const { slug } = await params;

  const dbProducts = await getArtistProducts(slug);

  const products =

    dbProducts && dbProducts.length > 0

      ? dbProducts.map((p) => ({

          id: p.id as string,

          name: p.name as string,

          price_cents: p.price_cents as number,

          image_url: ((p.image_urls as string[] | null)?.[0] ?? null) as string | null,

        }))

      : demoProducts;



  return (

    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

      <h1 className="text-3xl font-bold">Merch</h1>

      <p className="mt-2 capitalize text-muted-foreground">{slug.replace(/-/g, " ")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">

        {products.map((p) => (

          <Card key={p.id} className="glass-panel border-white/10">

            <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-accent/10">

              {"image_url" in p && p.image_url ? (

                <Image src={p.image_url} alt="" fill className="object-cover" />

              ) : null}

            </div>

            <CardHeader>

              <CardTitle>{p.name}</CardTitle>

            </CardHeader>

            <CardContent>

              <Button className="w-full" href={`/checkout?type=merch&product=${p.id}`}>

                {formatCents(p.price_cents)}

              </Button>

            </CardContent>

          </Card>

        ))}

      </div>

    </div>

  );

}

