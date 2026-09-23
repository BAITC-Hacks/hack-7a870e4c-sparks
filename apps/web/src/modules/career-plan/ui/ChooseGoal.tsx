import { LottieAnimation } from "@/shared/components/animation/LottieAnimation";
import { cn } from "@/shared/lib/utils";

export type ChooseGoalProps = {
  className?: string;
  /** Use false for a static preview. Reduced motion always takes precedence. */
  animated?: boolean;
};

/**
 * Decorative illustration for a successfully loaded plan with no career goal.
 * Render alongside localized text and a link to the goal form.
 * The parent owns API state and decides whether this illustration is appropriate.
 */
export function ChooseGoal({ className, animated = true }: ChooseGoalProps) {
  return (
    <LottieAnimation
      src="/animations/choose-goal.json"
      fallbackSrc="/animations/choose-goal.svg"
      autoplay={animated}
      loop={false}
      className={cn("max-w-[140px] sm:max-w-[180px]", className)}
    />
  );
}
