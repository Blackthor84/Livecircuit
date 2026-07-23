import type { Metadata } from "next";
import { SearchForm } from "@/components/search/search-form";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Search</h1>
      <p className="mt-2 text-muted-foreground">Artists, genres, cities, and live events.</p>
      <div className="mt-8">
        <SearchForm />
      </div>
    </div>
  );
}
