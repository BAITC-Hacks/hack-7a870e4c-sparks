"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Lottie = dynamic(
  () => import("lottie-react").then((module) => module.Lottie),
  { ssr: false },
);

function StaticIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-auto w-full"
      viewBox="0 0 360 240"
      fill="none"
    >
      <path
        d="M52 180C108 180 118 124 174 124S246 60 296 60"
        stroke="#008F73"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="296" cy="60" r="37" fill="#FFF4D6" fillOpacity=".65" />
      <circle cx="174" cy="124" r="27" fill="#DDF1E9" fillOpacity=".45" />
      <circle
        cx="52"
        cy="180"
        r="10"
        fill="white"
        stroke="#008F73"
        strokeWidth="1.5"
      />
      <circle cx="52" cy="180" r="3" fill="#008F73" />
      <circle
        cx="174"
        cy="124"
        r="12"
        fill="white"
        stroke="#008F73"
        strokeWidth="1.5"
      />
      <path
        d="m169 124 4 4 7-8"
        stroke="#008F73"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="296" cy="60" r="17" stroke="#F4C64E" strokeWidth="3" />
      <circle cx="296" cy="60" r="10.5" stroke="#123C34" strokeWidth="1.5" />
      <circle cx="296" cy="60" r="4.5" fill="#123C34" />
    </svg>
  );
}

export function LoginIllustration() {
  const [animationData, setAnimationData] = useState<unknown>(null);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const controller = new AbortController();
    fetch("/animations/career-quest-login.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Animation unavailable");
        return response.json();
      })
      .then(setAnimationData)
      .catch(() => {
        if (!controller.signal.aborted) setAnimationData(null);
      });
    return () => controller.abort();
  }, [reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="mx-auto aspect-[3/2] w-full max-w-[360px] text-primary"
    >
      {animationData && !reducedMotion ? (
        <Lottie
          className="h-full w-full"
          src={animationData}
          autoplay
          loop={false}
        />
      ) : (
        <StaticIllustration />
      )}
    </div>
  );
}
