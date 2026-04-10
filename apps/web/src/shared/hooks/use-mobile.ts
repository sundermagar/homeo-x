import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is mobile/tablet based on brand breakpoints.
 * Follows the --bp-lg (1024px) breakpoint from brand specifications.
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
