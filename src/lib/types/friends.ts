export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export type FriendProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  presence: "online" | "away" | "offline";
  lastSeenAt: string | null;
  mutualFriends: number;
};

export type FriendRequest = {
  id: string;
  from: FriendProfile;
  createdAt: string;
  direction: "incoming" | "outgoing";
};

export type FriendActivityItem = {
  id: string;
  actorName: string;
  verb: string;
  summary: string;
  createdAt: string;
};

export type SharedEventItem = {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  artistSlug: string;
  scheduledAt: string;
  friendName: string;
};

export type FriendRecommendation = FriendProfile & { reason: string };

export type WatchPartySummary = {
  id: string;
  inviteCode: string;
  title: string;
  hostName: string;
  memberCount: number;
  eventId: string | null;
};

export type FriendsHubReport = {
  friends: FriendProfile[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  followingCount: number;
  followersCount: number;
  activity: FriendActivityItem[];
  sharedEvents: SharedEventItem[];
  recommendations: FriendRecommendation[];
  watchParties: WatchPartySummary[];
  computedAt: string;
};
