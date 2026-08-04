export type CameraAngle = "default" | "vip" | "back" | "stage-left" | "stage-right";
export type LightingPreset = "default" | "purple" | "cyan" | "gold" | "red" | "strobe";
export type DemoAudience = "fan" | "artist" | "agency";

export const DEMO_META = {
  fan: {
    title: "Experience LiveCircuit",
    subtitle: "Attend the future of live entertainment",
    entryCta: "ENTER ARENA",
    connectMessage: "Connecting to Arena...",
  },
  artist: {
    title: "Perform on LiveCircuit",
    subtitle: "Command the stage. Own the crowd.",
    entryCta: "TAKE THE STAGE",
    connectMessage: "Backstage access granted...",
  },
  agency: {
    title: "Manage Artists with LiveCircuit",
    subtitle: "Mission control for your entire roster",
    entryCta: "OPEN MISSION CONTROL",
    connectMessage: "Initializing roster systems...",
  },
} as const;

export const ARENA_VENUES = [
  { id: "boston", name: "Boston Harbor Arena", city: "Boston", lighting: "purple" as LightingPreset, accent: "from-violet-600 to-purple-700", headlinerId: "nova-lane" },
  { id: "chicago", name: "Windy City Stadium", city: "Chicago", lighting: "cyan" as LightingPreset, accent: "from-cyan-600 to-blue-700", headlinerId: "echo-drive" },
  { id: "miami", name: "Miami Pulse Arena", city: "Miami", lighting: "gold" as LightingPreset, accent: "from-amber-500 to-orange-600", headlinerId: "neon-atlas" },
  { id: "seattle", name: "Pacific Sound Hall", city: "Seattle", lighting: "default" as LightingPreset, accent: "from-indigo-600 to-violet-700", headlinerId: "velvet-static" },
] as const;

export const TOUR_MAP_NODES = [
  { id: "boston", city: "Boston", x: 88, y: 28, capacity: 10000, attendance: 9200, revenue: 506000 },
  { id: "chicago", city: "Chicago", x: 58, y: 32, capacity: 14000, attendance: 11800, revenue: 767000 },
  { id: "dallas", city: "Dallas", x: 42, y: 62, capacity: 12000, attendance: 10500, revenue: 577500 },
  { id: "seattle", city: "Seattle", x: 12, y: 14, capacity: 9500, attendance: 8900, revenue: 489500 },
  { id: "austin", city: "Austin", x: 38, y: 72, capacity: 8500, attendance: 7200, revenue: 396000 },
  { id: "miami", city: "Miami", x: 78, y: 78, capacity: 11000, attendance: 9800, revenue: 539000 },
  { id: "denver", city: "Denver", x: 32, y: 38, capacity: 9000, attendance: 8100, revenue: 445500 },
  { id: "atlanta", city: "Atlanta", x: 68, y: 58, capacity: 10500, attendance: 9400, revenue: 517000 },
] as const;

export const PUBLISH_STEPS = [
  "Creating Arenas...",
  "Scheduling Shows...",
  "Sending Notifications...",
  "Publishing...",
];

export const REACTION_EMOJIS = ["🔥", "❤️", "🎉", "👏", "🤘", "✨", "💜", "🎸"];
