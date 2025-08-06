import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// This component ensures the initial navigation to home page works properly
const NavigationWrapper = ({ children, initialLoad, setInitialLoad }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation on mount and when initialLoad changes
  useEffect(() => {
    if (initialLoad) {
      console.log('NavigationWrapper: Current path is', location.pathname);
      
      // If we're not already on the home page, navigate there
      if (location.pathname !== '/home') {
        console.log('NavigationWrapper: Navigating to /home');
        // Use a slight delay to ensure all components are mounted
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 50);
      }
      
      // Reset the initialLoad flag
      setInitialLoad(false);
    }
  }, [initialLoad, location.pathname, navigate, setInitialLoad]);

  return <>{children}</>;
};

export default NavigationWrapper;
