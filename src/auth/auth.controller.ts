import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { GoogleAuthGuard } from 'src/common/middleware/google-auth.guard';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Login with email' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('login')
  async loginWithEmail(@Body() body: LoginDto) {
    const { email } = body;

    const user = await this.userService.getOrCreateUserByEmail(email);

    return this.authService.sendMagicLink(user.email);
  }

  // Google login callback
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleLoginCallback(@Req() req, @Res() res) {
    const user = req.user; // This is the user returned by the GoogleStrategy
    res.redirect(`http://localhost:3000/dashboard?token=${user.id}`);
  }

  @ApiOperation({ summary: 'Verify magic link token' })
  @ApiBody({ type: VerifyTokenDto })
  @ApiResponse({ status: 200, description: 'Magic link verified' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @Post('verify-magic-link')
  async verifyMagicLink(@Body() body: VerifyTokenDto, @Res() res: Response) {
    const { token } = body;

    const user = await this.authService.verifyMagicLinkToken(token);
    if (!user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid or expired token' });
    }

    const jwtToken = await this.authService.generateJwt(user);

    // Set the JWT token in an HTTP-only cookie
    res.cookie('auth_token', jwtToken, {
      httpOnly: true, // Prevent access to the cookie via JavaScript
      secure: process.env.NODE_ENV === 'production', // Only set cookie over HTTPS in production
      maxAge: 3600000, // 1 hour expiration
      sameSite: 'strict', // Prevent cross-site requests
    });

    return res.status(HttpStatus.OK).json({ message: 'Login successful' });
  }

  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = this.authService.getRefreshTokenFromCookie(req);

    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: 'Refresh token is missing or expired' });
    }

    try {
      const newAccessToken =
        await this.authService.refreshAccessToken(refreshToken);

      res.cookie('auth_token', newAccessToken, {
        httpOnly: true,
        maxAge: 3600000, // 1 hour expiration
        sameSite: 'strict',
      });

      return res.status(200).json({ message: 'Access token refreshed' });
    } catch (error) {
      console.error('Error refreshing token:', error);
      return res.status(401).json({ message: 'Failed to refresh token' });
    }
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('auth_token');
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Logged out successfully' });
  }
}
