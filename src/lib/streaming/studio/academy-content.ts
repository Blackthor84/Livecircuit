export type AcademyArticle = {
  slug: string;
  title: string;
  summary: string;
  category: "getting-started" | "hardware" | "performance" | "platform";
  sections: { heading: string; body: string }[];
};

export const STREAMING_ACADEMY: AcademyArticle[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    summary: "Set up your first LiveCircuit livestream from start to finish.",
    category: "getting-started",
    sections: [
      {
        heading: "Before you go live",
        body: "Open Virtual Production Studio from your event dashboard. Enter the Green Room to test camera, audio, lighting, and network. Invite a test fan if you want a second opinion.",
      },
      {
        heading: "Go live with confidence",
        body: "When your checklist is green, click Go Live in the studio. Fans with tickets are notified and chat opens automatically.",
      },
    ],
  },
  {
    slug: "camera-setup",
    title: "Camera Setup",
    summary: "Frame yourself the way fans expect to see you.",
    category: "hardware",
    sections: [
      {
        heading: "Eye-level framing",
        body: "Place your camera at eye level. Avoid looking up or down at the lens — it feels more natural and professional.",
      },
      {
        heading: "Resolution",
        body: "720p is a great default for most connections. Use 1080p when your upload speed supports it.",
      },
    ],
  },
  {
    slug: "lighting-tips",
    title: "Lighting Tips",
    summary: "Look clear and professional on every device.",
    category: "hardware",
    sections: [
      {
        heading: "Front light",
        body: "Light your face from the front, not from behind. A window or ring light in front of you works well.",
      },
      {
        heading: "Avoid backlight",
        body: "Windows and bright lamps behind you can silhouette your face. Turn toward the light source instead.",
      },
    ],
  },
  {
    slug: "microphone-guide",
    title: "Microphone Guide",
    summary: "Sound as good as you look.",
    category: "hardware",
    sections: [
      {
        heading: "Distance",
        body: "Keep 6–12 inches between your mouth and the mic for clear vocals without clipping.",
      },
      {
        heading: "Headphones",
        body: "Wear headphones during rehearsals and live shows to prevent echo and feedback.",
      },
    ],
  },
  {
    slug: "streaming-from-phone",
    title: "Streaming from Phone",
    summary: "Go live from iOS or Android with LiveCircuit.",
    category: "platform",
    sections: [
      {
        heading: "Stable mount",
        body: "Use a tripod or stable surface. Handheld video adds motion that distracts from your performance.",
      },
      {
        heading: "Battery and data",
        body: "Plug in your phone and prefer Wi‑Fi over cellular when possible.",
      },
    ],
  },
  {
    slug: "streaming-from-desktop",
    title: "Streaming from Desktop",
    summary: "Best quality from laptop or desktop.",
    category: "platform",
    sections: [
      {
        heading: "Close background apps",
        body: "Free CPU and bandwidth by closing browsers, games, and downloads before streaming.",
      },
      {
        heading: "Wired connection",
        body: "Ethernet is more reliable than Wi‑Fi for live video upload.",
      },
    ],
  },
  {
    slug: "internet-recommendations",
    title: "Internet Recommendations",
    summary: "Upload speed and stability matter more than download.",
    category: "platform",
    sections: [
      {
        heading: "Minimum speeds",
        body: "720p needs ~3 Mbps upload. 1080p needs ~6 Mbps. Run the studio network test before every show.",
      },
      {
        heading: "Stability",
        body: "Consistent upload beats peak speed. Avoid streaming while others on your network download large files.",
      },
    ],
  },
  {
    slug: "music-performance-tips",
    title: "Music Performance Tips",
    summary: "Balance vocals and instruments for live fans.",
    category: "performance",
    sections: [
      {
        heading: "Monitor your mix",
        body: "Use the 10-second sound check recording to hear what fans hear — vocals should sit on top of the mix.",
      },
      {
        heading: "Stereo",
        body: "If you are playing music, stereo capture helps fans feel the performance.",
      },
    ],
  },
  {
    slug: "comedy-performance-tips",
    title: "Comedy Performance Tips",
    summary: "Timing and clarity win the room.",
    category: "performance",
    sections: [
      {
        heading: "Pause for laughs",
        body: "Live latency means reactions arrive slightly late. Leave a beat after punchlines.",
      },
      {
        heading: "Clear audio",
        body: "Comedy lives in the voice — prioritize mic clarity over visual effects.",
      },
    ],
  },
  {
    slug: "podcast-tips",
    title: "Podcast Tips",
    summary: "Intimate conversations that scale to thousands.",
    category: "performance",
    sections: [
      {
        heading: "Consistent levels",
        body: "Match guest and host volume in Pre-Show Studio before opening to fans.",
      },
      {
        heading: "Headphones required",
        body: "All speakers should wear headphones to prevent echo.",
      },
    ],
  },
  {
    slug: "speaker-tips",
    title: "Speaker Tips",
    summary: "Command the virtual stage.",
    category: "performance",
    sections: [
      {
        heading: "Center framing",
        body: "Keep your face centered with a little headroom. Slides can share screen when needed.",
      },
      {
        heading: "Energy",
        body: "Speak 10% louder and slower than in-person — cameras flatten energy.",
      },
    ],
  },
  {
    slug: "virtual-background-tips",
    title: "Virtual Background Tips",
    summary: "Coming soon — prepare your space today.",
    category: "hardware",
    sections: [
      {
        heading: "Clean real background",
        body: "Until virtual backgrounds launch, a tidy real background beats a blurry fake one.",
      },
    ],
  },
  {
    slug: "livekit-basics",
    title: "LiveKit Basics",
    summary: "How LiveCircuit delivers low-latency live video.",
    category: "platform",
    sections: [
      {
        heading: "WebRTC",
        body: "LiveCircuit uses LiveKit for real-time audio and video. Your browser connects directly to our media servers.",
      },
      {
        heading: "Rehearsal vs live",
        body: "Pre-Show Studio uses a private rehearsal room. Going live moves fans to the public broadcast room.",
      },
    ],
  },
  {
    slug: "producer-mode",
    title: "Producer Mode",
    summary: "Run your show with a backstage crew invisible to fans.",
    category: "platform",
    sections: [
      {
        heading: "Invite producers",
        body: "From your event dashboard, invite managers, sound engineers, or friends as Producers. They join the Virtual Production Studio — not on camera.",
      },
      {
        heading: "Private artist chat",
        body: "Producers communicate with you backstage. Fans never see these messages.",
      },
    ],
  },
  {
    slug: "building-an-audience",
    title: "Growing Your Audience",
    summary: "Build a fanbase that shows up for every performance.",
    category: "performance",
    sections: [
      {
        heading: "Consistency",
        body: "Schedule regular shows so fans know when to return. Promote each event across your social channels.",
      },
      {
        heading: "Cross-promote",
        body: "Share your LiveCircuit event link on social, email, and Discord. Clip highlights after each show.",
      },
      {
        heading: "Quality compounds",
        body: "Better audio and lighting from the Production Studio leads to longer watch times and more return viewers.",
      },
    ],
  },
  {
    slug: "usb-vs-xlr",
    title: "USB vs XLR Microphones",
    summary: "Choose the right mic connection for your setup.",
    category: "hardware",
    sections: [
      {
        heading: "USB microphones",
        body: "Plug-and-play for solo creators. Great for podcasts, acoustic sets, and desk streaming. Use the Audio Lab sound check to confirm levels.",
      },
      {
        heading: "XLR microphones",
        body: "Professional dynamic and condenser mics need an audio interface. Better isolation, lower noise, and more control — ideal for full-band or studio-quality vocals.",
      },
    ],
  },
  {
    slug: "virtual-concert-tips",
    title: "Virtual Concert Tips",
    summary: "Deliver a show that feels like a real venue.",
    category: "performance",
    sections: [
      {
        heading: "Run of show",
        body: "Use the Green Room checklist and producer chat to coordinate cues. Sound check with a test fan before opening the doors.",
      },
      {
        heading: "Engage the room",
        body: "Acknowledge chat, react to tips, and pause between songs. Virtual concerts succeed when fans feel present.",
      },
    ],
  },
  {
    slug: "obs-integration",
    title: "OBS Integration",
    summary: "Advanced streaming with OBS — coming soon.",
    category: "platform",
    sections: [
      {
        heading: "Built-in studio first",
        body: "LiveCircuit's Virtual Production Studio handles camera, audio, and network checks without extra software. OBS integration will add multi-camera switching and custom overlays.",
      },
    ],
  },
  {
    slug: "merch-sales",
    title: "Merch Sales During Live Shows",
    summary: "Turn viewers into buyers without breaking the flow.",
    category: "performance",
    sections: [
      {
        heading: "Announce at natural breaks",
        body: "Mention merch between songs or after a set. Producers can pin announcements in chat while you keep performing.",
      },
      {
        heading: "Limited drops",
        body: "Show-specific items create urgency. Tie a drop to a milestone — first 100 viewers, encore only, or post-show replay link.",
      },
    ],
  },
  {
    slug: "ticket-pricing",
    title: "Ticket Pricing",
    summary: "Price shows so fans say yes and you earn fairly.",
    category: "performance",
    sections: [
      {
        heading: "Start accessible",
        body: "New artists often win with lower general admission and optional VIP upsells. Test pricing on smaller rehearsal audiences first.",
      },
      {
        heading: "Value the experience",
        body: "Longer sets, exclusive chat, or replay access justify higher tiers. Be transparent about what each ticket includes.",
      },
    ],
  },
  {
    slug: "subscriber-growth",
    title: "Subscriber Growth",
    summary: "Convert one-time viewers into recurring supporters.",
    category: "performance",
    sections: [
      {
        heading: "Consistent schedule",
        body: "Fans subscribe when they know when you'll be live. Promote your next show at the end of every broadcast.",
      },
      {
        heading: "Member perks",
        body: "Early lobby access, subscriber-only chat, or discounted tickets reward loyalty and fund better production.",
      },
    ],
  },
  {
    slug: "public-speaking",
    title: "Public Speaking",
    summary: "Present with clarity and authority on camera.",
    category: "performance",
    sections: [
      {
        heading: "Eye contact with the lens",
        body: "Look at the camera, not the chat window. Producers can relay audience questions through backstage chat.",
      },
      {
        heading: "Pace and pauses",
        body: "Speak slightly slower than in a room. Use the Video Lab to confirm framing and lighting before you begin.",
      },
    ],
  },
  {
    slug: "room-acoustics",
    title: "Room Acoustics",
    summary: "Reduce echo and improve vocal clarity.",
    category: "hardware",
    sections: [
      {
        heading: "Soft surfaces",
        body: "Rugs, curtains, and furniture reduce harsh reflections that make vocals sound hollow.",
      },
    ],
  },
];

export function getAcademyArticle(slug: string) {
  return STREAMING_ACADEMY.find((article) => article.slug === slug) ?? null;
}
