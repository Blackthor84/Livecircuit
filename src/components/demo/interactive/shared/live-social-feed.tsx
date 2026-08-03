"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Heart, MessageCircle, Share2 } from "lucide-react";
import { FEED_TEMPLATES, INITIAL_FEED } from "@/lib/demo/interactive/data";
import type { DemoFeedItem } from "@/lib/demo/interactive/types";
import { cn } from "@/lib/utils";

function FeedCard({ item }: { item: DemoFeedItem }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-panel rounded-xl p-4"
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-xs font-bold">
          {item.authorAvatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{item.author}</span>
            {item.verified ? <BadgeCheck className="size-3.5 text-primary" /> : null}
            <span className="text-xs text-muted-foreground">{item.timestamp}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>
          {item.hashtag ? (
            <span className="mt-1 inline-block text-xs font-medium text-primary">{item.hashtag}</span>
          ) : null}
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="size-3" /> {item.likes.toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {item.comments}</span>
            <span className="flex items-center gap-1"><Share2 className="size-3" /> {item.shares}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveSocialFeed({ className, maxItems = 5 }: { className?: string; maxItems?: number }) {
  const [items, setItems] = useState(INITIAL_FEED.slice(0, maxItems));

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      const template = FEED_TEMPLATES[i % FEED_TEMPLATES.length]!;
      const newItem: DemoFeedItem = {
        ...template,
        id: `live-${Date.now()}`,
        timestamp: "just now",
        likes: template.likes + Math.floor(Math.random() * 200),
      };
      setItems((prev) => [newItem, ...prev.slice(0, maxItems - 1)]);
      i++;
    }, 4500);
    return () => clearInterval(interval);
  }, [maxItems]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <h3 className="text-sm font-semibold">Live Community Feed</h3>
      </div>
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
