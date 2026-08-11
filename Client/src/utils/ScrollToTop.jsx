import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instantly snaps the screen viewport back to the top-left coordinate on change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}