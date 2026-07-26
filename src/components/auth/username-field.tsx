"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateUsername } from "@/lib/username";

export function UsernameField({
  name = "username",
  required = false,
  defaultValue = "",
}: {
  name?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setStatus("idle");
      setMessage(required ? "Username is required" : null);
      return;
    }

    const formatError = validateUsername(normalized);
    if (formatError) {
      setStatus("error");
      setMessage(formatError);
      return;
    }

    setStatus("checking");
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/username/check?u=${encodeURIComponent(normalized)}`);
      const data = (await res.json()) as { available: boolean; reason?: string };
      if (data.available) {
        setStatus("ok");
        setMessage("Username available");
      } else {
        setStatus("error");
        setMessage(data.reason ?? "Username unavailable");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value, required]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>Username</Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        placeholder="your-name"
        required={required}
        autoComplete="username"
        pattern="[a-z0-9_-]{3,32}"
      />
      {message ? (
        <p
          className={
            status === "ok"
              ? "text-xs text-emerald-400"
              : status === "error"
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
          }
        >
          {message}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your public profile: watchlivecircuit.com/{value || "username"}
        </p>
      )}
    </div>
  );
}
