/** Tasteful, premium sponsor presentation — never flood the UI with logos. */

export type SponsorPresentation = {
  label: string;
  logoUrl?: string | null;
  prefix?: string;
};

export function livestreamPresenterCopy(sponsor: SponsorPresentation): string {
  return `${sponsor.prefix ?? "Tonight's livestream is presented by"} ${sponsor.label}`;
}

export function replayPresenterCopy(sponsor: SponsorPresentation): string {
  return `Replay presented by ${sponsor.label}`;
}

export function tourPresenterCopy(tourTitle: string, sponsor: SponsorPresentation): string {
  return `${tourTitle} presented by ${sponsor.label}`;
}

export function wifiPresenterCopy(sponsor: SponsorPresentation): string {
  return `WiFi courtesy of ${sponsor.label}`;
}

export function getVenueInternalName(venue: { default_name: string }): string {
  return venue.default_name;
}

/** Artist-owned stages are never sponsor-named permanently. */
export function artistStageLabel(stageName: string): string {
  return stageName;
}
