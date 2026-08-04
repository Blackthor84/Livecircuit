import type { CameraAngle, LightingPreset } from "@/lib/demo/cinematic/constants";

export type ArenaEffects = {
  camera: CameraAngle;
  lighting: LightingPreset;
  fog: boolean;
  confetti: boolean;
  pyro: boolean;
  glowSticks: boolean;
  clapping: boolean;
  cheering: boolean;
  curtainsOpen: boolean;
  lightsOn: boolean;
  crowdEnergy: number;
  venueName: string;
  hearts: { id: number; x: number }[];
  emojis: { id: number; emoji: string; x: number }[];
};

export function createArenaEffects(overrides: Partial<ArenaEffects> = {}): ArenaEffects {
  return {
    camera: "default",
    lighting: "default",
    fog: true,
    confetti: false,
    pyro: false,
    glowSticks: false,
    clapping: false,
    cheering: false,
    curtainsOpen: false,
    lightsOn: true,
    crowdEnergy: 40,
    venueName: "LiveCircuit Arena",
    hearts: [],
    emojis: [],
    ...overrides,
  };
}
