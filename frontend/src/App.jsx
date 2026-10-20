import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LandingPage from './pages/LandingPage';
import { checkApiHealth } from './services/api';

export default function App() {
  const [healthState, setHealthState] = useState({
    isReachable: false,
    isDbConnected: false,
    serverStatus: 'checking',
    dbStatus: 'checking',
    latency: null,
    details: null
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const performHealthCheck = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const result = await checkApiHealth();
      setHealthState(result);
    } catch (err) {
      setHealthState({
        isReachable: false,
        isDbConnected: false,
        serverStatus: 'offline',
        dbStatus: 'unreachable',
        latency: null,
        error: err.message
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    performHealthCheck();
  }, [performHealthCheck]);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        <Navbar 
          healthState={healthState} 
          onRefreshHealth={performHealthCheck} 
          isCheckingHealth={isCheckingHealth} 
        />
        
        <div className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <LandingPage 
                  healthState={healthState} 
                  onRefreshHealth={performHealthCheck} 
                  isCheckingHealth={isCheckingHealth} 
                />
              } 
            />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
