import type { AudioAnalysis } from "@/lib/streaming/studio/types";

export class AudioLevelAnalyzer {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private peak = 0;
  private noiseFloor = 0;
  private frameCount = 0;

  attach(stream: MediaStream) {
    this.detach();
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.source = this.context.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    this.data = new Uint8Array(this.analyser.fftSize);
  }

  detach() {
    this.source?.disconnect();
    this.context?.close().catch(() => undefined);
    this.context = null;
    this.analyser = null;
    this.source = null;
    this.data = null;
    this.peak = 0;
    this.noiseFloor = 0;
    this.frameCount = 0;
  }

  sample(): AudioAnalysis {
    if (!this.analyser || !this.data) {
      return {
        level: 0,
        peak: 0,
        isClipping: false,
        noiseDetected: false,
        echoWarning: false,
        suggestions: ["Connect a microphone to run audio analysis."],
      };
    }

    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    let max = 0;
    for (let i = 0; i < this.data.length; i += 1) {
      const normalized = Math.abs(this.data[i] - 128) / 128;
      sum += normalized;
      max = Math.max(max, normalized);
    }

    const level = sum / this.data.length;
    this.peak = Math.max(this.peak * 0.995, max);
    this.frameCount += 1;

    if (this.frameCount < 30) {
      this.noiseFloor = Math.max(this.noiseFloor, level * 0.4);
    }

    const isClipping = max > 0.95;
    const noiseDetected = level > 0.02 && level < 0.08 && max < 0.15;
    const suggestions: string[] = [];

    if (level < 0.04) suggestions.push("Speak louder or move closer to the microphone.");
    if (isClipping) suggestions.push("Reduce gain — audio is clipping.");
    if (noiseDetected) suggestions.push("Background noise detected — try a quieter space.");
    if (level > 0.5 && !isClipping) suggestions.push("Music may be overpowering your voice.");

    return {
      level: Math.min(1, level * 4),
      peak: Math.min(1, this.peak),
      isClipping,
      noiseDetected,
      echoWarning: false,
      suggestions,
    };
  }
}

export async function recordAudioClip(stream: MediaStream, seconds = 10): Promise<Blob> {
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.start();
    window.setTimeout(() => recorder.stop(), seconds * 1000);
  });
}
