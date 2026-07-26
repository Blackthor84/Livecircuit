import { z } from "zod";
import { optionalUsernameSchema, usernameSchema } from "@/lib/validations/username";

export const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
    displayName: z.string().trim().min(2).max(80),
    role: z.enum(["fan", "artist"]),
    username: optionalUsernameSchema,
  })
  .superRefine((data, ctx) => {
    if (data.role === "artist" && !data.username) {
      ctx.addIssue({
        code: "custom",
        message: "Username is required for performers",
        path: ["username"],
      });
      return;
    }
    if (data.username) {
      const parsed = usernameSchema.safeParse(data.username);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: parsed.error.issues[0]?.message ?? "Invalid username",
          path: ["username"],
        });
      }
    }
  });

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});
