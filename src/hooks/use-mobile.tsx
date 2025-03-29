
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Initial check
    checkMobile()
    
    // Setup resize listener
    window.addEventListener("resize", checkMobile)
    
    // Cleanup listener
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Return false during SSR, then the actual value once mounted
  return typeof isMobile === 'undefined' ? false : isMobile
}
