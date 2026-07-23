/**
 * AI feature stubs — implement providers in Milestone 11+.
 * Routes under /api/ai/* should call these services only.
 */

export type AiStubResponse = { status: "not_implemented"; feature: string };

export const aiServices = {
  tourRecommendations(): { status: "implemented"; feature: string; path: string } {
    return { status: "implemented", feature: "tour_recommendations", path: "/artist/tour-planner" };
  },
  audienceInsights(): { status: "implemented"; feature: string; path: string } {
    return { status: "implemented", feature: "audience_insights", path: "/artist/momentum" };
  },
  eventSummary(): AiStubResponse {
    return { status: "not_implemented", feature: "event_summary" };
  },
  concertHighlights(): AiStubResponse {
    return { status: "not_implemented", feature: "concert_highlights" };
  },
  chatModeration(): AiStubResponse {
    return { status: "not_implemented", feature: "chat_moderation" };
  },
  fanRecommendations(): { status: "implemented"; feature: string; path: string } {
    return { status: "implemented", feature: "fan_recommendations", path: "/passport" };
  },
};
