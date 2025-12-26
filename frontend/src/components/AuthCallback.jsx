import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/utils/api';
import { toast } from 'sonner';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        toast.error('Invalid auth callback');
        navigate('/');
        return;
      }

      try {
        const { data } = await api.post('/auth/session', null, {
          headers: { 'X-Session-ID': sessionId },
        });

        localStorage.setItem('session_token', data.session_token);
        toast.success(`Welcome, ${data.user.name}!`);
        navigate('/dashboard');
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        navigate('/');
      }
    };

    processAuth();
  }, [location, navigate]);

  return (
    <div data-testid="auth-callback" className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
        <p className="mt-4 text-zinc-400">Completing sign in...</p>
      </div>
    </div>
  );
};