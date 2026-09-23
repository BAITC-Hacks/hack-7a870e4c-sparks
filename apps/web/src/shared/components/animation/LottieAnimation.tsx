"use client";

import type { LottieProps } from "lottie-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

type Player = typeof import("lottie-react").Lottie;

export type LottieAnimationProps = {
  src: string;
  fallbackSrc: string;
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
};

/** Decorative animation. The parent supplies all meaningful text and actions. */
export function LottieAnimation({ ...props }: LottieAnimationProps) {
  return <AnimationPlayer key={props.src} {...props} />;
}

function AnimationPlayer({
  src,
  fallbackSrc,
  className,
  autoplay = true,
  loop = false,
  speed = 1,
}: LottieAnimationProps) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [PlayerComponent, setPlayer] = useState<Player | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setReady(false);
    setFailed(false);
    if (reducedMotion || !autoplay) return;
    let cancelled = false;
    import("lottie-react")
      .then((module) => {
        if (!cancelled) setPlayer(() => module.Lottie);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, autoplay]);

  const subscriptions: LottieProps["subscriptions"] = {
    ready: () => setReady(true),
    error: () => setFailed(true),
  };
  const showPlayer = autoplay && !reducedMotion && !failed && PlayerComponent;

  return (
    <div
      aria-hidden="true"
      className={cn("relative aspect-[3/2] w-full", className)}
    >
      {/* The static asset is also rendered on the server, before hydration. */}
      <Image
        unoptimized
        src={fallbackSrc}
        alt=""
        width={360}
        height={240}
        className={cn("h-full w-full", showPlayer && ready && "invisible")}
      />
      {showPlayer && (
        <PlayerComponent
          key={src}
          src={src}
          autoplay
          loop={loop}
          speed={speed}
          subscriptions={subscriptions}
          className={cn(
            "absolute inset-0 h-full w-full",
            !ready && "invisible",
          )}
        />
      )}
    </div>
  );
}
