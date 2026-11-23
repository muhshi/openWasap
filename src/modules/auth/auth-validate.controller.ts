import { Controller, Post, Get, Headers, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/auth.decorators';
import { createLogger } from '../../common/services/logger.service';
import { SSO_SESSION_COOKIE } from './sso.controller';

@ApiTags('auth')
@Controller('auth')
export class AuthValidateController {
  private readonly logger = createLogger('AuthValidateController');

  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate an API key' })
  @ApiHeader({ name: 'X-API-Key', description: 'API key to validate' })
  @ApiResponse({ status: 200, description: 'API key is valid' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  async validate(@Headers('x-api-key') apiKey?: string): Promise<{ valid: boolean; role?: string; id?: string }> {
    if (!apiKey) {
      return { valid: false };
    }

    try {
      let keyEntity = await this.authService.validateApiKey(apiKey);
      keyEntity = await this.authService.syncApiKeyRole(keyEntity);
      if (keyEntity && keyEntity.isActive) {
        return { valid: true, role: keyEntity.role, id: keyEntity.id };
      }
      return { valid: false };
    } catch (error) {
      this.logger.warn('API key validation error', { error: error instanceof Error ? error.message : String(error) });
      return { valid: false };
    }
  }

  /**
   * Exchange the HttpOnly SSO cookie for the API key + role. This keeps the
   * raw credential out of the browser URL/history and lets the dashboard
   * restore a session after a refresh without re-running the OAuth flow.
   */
  @Get('session')
  @Public()
  @ApiOperation({ summary: 'Restore dashboard session from SSO cookie' })
  @ApiResponse({ status: 200, description: 'Current SSO session' })
  async session(@Req() req: Request): Promise<{ valid: boolean; apiKey?: string; role?: string; id?: string }> {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return { valid: false };

    const rawCookie = cookieHeader
      .split(';')
      .map(part => part.trim())
      .find(part => part.startsWith(`${SSO_SESSION_COOKIE}=`));

    const apiKey = rawCookie?.slice(SSO_SESSION_COOKIE.length + 1);
    if (!apiKey) return { valid: false };

    try {
      let keyEntity = await this.authService.validateApiKey(apiKey);
      keyEntity = await this.authService.syncApiKeyRole(keyEntity);
      if (keyEntity?.isActive) {
        return { valid: true, apiKey, role: keyEntity.role, id: keyEntity.id };
      }
    } catch (error) {
      this.logger.warn('SSO session validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { valid: false };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the SSO session cookie' })
  logout(@Res() res: Response) {
    res.clearCookie(SSO_SESSION_COOKIE, { path: '/' });
    res.clearCookie('openwa_sso_state', { path: '/' });
    return res.json({ ok: true });
  }
}
