import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useGemma } from './api/gemma'; // Import the hook
import { loadUserData, useUserData } from './api/userDataManagement'; // Import user data management utilities
import LoadingModal from './components/LoadingModal'; // Import the LoadingModal component
import Sidebar from './components/Sidebar'; // Import the Sidebar component
import SplashScreen from './components/SplashScreen'; // Import the SplashScreen component
import OnboardingScreen from './components/OnboardingScreen'; // Import the OnboardingScreen component
import NavigationWrapper from './components/NavigationWrapper'; // Import our navigation wrapper
import { PatientRecordsProvider } from './components/PatientRecordsContext'; // Import the PatientRecordsProvider
import HomePage from './pages/home'; // Import the Home page
import ChatPage from './pages/chat'; // Import the Chat page
import ConversationsHistoryPage from './pages/ConversationsHistoryPage'; // Import the Conversations History page
import CalendarPage from './pages/calendar'; // Import the Calendar page
import RecordsPage from './pages/records'; // Import the Records page
import SessionPage from './pages/session'; // Import the Session page
import SettingsPage from './pages/settings'; // Import the Settings page
import PrescriptionsPage from './pages/prescriptions'; // Import the Prescriptions page

// Component to handle initial navigation
const InitialNavigationHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Handle navigation for file-based URLs and root paths
    if (!hasNavigated.current) {
      const currentPath = location.pathname;
      
      // Check for root, empty, or file paths
      const needsRedirect = 
        currentPath === '/' || 
        currentPath === '' || 
        currentPath.includes('index.html') ||
        currentPath.startsWith('/Users/');
      
      if (needsRedirect) {
        console.log('InitialNavigationHandler: Redirecting from', currentPath, 'to /home');
        hasNavigated.current = true;
        navigate('/home', { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  return children;
};

// Main App Content Component
const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('starting');
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Use the custom hook from userDataManagement to handle user data
  const [userData, setUserData, resetUserData, isLoadingUserData] = useUserData('userData', null);
  
  const { modelStatus, initMessage } = useGemma();
  
  // Set showOnboarding initially based on existing user data
  useEffect(() => {
    if (!isLoadingUserData && !showSplash) {
      const hasCompleteUserData = userData && userData.name && userData.age && userData.sex;
      setShowOnboarding(!hasCompleteUserData);
    }
  }, [isLoadingUserData, showSplash, userData]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Check if user has completed onboarding
  useEffect(() => {
    if (!isLoadingUserData) {
      console.log('User data loading complete. Current data:', userData);
      if (userData && userData.name && userData.age && userData.sex) {
        console.log('User data is complete');
      } else {
        console.log('User data not found or incomplete');
        if (!showSplash) {
          setShowOnboarding(true);
        }
      }
    }
  }, [userData, isLoadingUserData, showSplash]);

  // Handle splash screen dismissal
  const handleSplashDismissed = () => {
    setShowSplash(false);
    
    const storedData = loadUserData('userData');
    console.log('Checking user data after splash:', storedData);
    if (!storedData || !storedData.name || !storedData.age || !storedData.sex) {
      console.log('User data is incomplete, showing onboarding');
      setShowOnboarding(true);
    } else {
      console.log('User data is complete, skipping onboarding');
      // Simply set initialLoad to true to trigger the navigation wrapper
      setInitialLoad(true);
    }
  };

  // Handle onboarding completion
  const handleOnboardingComplete = (data) => {
    setUserData(data);
    setShowOnboarding(false);
  };

  // Set initial loading state
  useEffect(() => {
    setIsLoading(true);
    
    if (modelStatus) {
      setLoadingStatus(modelStatus);
    }
    
    if (modelStatus === 'error') {
      setLoadingStatus('error');
    }
  }, [modelStatus]);

  return (
    <>
      {/* Splash screen - only shown initially */}
      {showSplash && (
        <SplashScreen onDismiss={handleSplashDismissed} />
      )}
      
      {/* Onboarding - only shown after splash and if onboarding is needed */}
      {!showSplash && showOnboarding && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      
      {/* Main app UI - only shown after splash and onboarding */}
      {!showSplash && !showOnboarding && (
        <PatientRecordsProvider>
          <NavigationWrapper initialLoad={initialLoad} setInitialLoad={setInitialLoad}>
            <InitialNavigationHandler>
              <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
                <div className={`${sidebarOpen ? 'w-64' : 'w-20'} h-full flex-shrink-0 transition-all duration-300`}>
                  <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} userData={userData} />
                </div>
                
                <div className="flex-1 h-full overflow-y-auto">
                  <div className="h-full">
                    <Routes>
                      <Route path="/" element={<HomePage userData={userData} />} />
                      <Route path="/home" element={<HomePage userData={userData} />} />
                      <Route path="/chat" element={<ChatPage userData={userData} />} />
                      <Route path="/conversations" element={<ConversationsHistoryPage userData={userData} />} />
                      <Route path="/calendar" element={<CalendarPage userData={userData} />} />
                      <Route path="/prescriptions" element={<PrescriptionsPage userData={userData} />} />
                      <Route path="/records" element={<RecordsPage userData={userData} />} />
                      <Route path="/session" element={<SessionPage userData={userData} />} />
                      <Route path="/settings" element={<SettingsPage userData={userData} />} />
                      {/* Catch-all route to redirect to home */}
                      <Route path="*" element={<HomePage userData={userData} />} />
                    </Routes>
                  </div>
                </div>
                
                {/* Loading Modal Overlay */}
                <LoadingModal 
                  isLoading={isLoading} 
                  loadingStatus={loadingStatus} 
                  initMessage={initMessage} 
                  delayBeforeHide={2000}
                />
              </div>
            </InitialNavigationHandler>
          </NavigationWrapper>
        </PatientRecordsProvider>
      )}
    </>
  );
};

const MedicalAIApp = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default MedicalAIApp;