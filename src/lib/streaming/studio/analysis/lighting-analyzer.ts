import type { HealthStatus, LightingAnalysis } from "@/lib/streaming/studio/types";

export function analyzeVideoFrame(video: HTMLVideoElement): LightingAnalysis {
  if (!video.videoWidth || !video.videoHeight) {
    return {
      status: "yellow",
      suggestions: ["Waiting for camera feed…"],
      brightness: 0,
      faceCentered: false,
    };
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 320 / video.videoWidth);
  canvas.width = Math.floor(video.videoWidth * scale);
  canvas.height = Math.floor(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      status: "yellow",
      suggestions: ["Unable to analyze lighting."],
      brightness: 0,
      faceCentered: false,
    };
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let total = 0;
  let topHalf = 0;
  let bottomHalf = 0;
  let centerMassX = 0;
  let centerMassY = 0;
  let weight = 0;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 4;
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      total += lum;
      if (y < canvas.height / 2) topHalf += lum;
      else bottomHalf += lum;
      if (lum > 0.15) {
        centerMassX += x * lum;
        centerMassY += y * lum;
        weight += lum;
      }
    }
  }

  const pixels = canvas.width * canvas.height;
  const brightness = total / pixels;
  const topAvg = topHalf / (pixels / 2);
  const bottomAvg = bottomHalf / (pixels / 2);
  const cx = weight > 0 ? centerMassX / weight / canvas.width : 0.5;
  const cy = weight > 0 ? centerMassY / weight / canvas.height : 0.5;
  const faceCentered = Math.abs(cx - 0.5) < 0.15 && cy > 0.25 && cy < 0.65;

  const suggestions: string[] = [];
  let status: HealthStatus = "green";

  if (brightness < 0.22) {
    suggestions.push("Too dark — add front lighting or move to a brighter area.");
    status = "red";
  }
  if (brightness > 0.78) {
    suggestions.push("Overexposed — reduce direct light on your face.");
    status = status === "red" ? "red" : "yellow";
  }
  if (topAvg > bottomAvg * 1.35) {
    suggestions.push("Backlit — light source is behind you.");
    status = status === "green" ? "yellow" : status;
  }
  if (cy > 0.72) {
    suggestions.push("Camera too low — raise it to eye level.");
    status = status === "green" ? "yellow" : status;
  }
  if (cy < 0.2) {
    suggestions.push("Camera too high — lower it toward eye level.");
    status = status === "green" ? "yellow" : status;
  }
  if (!faceCentered) {
    suggestions.push("Face not centered — adjust framing.");
    status = status === "green" ? "yellow" : status;
  }
  if (suggestions.length === 0) {
    suggestions.push("Lighting looks good.");
  }

  return { status, suggestions, brightness, faceCentered };
}
