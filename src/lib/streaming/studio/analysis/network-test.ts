import type { NetworkTestResult } from "@/lib/streaming/studio/types";

export async function runNetworkTest(): Promise<NetworkTestResult> {
  const warnings: string[] = [];
  const samples: number[] = [];

  for (let i = 0; i < 3; i += 1) {
    const start = performance.now();
    try {
      const response = await fetch(`/api/studio/network-test?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Network test failed");
      await response.arrayBuffer();
      samples.push(performance.now() - start);
    } catch {
      warnings.push("Could not complete connection test.");
      break;
    }
  }

  const latencyMs =
    samples.length > 0 ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : null;

  let uploadMbps: number | null = null;
  try {
    const payload = new Uint8Array(256 * 1024);
    const uploadStart = performance.now();
    await fetch("/api/studio/network-test", {
      method: "POST",
      body: payload,
      cache: "no-store",
    });
    const uploadMs = performance.now() - uploadStart;
    uploadMbps = Number(((payload.byteLength * 8) / (uploadMs / 1000) / 1_000_000).toFixed(2));
  } catch {
    warnings.push("Upload speed could not be measured.");
  }

  let maxQuality: NetworkTestResult["maxQuality"] = "480p";
  if (uploadMbps !== null) {
    if (uploadMbps >= 15) maxQuality = "4k";
    else if (uploadMbps >= 10) maxQuality = "1440p" as NetworkTestResult["maxQuality"];
    else if (uploadMbps >= 6) maxQuality = "1080p";
    else if (uploadMbps >= 2.5) maxQuality = "720p";
    else warnings.push("Upload speed may limit stream quality.");
  }

  const stable =
    latencyMs !== null &&
    latencyMs < 180 &&
    (uploadMbps === null || uploadMbps >= 2) &&
    samples.every((sample) => Math.abs(sample - (latencyMs ?? sample)) < 80);

  if (latencyMs !== null && latencyMs >= 180) {
    warnings.push("High latency detected — stream may feel delayed.");
  }

  return {
    downloadMbps: null,
    uploadMbps,
    latencyMs,
    maxQuality,
    stable,
    warnings,
  };
}
