"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquare, Megaphone, Star, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenueFollowButton } from "@/components/venues/venue-follow-button";
import {
  createVenuePostAction,
  upsertVenueReviewAction,
} from "@/lib/actions/venue-community";
import type { VenueCommunityPageData, VenueCommunityPost } from "@/lib/data/venue-community";
import type { VenueLoyaltyPageData } from "@/lib/data/venue-loyalty";
import { VenueLoyaltyPanel } from "@/components/venues/venue-loyalty-panel";
import { cn } from "@/lib/utils";

const kindLabels: Record<VenueCommunityPost["kind"], string> = {
  discussion: "Discussion",
  achievement: "Achievement",
  ranking: "Ranking",
};

export function VenueCommunityExperience({
  data,
  loyalty,
  userSignedIn,
}: {
  data: VenueCommunityPageData;
  loyalty: VenueLoyaltyPageData;
  userSignedIn: boolean;
}) {
  const router = useRouter();
  const [postSaving, setPostSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);

  async function submitPost(formData: FormData) {
    setPostSaving(true);
    const result = await createVenuePostAction({
      venueId: data.venue.id,
      title: formData.get("title"),
      body: formData.get("body"),
    });
    setPostSaving(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Posted to the community");
      router.refresh();
    }
  }

  async function submitReview(formData: FormData) {
    setReviewSaving(true);
    const result = await upsertVenueReviewAction({
      venueId: data.venue.id,
      rating: formData.get("rating"),
      body: formData.get("body"),
    });
    setReviewSaving(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(data.userReview ? "Review updated" : "Review submitted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">
            Venue community
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.venue.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" />
              {data.venue.follower_count.toLocaleString()} followers
            </span>
            <span>·</span>
            <span>{data.venue.region}</span>
            {data.reviewSummary.count > 0 ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-primary text-primary" />
                  {data.reviewSummary.average.toFixed(1)} ({data.reviewSummary.count} reviews)
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <VenueFollowButton
            venueId={data.venue.id}
            initialFollowing={data.following}
            disabled={!userSignedIn}
          />
          <Button variant="outline" href={`/livecircuit/venues/${data.venue.slug}`}>
            Venue overview
          </Button>
        </div>
      </header>

      {data.announcements.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Megaphone className="size-5 text-primary" />
            Announcements
          </h2>
          {data.announcements.map((a) => (
            <div key={a.id} className="glass-panel rounded-xl border border-primary/20 p-4">
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(a.published_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <Tabs defaultValue="discussions">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
      </TabsList>

        <TabsContent value="discussions" className="mt-6 space-y-6">
          {userSignedIn ? (
            <form
              action={(fd) => void submitPost(fd)}
              className="glass-panel grid gap-3 rounded-xl p-6"
            >
              <p className="flex items-center gap-2 font-medium">
                <MessageSquare className="size-4" />
                Start a discussion
              </p>
              <div className="space-y-2">
                <Label htmlFor="post-title">Title (optional)</Label>
                <Input id="post-title" name="title" maxLength={200} placeholder="Show night recap…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-body">Message</Label>
                <textarea
                  id="post-body"
                  name="body"
                  required
                  maxLength={5000}
                  rows={4}
                  placeholder="Share tips, meetup plans, or favorite moments at this venue."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button type="submit" disabled={postSaving} className="w-fit">
                {postSaving ? "Posting…" : "Post"}
              </Button>
            </form>
          ) : (
            <p className="glass-panel rounded-xl p-4 text-sm text-muted-foreground">
              <Button variant="link" className="h-auto p-0" href="/login">
                Sign in
              </Button>{" "}
              to join discussions and follow this venue.
            </p>
          )}

          <PostFeed posts={data.posts} total={data.postsTotal} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6 space-y-6">
          {userSignedIn ? (
            <form
              action={(fd) => void submitReview(fd)}
              className="glass-panel grid gap-3 rounded-xl p-6 sm:max-w-lg"
            >
              <p className="font-medium">{data.userReview ? "Update your review" : "Write a review"}</p>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <select
                  id="rating"
                  name="rating"
                  required
                  defaultValue={data.userReview?.rating ?? 5}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-body">Notes (optional)</Label>
                <textarea
                  id="review-body"
                  name="body"
                  maxLength={2000}
                  rows={3}
                  defaultValue={data.userReview?.body ?? ""}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit" disabled={reviewSaving} className="w-fit">
                {reviewSaving ? "Saving…" : data.userReview ? "Update review" : "Submit review"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Button variant="link" className="h-auto p-0" href="/login">
                Sign in
              </Button>{" "}
              to rate this venue.
            </p>
          )}

          <ul className="space-y-3">
            {data.reviews.length ? (
              data.reviews.map((review) => (
                <li key={review.id} className="glass-panel rounded-xl p-4 text-sm">
                  <p className="font-medium">
                    {"★".repeat(review.rating)}
                    <span className="ml-2 text-muted-foreground">
                      {review.profiles?.display_name ?? "Fan"}
                    </span>
                  </p>
                  {review.body ? <p className="mt-2 text-muted-foreground">{review.body}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>
            )}
          </ul>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Trophy className="size-5 text-primary" />
              Local leaderboard
            </h2>
            {data.leaderboard?.payload?.length ? (
              <ul className="mt-4 space-y-2 text-sm">
                {(data.leaderboard.payload as { name?: string; score?: number }[])
                  .slice(0, 10)
                  .map((row, i) => (
                    <li key={i} className="flex justify-between border-b border-white/5 py-2">
                      <span>
                        #{i + 1} {row.name ?? "Member"}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{row.score ?? "—"}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Rankings update as fans earn loyalty points — check in on the concourse and leave reviews.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="mt-6">
          <VenueLoyaltyPanel data={loyalty} userSignedIn={userSignedIn} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PostFeed({ posts, total }: { posts: VenueCommunityPost[]; total: number }) {
  if (!posts.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No posts yet. Follow the venue and start the conversation.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total.toLocaleString()} post{total === 1 ? "" : "s"}
      </p>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li
            key={post.id}
            className={cn(
              "glass-panel rounded-xl p-4",
              post.is_pinned && "border border-primary/30"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {post.is_pinned ? <Badge>Pinned</Badge> : null}
              <Badge variant="secondary">{kindLabels[post.kind]}</Badge>
              <span>{post.profiles?.display_name ?? "Fan"}</span>
              <span>·</span>
              <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString()}</time>
            </div>
            {post.title ? <p className="mt-2 font-medium">{post.title}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
