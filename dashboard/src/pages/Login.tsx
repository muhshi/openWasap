import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import './Login.css';

interface LoginProps {
  onLogin: (apiKey: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for sso_key or error in URL params
    const params = new URLSearchParams(window.location.search);
    const ssoKey = params.get('sso_key');
    const urlError = params.get('error');
    
    if (urlError) {
      setError(decodeURIComponent(urlError));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (ssoKey) {
      setApiKey(ssoKey);
      handleSsoLogin(ssoKey);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSsoLogin = async (keyToUse: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': keyToUse,
        },
      });

      if (response.ok) {
        onLogin(keyToUse);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || t('login.invalidKey'));
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError(t('login.apiKeyRequired'));
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      });

      if (response.ok) {
        onLogin(apiKey);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || t('login.invalidKey'));
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src="/openwa_logo.webp" alt="OpenWA" className="logo-icon" />
          <span className="version-info">
            {t('login.version', {
              version: __APP_VERSION__,
              date: new Date(__BUILD_TIME__).toLocaleDateString(),
            })}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="apiKey">{t('login.apiKey')}</label>
            <div className="input-wrapper">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={t('login.apiKeyPlaceholder')}
                className={error ? 'error' : ''}
              />
              <button type="button" className="toggle-visibility" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <span className="error-message">{error}</span>}
          </div>

          <button type="submit" className="connect-btn" disabled={isLoading}>
            {isLoading ? t('login.connecting') : t('login.connect')}
          </button>
        </form>

        <div className="sso-divider">
          <div className="sso-divider-line"></div>
          <span className="sso-divider-text">{t('login.or')}</span>
          <div className="sso-divider-line"></div>
        </div>

        <a href="/auth/sipetra/redirect" className="sso-button" id="sso-sipetra-btn">
          <div className="sso-logo-box">
            <img
              src="/logo_bps.png"
              alt="Logo BPS Demak"
              className="sso-logo"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = '/logo_sipetra.png';
                }
              }}
            />
          </div>
          <div className="sso-label-box">
            <span className="sso-label-title">{t('login.ssoSipetra')}</span>
            <span className="sso-label-subtitle">{t('login.ssoSubtitle')}</span>
          </div>
          <svg className="sso-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
          </svg>
        </a>

        <p className="login-help">
          {t('login.help')}{' '}
          <a
            href="https://github.com/rmyndharis/OpenWA/blob/main/docs/01-project-overview.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('login.viewDocs')}
          </a>
        </p>
      </div>

      <footer className="login-footer">
        <span>{t('login.footer')}</span>
        <a
          href="https://github.com/rmyndharis/OpenWA"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          aria-label="GitHub"
        >
          <GithubIcon size={18} />
        </a>
      </footer>
    </div>
  );
}
