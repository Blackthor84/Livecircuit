import { generateTestEmail } from "@/lib/testing/test-email";

const FIRST_NAMES = [
  "Sarah", "Marcus", "Elena", "Jordan", "Avery", "Devon", "Maya", "Chris", "Taylor", "Riley",
  "Quinn", "Noah", "Zara", "Leo", "Priya", "Ethan", "Nina", "Kai", "Olivia", "Jamal",
];

const LAST_NAMES = [
  "Johnson", "Chen", "Rivera", "Brooks", "Patel", "Nguyen", "Williams", "Garcia", "Kim", "Davis",
  "Martinez", "Thompson", "Lee", "Brown", "Wilson", "Anderson", "Taylor", "Moore", "Jackson", "White",
];

const CITIES = [
  { city: "Boston", state: "MA", country: "US" },
  { city: "Providence", state: "RI", country: "US" },
  { city: "Manchester", state: "NH", country: "US" },
  { city: "Los Angeles", state: "CA", country: "US" },
  { city: "Austin", state: "TX", country: "US" },
  { city: "Chicago", state: "IL", country: "US" },
  { city: "Nashville", state: "TN", country: "US" },
  { city: "Denver", state: "CO", country: "US" },
  { city: "Seattle", state: "WA", country: "US" },
  { city: "Miami", state: "FL", country: "US" },
  { city: "Toronto", state: "ON", country: "CA" },
  { city: "London", state: null, country: "GB" },
];

const GENRES = ["indie", "rock", "hip-hop", "electronic", "country", "jazz", "comedy", "pop", "r&b", "folk"];

const AVATAR_SEEDS = ["f1", "f2", "f3", "a1", "a2", "a3", "m1", "m2", "c1", "c2"];

export function pick<T>(items: T[], index = 0): T {
  return items[index % items.length] as T;
}

export function randomInt(min: number, max: number, seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  const frac = x - Math.floor(x);
  return Math.floor(min + frac * (max - min + 1));
}

export function fakePerson(seed: number, role = "fan") {
  const first = pick(FIRST_NAMES, seed);
  const last = pick(LAST_NAMES, seed + 7);
  const username = `${first}${last}`.toLowerCase().replace(/[^a-z0-9]/g, "") + (seed % 1000);
  return {
    firstName: first,
    lastName: last,
    displayName: `${first} ${last}`,
    username: username.slice(0, 24),
    email: generateTestEmail(role, { mode: "stable", stableKey: `${role}:${seed}` }),
  };
}

export function fakeLocation(seed: number) {
  return pick(CITIES, seed);
}

export function fakeAvatar(seed: number) {
  const seedId = pick(AVATAR_SEEDS, seed);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seedId}${seed}`;
}

export function fakeBio(type: "fan" | "artist" | "agency", seed: number, category?: string) {
  const city = fakeLocation(seed).city;
  if (type === "fan") {
    return `Live music lover from ${city}. Always chasing the next great show.`;
  }
  if (type === "agency") {
    const role = category ?? "Agency professional";
    return `${role} at a LiveCircuit talent agency. Managing rosters, bookings, and partnerships from ${city}.`;
  }
  const cat = category ?? pick(GENRES, seed);
  return `Performing ${cat} for fans worldwide. Based in ${city}. Bookings open.`;
}

export function fakeStageName(seed: number) {
  const adj = ["Neon", "Midnight", "Golden", "Electric", "Velvet", "Crystal", "Wild", "Urban"][seed % 8];
  const noun = ["Circuit", "Echo", "Pulse", "Harbor", "Skyline", "Voltage", "Horizon", "Rhythm"][(seed + 3) % 8];
  return `${adj} ${noun}`;
}

export function fakeSocialLinks(seed: number) {
  const handle = `artist${seed}`;
  return {
    instagram: `https://instagram.com/${handle}`,
    twitter: `https://x.com/${handle}`,
    tiktok: `https://tiktok.com/@${handle}`,
  };
}

export function scenarioFollowerCount(scenario: string): number {
  switch (scenario) {
    case "emerging_artist":
      return 500;
    case "growing_artist":
      return 5000;
    case "headliner":
      return 100000;
    default:
      return 0;
  }
}

export function scenarioFanFollowCount(scenario: string): number {
  switch (scenario) {
    case "casual_fan":
      return 10;
    case "super_fan":
      return 100;
    case "local_fan":
      return 25;
    case "traveler":
      return 40;
    default:
      return 0;
  }
}

export function scenarioEventAttendance(scenario: string): number {
  switch (scenario) {
    case "casual_fan":
      return 5;
    case "super_fan":
      return 50;
    case "local_fan":
      return 12;
    case "traveler":
      return 30;
    default:
      return 0;
  }
}
