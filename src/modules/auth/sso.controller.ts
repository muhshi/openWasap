import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorators';
import { createLogger } from '../../common/services/logger.service';

@Controller('auth/sipetra')
export class SsoController {
  private readonly logger = createLogger('SsoController');

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('redirect')
  async redirect(@Res() res: Response) {
    const clientId = process.env.SIPETRA_CLIENT_ID;
    const redirectUri = process.env.SIPETRA_REDIRECT_URI;
    const baseUrl = process.env.SIPETRA_BASE_URL;

    if (!clientId || !redirectUri || !baseUrl) {
      return res.status(500).send('SSO configuration is missing.');
    }

    const queryParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identity_pegawai:read employee:read contact:read roles:read',
    });

    const authUrl = `${baseUrl}/oauth/authorize?${queryParams.toString()}`;
    return res.redirect(authUrl);
  }

  @Public()
  @Get('callback')
  async callback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    if (error) {
      return res.redirect('/login?error=' + encodeURIComponent(error));
    }
    if (!code) {
      return res.redirect('/login?error=' + encodeURIComponent('No authorization code provided.'));
    }

    const clientId = process.env.SIPETRA_CLIENT_ID;
    const clientSecret = process.env.SIPETRA_CLIENT_SECRET;
    const redirectUri = process.env.SIPETRA_REDIRECT_URI;
    const baseUrl = process.env.SIPETRA_BASE_URL;
    const dashboardUrl = process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || 8080}`;

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
