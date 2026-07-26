import { z } from "zod";
import { optionalUsernameSchema } from "@/lib/validations/username";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username: optionalUsernameSchema,
  bio: z.string().max(500).optional(),
  countryId: z.string().uuid().optional().nullable(),
  stateId: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  favoriteGenreIds: z.array(z.string().uuid()).max(20).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export const updateAvatarUrlSchema = z.object({
  avatarUrl: z.string().url().max(2048),
});

export const updateArtistProfileSchema = z.object({
  stageName: z.string().trim().min(2).max(80),
  bio: z.string().max(2000).optional(),
  shortBio: z.string().max(280).optional(),
  category: z.string().min(1),
  bannerUrl: z.string().url().optional().nullable(),
  socialWebsite: z.string().url().optional().or(z.literal("")),
  socialInstagram: z.string().max(120).optional(),
  socialTwitter: z.string().max(120).optional(),
  socialYoutube: z.string().max(120).optional(),
  socialTiktok: z.string().max(120).optional(),
  socialFacebook: z.string().max(120).optional(),
  socialSpotify: z.string().max(200).optional(),
  socialAppleMusic: z.string().max(200).optional(),
  donationUrl: z.string().url().optional().or(z.literal("")),
  bookingEmail: z.string().email().optional().or(z.literal("")),
  yearsPerforming: z.number().int().min(0).max(100).optional().nullable(),
  languages: z.array(z.string().max(40)).max(20).optional(),
  genreIds: z.array(z.string().uuid()).max(12).optional(),
});

export const verificationRequestSchema = z.object({
  message: z.string().trim().min(10).max(1000),
});

export const addArtistMediaSchema = z.object({
  mediaType: z.enum(["gallery", "video", "album"]),
  title: z.string().trim().min(1).max(120),
  url: z.string().url(),
});
