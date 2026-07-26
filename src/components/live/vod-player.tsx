"use client";

type Props = {
  title: string;
  recordingUrl: string;
  recordingStatus?: string;
};

export function VodPlayer({ title, recordingUrl, recordingStatus }: Props) {
  if (recordingStatus === "processing") {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-card/50 px-6 text-center">
        <div>
          <p className="font-medium">Replay processing</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The recording will appear here shortly after the show ends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <span className="absolute left-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
        Replay
      </span>
      <video
        className="h-full w-full object-contain"
        src={recordingUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={`Replay of ${title}`}
      />
    </div>
  );
}
