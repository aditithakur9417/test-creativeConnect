import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/App.css';

import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Services from '@/pages/Services';
import ServiceDetail from '@/pages/ServiceDetail';
import { AuthCallback } from '@/components/AuthCallback';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AppRouter() {
  const location = useLocation();
  
  // Check for session_id in URL hash (OAuth callback)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/services" element={<Services />} />
      <Route path="/services/:id" element={<ServiceDetail />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster 
          position="top-right" 
          theme="dark"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #3f3f46',
              color: '#fafafa',
            },
          }}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;