import { useEffect, useState } from "react"

const DESKTOP_BREAKPOINT_PX = 768

/**
 * True when viewport width >= breakpoint (desktop: panel layout).
 * False when below (mobile: temp-pin placement flow).
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= DESKTOP_BREAKPOINT_PX : true
  )

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`)
    const handler = () => setIsDesktop(mql.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isDesktop
}
