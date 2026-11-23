import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { RoleProvider, useRole, type UserRole } from './hooks/useRole';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Sessions = lazy(() => import('./pages/Sessions').then(m => ({ default: m.Sessions })));
const Webhooks = lazy(() => import('./pages/Webhooks').then(m => ({ default: m.Webhooks })));
const Logs = lazy(() => import('./pages/Logs').then(m => ({ default: m.Logs })));
const MessageTester = lazy(() => import('./pages/MessageTester').then(m => ({ default: m.MessageTester })));
const Infrastructure = lazy(() => import('./pages/Infrastructure').then(m => ({ default: m.Infrastructure })));
const Plugins = lazy(() => import('./pages/Plugins'));
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

type SessionResult = {
  valid: boolean;
  apiKey?: string;
  role?: UserRole;
  id?: string;
};

async function fetchSession(): Promise<SessionResult> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (!response.ok) return { valid: false };
  return response.json();
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [, setApiKey] = useState('');
  const { role, setRole, setApiKeyId } = useRole();

  const applySession = (session: SessionResult) => {
    if (!session.valid || !session.apiKey) return false;
    setApiKey(session.apiKey);
    sessionStorage.setItem('openwa_api_key', session.apiKey);
    if (session.role) setRole(session.role);
    if (session.id) setApiKeyId(session.id);
    setIsAuthenticated(true);
    return true;
  };

  // Restore the SSO session from the HttpOnly cookie. This runs on every
  // full page load/refresh, so the user stays logged in until the cookie
  // expires or the key is revoked. Fall back to a stored key only when the
  // cookie flow is unavailable (never rotate it on the backend).
  useEffect(() => {
    let active = true;
    fetchSession()
      .then(session => {
        if (!active) return;
        if (applySession(session)) return;

        const savedKey = sessionStorage.getItem('openwa_api_key');
        if (!savedKey) return;

        fetch('/api/auth/validate', {
          method: 'POST',
          headers: { 'X-API-Key': savedKey },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (!active || !data?.valid || !data.role) {
              sessionStorage.removeItem('openwa_api_key');
              setRole(null);
              setApiKeyId(null);
              return;
            }
            setApiKey(savedKey);
            setRole(data.role as UserRole);
            if (data.id) setApiKeyId(data.id);
            setIsAuthenticated(true);
          })
          .catch(() => {
            if (!active) return;
            sessionStorage.removeItem('openwa_api_key');
            setRole(null);
            setApiKeyId(null);
          });
      })
      .catch(() => {
        // Network error: keep the user on the login screen rather than
        // showing an empty, unauthorized dashboard.
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (key: string) => {
    setApiKey(key);
    sessionStorage.setItem('openwa_api_key', key);

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'X-API-Key': key },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.role) setRole(data.role as UserRole);
        if (data.id) setApiKeyId(data.id);
      }
    } catch {
      setRole('viewer');
    }

    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    // Clear the server-side SSO cookie *before* showing the login screen,
    // otherwise the login page immediately restores the still-valid session.
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Ignore network errors; local state is cleared below regardless.
    }

    setApiKey('');
    setIsAuthenticated(false);
    setRole(null);
    setApiKeyId(null);
    sessionStorage.removeItem('openwa_api_key');
    localStorage.removeItem('openwa_user_role');
    localStorage.removeItem('openwa_api_key_id');
  };

  const loadingFallback = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Loader2 className="animate-spin" size={32} />
    </div>
  );

  if (checkingSession) return loadingFallback;

  if (!isAuthenticated) {
    return <Suspense fallback={loadingFallback}><Login onLogin={handleLogin} /></Suspense>;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={loadingFallback}>
        <Routes>
          <Route path="/" element={<Layout onLogout={handleLogout} userRole={role} />}>
            <Route index element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="webhooks" element={<Webhooks />} />
            <Route path="logs" element={<Logs />} />
            <Route path="message-tester" element={<MessageTester />} />
            <Route path="infrastructure" element={<Infrastructure />} />
            <Route path="contacts" element={<Contacts />} />
            {role === 'admin' && <Route path="plugins" element={<Plugins />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <AppContent />
        </RoleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
