import { LottieAnimation } from "@/shared/components/animation/LottieAnimation";
import { cn } from "@/shared/lib/utils";

export type ProgressSuccessProps = {
  className?: string;
  animated?: boolean;
};

/**
 * Decorative confirmation. Mount only after a successful completion response.
 * For already_completed=true, omit this animation or use animated=false.
 * The parent supplies the accessible result text and actual API skill changes.
 */
export function ProgressSuccess({
  className,
  animated = true,
}: ProgressSuccessProps) {
  return (
    <LottieAnimation
      src="/animations/progress-success.json"
      fallbackSrc="/animations/progress-success.svg"
      autoplay={animated}
      loop={false}
      className={cn("h-16 w-24 max-w-[96px] shrink-0", className)}
    />
  );
}
