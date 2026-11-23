import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorators';
import { createLogger } from '../../common/services/logger.service';

/**
 * Cookie used to keep the SSO session. The raw API key is never exposed in
 * the browser URL/history again: it is set as an HttpOnly cookie on the
 * callback and can be exchanged for the key via /api/auth/session.
 */
export const SSO_SESSION_COOKIE = 'openwa_sso_session';
const SSO_STATE_COOKIE = 'openwa_sso_state';
const STATE_TTL_MS = 10 * 60 * 1000;

@Controller('auth/sipetra')
export class SsoController {
  private readonly logger = createLogger('SsoController');

  constructor(private readonly authService: AuthService) {}

  private getDashboardUrl(req: Request): string {
    if (process.env.DASHBOARD_URL) {
      return process.env.DASHBOARD_URL.replace(/\/+$/, '');
    }
    const referer = req.headers.referer;
    if (referer) {
      try {
        const url = new URL(referer);
        return `${url.protocol}//${url.host}`;
      } catch {
        // ignore invalid referer
      }
    }
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || `localhost:${process.env.DASHBOARD_PORT || 2886}`;
    return `${proto}://${host}`;
  }

  private isSecureRequest(req: Request): boolean {
    const dashboardUrl = process.env.DASHBOARD_URL;
    if (dashboardUrl?.startsWith('https://')) return true;

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    return proto === 'https';
  }

  private getCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const [key, ...rest] = part.trim().split('=');
      if (key === name) {
        // Express URL-encodes cookie values (e.g. ':' becomes '%3A'), so the
        // browser sends them back encoded. Decode before comparing.
        const raw = rest.join('=');
        try {
          return decodeURIComponent(raw);
        } catch {
          return raw;
        }
      }
    }
    return undefined;
  }

  private cookieOptions(req: Request, maxAge?: number) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.isSecureRequest(req),
      path: '/',
      ...(maxAge ? { maxAge } : {}),
    };
  }

  @Public()
  @Get('redirect')
  async redirect(@Req() req: Request, @Res() res: Response) {
    const dashboardUrl = this.getDashboardUrl(req);
    const baseUrl = process.env.SIPETRA_BASE_URL || 'https://bpsdemak.com';
    const clientId = process.env.SIPETRA_CLIENT_ID;
    const redirectUri = process.env.SIPETRA_REDIRECT_URI || `${dashboardUrl}/auth/sipetra/callback`;

    const missingConfig: string[] = [];
    if (!clientId) missingConfig.push('SIPETRA_CLIENT_ID');
    if (!process.env.SIPETRA_CLIENT_SECRET) missingConfig.push('SIPETRA_CLIENT_SECRET');

    if (missingConfig.length > 0) {
      this.logger.error(`SSO configuration is missing: ${missingConfig.join(', ')}`);
      return res.redirect(
        `${dashboardUrl}/login?error=${encodeURIComponent(
          `Konfigurasi SSO belum lengkap di file .env server: variabel [${missingConfig.join(', ')}] belum diisi.`,
        )}`,
      );
    }

    // OAuth state: protects against CSRF and stops stale/double callbacks
    // from re-triggering login (which used to rotate the dashboard API key).
    const state = randomBytes(24).toString('hex');
    res.cookie(SSO_STATE_COOKIE, `${state}:${Date.now()}`, this.cookieOptions(req, STATE_TTL_MS));

    // `state` is sent back by SIPETRA and stored in the HttpOnly cookie above.
    const queryParams = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identity_pegawai:read employee:read contact:read roles:read',
      state,
    });

    const authUrl = `${baseUrl}/oauth/authorize?${queryParams.toString()}`;
    return res.redirect(authUrl);
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const dashboardUrl = this.getDashboardUrl(req);

    if (error) {
      return res.redirect(`${dashboardUrl}/login?error=` + encodeURIComponent(error));
    }
    if (!code) {
      return res.redirect(`${dashboardUrl}/login?error=` + encodeURIComponent('No authorization code provided.'));
    }

    // Validate OAuth state against the HttpOnly cookie set in /redirect.
    const stateCookie = this.getCookie(req, SSO_STATE_COOKIE);
    const [expectedState, issuedAt] = (stateCookie || '').split(':');
    const issuedAtMs = Number(issuedAt);
    const stateBuffer = Buffer.from(state || '');
    const expectedBuffer = Buffer.from(expectedState || '');
    const stateMatches =
      stateBuffer.length > 0 &&
      stateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(stateBuffer, expectedBuffer);

    if (!stateMatches || !Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > STATE_TTL_MS) {
      this.logger.warn('SSO callback rejected: invalid or expired state', {
        statePresent: stateBuffer.length > 0,
        cookiePresent: expectedBuffer.length > 0,
        stateLength: stateBuffer.length,
        cookieStateLength: expectedBuffer.length,
        expired: !Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > STATE_TTL_MS,
      });
      return res.redirect(
        `${dashboardUrl}/login?error=${encodeURIComponent('Sesi login SSO tidak valid atau sudah kedaluwarsa. Silakan coba lagi.')}`,
      );
    }
    // Consume the state so a double callback cannot be replayed.
    res.clearCookie(SSO_STATE_COOKIE, this.cookieOptions(req));

    const baseUrl = process.env.SIPETRA_BASE_URL || 'https://bpsdemak.com';
    const clientId = process.env.SIPETRA_CLIENT_ID;
    const clientSecret = process.env.SIPETRA_CLIENT_SECRET;
    const redirectUri = process.env.SIPETRA_REDIRECT_URI || `${dashboardUrl}/auth/sipetra/callback`;

    if (!clientId || !clientSecret) {
      this.logger.error('SSO credentials missing in callback');
      return res.redirect(`${dashboardUrl}/login?error=${encodeURIComponent('Konfigurasi kredensial SIPETRA SSO (SIPETRA_CLIENT_ID / SECRET) tidak lengkap di .env server.')}`);
    }

    try {
      const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        this.logger.error(`Failed to get token: ${err}`);
        return res.redirect(`${dashboardUrl}/login?error=TokenExchangeFailed`);
      }

      const tokens = await tokenResponse.json();

      const profileResponse = await fetch(`${baseUrl}/api/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        return res.redirect(`${dashboardUrl}/login?error=ProfileFetchFailed`);
      }

      const profile = await profileResponse.json();

      // Sync user and get their stable SSO key (never rotated on re-login).
      const apiKey = await this.authService.syncSsoUser(profile, tokens);
      const keyToReturn = (apiKey as any).rawKey;

      if (!keyToReturn) {
        // Already-authenticated user: reuse the key already held by the
        // browser cookie/localStorage. There is nothing new to hand over.
        return res.redirect(`${dashboardUrl}/`);
      }

      res.cookie(
        SSO_SESSION_COOKIE,
        keyToReturn,
        this.cookieOptions(req, 30 * 24 * 60 * 60 * 1000),
      );

      // The key is delivered via the HttpOnly cookie above. Redirect without
      // putting it in the URL (browser history / logs / referrer headers).
      return res.redirect(`${dashboardUrl}/login?sso=1`);
    } catch (e: any) {
      this.logger.error(`SSO Callback error: ${e.message}`);
      return res.redirect(`${dashboardUrl}/login?error=SSOError`);
    }
  }
}
