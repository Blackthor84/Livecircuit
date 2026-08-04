import { AgencyCinematicExperience } from "@/components/demo/cinematic/agency/agency-cinematic-experience";
import { CinematicErrorBoundary } from "@/components/demo/cinematic/shared/cinematic-error-boundary";

export default function AgencyDemoPage() {
  return (
    <CinematicErrorBoundary label="Agency demo">
      <AgencyCinematicExperience />
    </CinematicErrorBoundary>
  );
}
