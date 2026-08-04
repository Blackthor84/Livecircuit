import { ArtistCinematicExperience } from "@/components/demo/cinematic/artist/artist-cinematic-experience";
import { CinematicErrorBoundary } from "@/components/demo/cinematic/shared/cinematic-error-boundary";

export default function ArtistDemoPage() {
  return (
    <CinematicErrorBoundary label="Artist demo">
      <ArtistCinematicExperience />
    </CinematicErrorBoundary>
  );
}
