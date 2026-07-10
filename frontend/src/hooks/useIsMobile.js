import { useState, useEffect } from "react";

const BREAKPOINT = 768; // px — abaixo disso é considerado mobile

function getIsMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`).matches;
}

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const handler = () => setIsMobile(mediaQuery.matches);

    handler();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
    }

    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handler);
      } else {
        mediaQuery.removeListener(handler);
      }
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  return isMobile;
}