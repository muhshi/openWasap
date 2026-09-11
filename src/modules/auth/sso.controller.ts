import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorators';
import { createLogger } from '../../common/services/logger.service';

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

    const queryParams = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identity_pegawai:read employee:read contact:read roles:read',
    });

    const authUrl = `${baseUrl}/oauth/authorize?${queryParams.toString()}`;
    return res.redirect(authUrl);
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
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

    const baseUrl = process.env.SIPETRA_BASE_URL || 'https://bpsdemak.com';
    const clientId = process.env.SIPETRA_CLIENT_ID;
    const clientSecret = process.env.SIPETRA_CLIENT_SECRET;
    const redirectUri = process.env.SIPETRA_REDIRECT_URI || `${dashboardUrl}/auth/sipetra/callback`;

    if (!clientId || !clientSecret) {
      this.logger.error('SSO credentials missing in callback');
      return res.redirect(`${dashboardUrl}/login?error=${encodeURIComponent('Konfigurasi kredensial SIPETRA SSO (SIPETRA_CLIENT_ID / SECRET) tidak lengkap di .env server.')}`);
    }

    try {
      // Exchange code for token
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

      // Fetch user profile
      const profileResponse = await fetch(`${baseUrl}/api/user`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json' 
        },
      });

      if (!profileResponse.ok) {
        return res.redirect(`${dashboardUrl}/login?error=ProfileFetchFailed`);
      }

      const profile = await profileResponse.json();

      // Sync user and get API key
      const apiKey = await this.authService.syncSsoUser(profile, tokens);
      const keyToReturn = (apiKey as any).rawKey;

      if (!keyToReturn) {
        return res.redirect(`${dashboardUrl}/login?error=KeyGenerationFailed`);
      }

      // Redirect to dashboard with the API key
      return res.redirect(`${dashboardUrl}/login?sso_key=${encodeURIComponent(keyToReturn)}`);
    } catch (e: any) {
      this.logger.error(`SSO Callback error: ${e.message}`);
      return res.redirect(`${dashboardUrl}/login?error=SSOError`);
    }
  }
}
