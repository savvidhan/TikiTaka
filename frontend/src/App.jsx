import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';
import MatchesPage from './pages/MatchesPage';
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
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout
              healthState={healthState}
              onRefreshHealth={performHealthCheck}
              isCheckingHealth={isCheckingHealth}
            />
          }
        >
          {/* Main platform routes */}
          <Route index element={<DashboardPage healthState={healthState} />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
