"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ARENA_TIER_OPTIONS, DEFAULT_COMPANY, DEFAULT_STATE } from "@/lib/demo/naming-rights-data";
import {
  calculateRoiV2,
  getArenaName,
  getBrandTheme,
  getDisplayCompany,
  getStateMarketData,
  type BrandTheme,
  type RoiOutputsV2,
} from "@/lib/demo/naming-rights-utils";
import { STATE_POPULATIONS } from "@/lib/demo/state-market-data";
import {
  FLYOVER_SCENE_IDS,
  PRESENTATION_SLIDE_IDS,
  SPONSOR_VISUALIZER_STEPS,
  type ConfiguratorPhase,
  type EventTypeId,
  type SponsorVisualizerStepId,
} from "@/lib/demo/sponsor-visualizer-steps";

export type SponsorVisualizerForm = {
  companyName: string;
  industry: string;
  website: string;
  slogan: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  state: string;
  tierId: string;
  monthlyBudget: number;
  contractYears: number;
  timeOfDay: "day" | "night";
  eventType: EventTypeId;
  expectedAttendance: number;
};

type SponsorVisualizerContextValue = {
  phase: ConfiguratorPhase;
  startBuilding: () => void;
  step: SponsorVisualizerStepId;
  setStep: (step: SponsorVisualizerStepId) => void;
  nextStep: () => void;
  prevStep: () => void;
  form: SponsorVisualizerForm;
  updateForm: (patch: Partial<SponsorVisualizerForm>) => void;
  displayCompany: string;
  arenaName: string;
  theme: BrandTheme;
  resetKey: string;
  roi: RoiOutputsV2;
  selectedTier: (typeof ARENA_TIER_OPTIONS)[number];
  stateMarket: ReturnType<typeof getStateMarketData>;
  presentationMode: boolean;
  presentationSlide: number;
  presentationAutoplay: boolean;
  setPresentationAutoplay: (v: boolean) => void;
  enterPresentation: () => void;
  exitPresentation: () => void;
  nextPresentationSlide: () => void;
  prevPresentationSlide: () => void;
  steps: typeof SPONSOR_VISUALIZER_STEPS;
  presentationSlides: typeof PRESENTATION_SLIDE_IDS;
  canProceed: (step: SponsorVisualizerStepId) => boolean;
  flyoverMode: boolean;
  flyoverScene: number;
  enterFlyover: () => void;
  exitFlyover: () => void;
  nextFlyoverScene: () => void;
  prevFlyoverScene: () => void;
};

const SponsorVisualizerContext = createContext<SponsorVisualizerContextValue | null>(null);

const INITIAL_FORM: SponsorVisualizerForm = {
  companyName: DEFAULT_COMPANY,
  industry: "Financial Services",
  website: "",
  slogan: "",
  logoUrl: null,
  primaryColor: "",
  secondaryColor: "",
  state: DEFAULT_STATE,
  tierId: "theater",
  monthlyBudget: 16_500,
  contractYears: 3,
  timeOfDay: "night",
  eventType: "music",
  expectedAttendance: 10_000,
};

export function SponsorVisualizerProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<ConfiguratorPhase>("intro");
  const [step, setStep] = useState<SponsorVisualizerStepId>(1);
  const [form, setForm] = useState<SponsorVisualizerForm>(INITIAL_FORM);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationSlide, setPresentationSlide] = useState(0);
  const [presentationAutoplay, setPresentationAutoplay] = useState(true);
  const [flyoverMode, setFlyoverMode] = useState(false);
  const [flyoverScene, setFlyoverScene] = useState(0);

  const displayCompany = getDisplayCompany(form.companyName);
  const arenaName = getArenaName(form.companyName, form.tierId);
  const theme = useMemo(
    () =>
      getBrandTheme(displayCompany, {
        primary: form.primaryColor || undefined,
        secondary: form.secondaryColor || undefined,
      }),
    [displayCompany, form.primaryColor, form.secondaryColor]
  );
  const resetKey = `${displayCompany}-${form.tierId}-${form.state}-${form.timeOfDay}-${form.eventType}-${form.expectedAttendance}`;
  const selectedTier = ARENA_TIER_OPTIONS.find((t) => t.id === form.tierId) ?? ARENA_TIER_OPTIONS[2];
  const population = STATE_POPULATIONS[form.state] ?? 1_000_000;
  const stateMarket = useMemo(() => getStateMarketData(form.state, population), [form.state, population]);
  const roi = useMemo(
    () =>
      calculateRoiV2({
        monthlyBudget: form.monthlyBudget,
        contractYears: form.contractYears,
        tierId: form.tierId,
      }),
    [form.monthlyBudget, form.contractYears, form.tierId]
  );

  const updateForm = useCallback((patch: Partial<SponsorVisualizerForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const startBuilding = useCallback(() => {
    setPhase("configurator");
    setStep(1);
  }, []);

  const canProceed = useCallback(
    (current: SponsorVisualizerStepId) => {
      if (current === 3) return form.companyName.trim().length > 0;
      return true;
    },
    [form.companyName]
  );

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(14, s + 1) as SponsorVisualizerStepId);
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as SponsorVisualizerStepId);
  }, []);

  const enterPresentation = useCallback(() => {
    setPresentationSlide(0);
    setPresentationMode(true);
  }, []);

  const exitPresentation = useCallback(() => {
    setPresentationMode(false);
  }, []);

  const nextPresentationSlide = useCallback(() => {
    setPresentationSlide((i) => Math.min(PRESENTATION_SLIDE_IDS.length - 1, i + 1));
  }, []);

  const prevPresentationSlide = useCallback(() => {
    setPresentationSlide((i) => Math.max(0, i - 1));
  }, []);

  const enterFlyover = useCallback(() => {
    setFlyoverScene(0);
    setFlyoverMode(true);
  }, []);

  const exitFlyover = useCallback(() => {
    setFlyoverMode(false);
  }, []);

  const nextFlyoverScene = useCallback(() => {
    setFlyoverScene((i) => Math.min(FLYOVER_SCENE_IDS.length - 1, i + 1));
  }, []);

  const prevFlyoverScene = useCallback(() => {
    setFlyoverScene((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.svPresentation = presentationMode || flyoverMode ? "true" : "false";
    document.body.style.overflow = presentationMode || flyoverMode ? "hidden" : "";
    return () => {
      delete document.documentElement.dataset.svPresentation;
      document.body.style.overflow = "";
    };
  }, [presentationMode, flyoverMode]);

  useEffect(() => {
    const tier = ARENA_TIER_OPTIONS.find((t) => t.id === form.tierId);
    if (!tier) return;
    setForm((prev) => (prev.monthlyBudget === tier.investment ? prev : { ...prev, monthlyBudget: tier.investment }));
  }, [form.tierId]);

  useEffect(() => {
    if (!presentationMode || !presentationAutoplay) return;
    const timer = window.setInterval(() => {
      setPresentationSlide((i) => {
        if (i >= PRESENTATION_SLIDE_IDS.length - 1) return 0;
        return i + 1;
      });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [presentationMode, presentationAutoplay]);

  const value = useMemo(
    () => ({
      phase,
      startBuilding,
      step,
      setStep,
      nextStep,
      prevStep,
      form,
      updateForm,
      displayCompany,
      arenaName,
      theme,
      resetKey,
      roi,
      selectedTier,
      stateMarket,
      presentationMode,
      presentationSlide,
      presentationAutoplay,
      setPresentationAutoplay,
      enterPresentation,
      exitPresentation,
      nextPresentationSlide,
      prevPresentationSlide,
      steps: SPONSOR_VISUALIZER_STEPS,
      presentationSlides: PRESENTATION_SLIDE_IDS,
      canProceed,
      flyoverMode,
      flyoverScene,
      enterFlyover,
      exitFlyover,
      nextFlyoverScene,
      prevFlyoverScene,
    }),
    [
      phase,
      startBuilding,
      step,
      nextStep,
      prevStep,
      form,
      updateForm,
      displayCompany,
      arenaName,
      theme,
      resetKey,
      roi,
      selectedTier,
      stateMarket,
      presentationMode,
      presentationSlide,
      presentationAutoplay,
      enterPresentation,
      exitPresentation,
      nextPresentationSlide,
      prevPresentationSlide,
      canProceed,
      flyoverMode,
      flyoverScene,
      enterFlyover,
      exitFlyover,
      nextFlyoverScene,
      prevFlyoverScene,
    ]
  );

  return (
    <SponsorVisualizerContext.Provider value={value}>{children}</SponsorVisualizerContext.Provider>
  );
}

export function useSponsorVisualizer() {
  const ctx = useContext(SponsorVisualizerContext);
  if (!ctx) throw new Error("useSponsorVisualizer must be used within SponsorVisualizerProvider");
  return ctx;
}
