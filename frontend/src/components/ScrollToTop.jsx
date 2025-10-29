import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's no hash, scroll to top
    if (!hash) {
      window.scrollTo(0, 0);
    }
    // If there's a hash, let the native behavior or component-specific logic handle it
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
