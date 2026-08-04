# Artist Bible — Source Assets

Logical home for Artist Bible artwork. Files here are referenced by path in artist JSON entries.

**Public URLs** are served from `public/assets/` (mirror this structure).

## Layout

```
artists/{artist-id}/     — hero, portrait, performance, walk, crowd, closeUp, profile, vip, arenaBanner
logos/{artist-id}.png    — full logo + {artist-id}-icon.png
albums/{artist-id}.png   — album cover art
tours/{artist-id}-poster.png
merch/{artist-id}/       — per-item product images
backgrounds/{artist-id}-arena.png
```

Until per-artist PNGs exist, stage poses fall back to the shared pool in `/public/demo/performers/`.

See `src/data/demo/artists/README.md` for the demo artist data model.
