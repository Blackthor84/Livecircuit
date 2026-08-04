import { FanCinematicExperience } from "@/components/demo/cinematic/fan/fan-cinematic-experience";
import { CinematicErrorBoundary } from "@/components/demo/cinematic/shared/cinematic-error-boundary";

export default function FanDemoPage() {
  return (
    <CinematicErrorBoundary label="Fan demo">
      <FanCinematicExperience />
    </CinematicErrorBoundary>
  );
}
