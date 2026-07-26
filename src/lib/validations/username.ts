import { z } from "zod";
import { isReservedUsername, isValidUsernameFormat, normalizeUsername } from "@/lib/username";

export const usernameSchema = z
  .string()
  .trim()
  .transform(normalizeUsername)
  .refine((v) => v.length >= 3, "Username must be at least 3 characters")
  .refine((v) => v.length <= 32, "Username must be at most 32 characters")
  .refine(isValidUsernameFormat, "Use lowercase letters, numbers, dashes, and underscores only")
  .refine((v) => !isReservedUsername(v), "This username is reserved");

export const optionalUsernameSchema = z
  .string()
  .trim()
  .transform(normalizeUsername)
  .refine((v) => v === "" || v.length >= 3, "Username must be at least 3 characters")
  .refine((v) => v === "" || v.length <= 32, "Username must be at most 32 characters")
  .refine((v) => v === "" || isValidUsernameFormat(v), "Use lowercase letters, numbers, dashes, and underscores only")
  .refine((v) => v === "" || !isReservedUsername(v), "This username is reserved")
  .optional()
  .or(z.literal(""));
