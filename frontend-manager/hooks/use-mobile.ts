/**
 * Mobile Detection Hook
 * 
 * Hook to detect if the current viewport is mobile-sized.
 * Uses window.matchMedia to detect screen width.
 * 
 * @module hooks/use-mobile
 * @example
 * const isMobile = useIsMobile();
 * if (isMobile) {
 *   // Render mobile UI
 * }
 */
import * as React from "react"

/**
 * Mobile breakpoint in pixels
 * 
 * @constant {number}
 */
const MOBILE_BREAKPOINT = 768

/**
 * Use Is Mobile Hook
 * 
 * Detects if the current viewport width is below the mobile breakpoint.
 * Updates automatically when window is resized.
 * 
 * @returns {boolean} True if viewport is mobile-sized (width < 768px)
 * 
 * @example
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileLayout /> : <DesktopLayout />;
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
