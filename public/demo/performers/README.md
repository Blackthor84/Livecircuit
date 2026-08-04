# LiveCircuit Fictional Performer Assets

Original AI-generated fictional concert performers for cinematic demos.
**Not based on real celebrities or musicians.**

## Library structure

- `src/lib/demo/cinematic/fictional-artists.ts` — 80 fictional headline artists + pose catalog
- `public/demo/performers/` — transparent PNG cutouts keyed by `{category}-{pose}.png`
- `src/components/demo/cinematic/shared/stage-performer.tsx` — random performer renderer

## Regenerating / expanding assets

Use prompts like:

```
Ultra-realistic professional concert photography of a completely original fictional [genre] performer.
Purple, blue, and magenta stage lighting, fog, rim light, high contrast cinematic.
Isolated performer cutout only — transparent background, no stage, no crowd.
Does not resemble any real celebrity or musician.
```

Save outputs to `public/demo/performers/{category}-{pose-id}.png` and register in
`PERFORMER_POSE_ASSETS` inside `fictional-artists.ts`.

## Pose IDs

`mic`, `walk`, `arms-up`, `point-crowd`, `guitar`, `bass`, `drums`, `dj-table`, `piano`,
`over-audience`, `back-view`, `side-profile`, `close-up`, `full-body`

## Categories

`male-pop`, `female-pop`, `rock-band`, `country`, `hip-hop`, `dj`, `indie`, `acoustic`, `metal`, `rnb`

Each demo visit randomly selects one of 80 fictional artists and a pose from their category pool.
