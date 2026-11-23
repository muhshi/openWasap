import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import './Login.css';

interface LoginProps {
  onLogin: (apiKey: string) => void;
}

type SessionResult = {
  valid: boolean;
  apiKey?: string;
};

/**
 * Login is SSO-only. The page briefly exchanges the HttpOnly SSO cookie for
 * the dashboard credential; if there is no session yet, the browser is sent
 * straight to SIPETRA. The manual API key form is intentionally gone.
 */
export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    const ssoFlag = params.get('sso');

    // Always clean the URL so nothing sensitive (or stale) stays in history.
    if (urlError || ssoFlag) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlError) {
      setError(decodeURIComponent(urlError));
      setIsLoading(false);
      return;
    }

    const startSso = () => {
      if (!active) return;
      window.location.href = '/auth/sipetra/redirect';
    };

    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(async (session: SessionResult | null) => {
        if (!active) return;
        if (session?.valid && session.apiKey) {
          onLogin(session.apiKey);
          setIsLoading(false);
          return;
        }

        // No active SSO session: go straight to SIPETRA.
        startSso();
      })
      .catch(() => {
        if (active) startSso();
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {error && <div className="error-message">{error}</div>}

        {isLoading ? (
          <div className="sso-loading">
            <Loader2 className="animate-spin" size={24} />
            <span>{t('login.ssoRedirecting')}</span>
          </div>
        ) : (
          <a href="/auth/sipetra/redirect" className="sso-button sso-button-primary" id="sso-sipetra-btn">
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
        )}

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
        <span>
          <Trans
            i18nKey="login.footer"
            components={{
              link: (
                <a
                  href="https://github.com/muhshi"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                />
              ),
            }}
          />
        </span>
        <a
          href="https://github.com/muhshi"
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
