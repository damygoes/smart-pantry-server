import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { EmailService } from 'src/email/email.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // Temporary store for magic links, in production use something like Redis or database
  private readonly magicLinks: Map<string, string> = new Map();

  async sendMagicLink(email: string) {
    const token = crypto.randomBytes(20).toString('hex');
    this.magicLinks.set(token, email); // Store the token temporarily
    const link = `http://localhost:5173/auth/verify-magic-link?token=${token}`;

    await this.emailService.sendMagicLinkEmail(email, link);

    return { message: 'Magic link sent to your email!' };
  }

  async verifyMagicLinkToken(token: string) {
    const email = this.magicLinks.get(token);
    if (!email) {
      return null; // Invalid or expired token
    }

    const user = await this.userService.getUserByEmail(email);
    this.magicLinks.delete(token); // Invalidate the token after use
    return user;
  }

  async generateJwt(user: any) {
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    const payload = { userId: user.id, email: user.email };
    return jwt.sign(payload, jwtSecretKey, { expiresIn: '1h' });
  }

  getRefreshTokenFromCookie(req: Request): string | null {
    const refreshToken = req.cookies['refresh_token'];
    return refreshToken || null;
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // Step 1: Verify the refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET, // Use a separate secret for refresh tokens
      });

      // Step 2: Check if the user exists
      const user: User = await this.userService.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Step 3: Generate a new access token
      const newAccessToken = this.jwtService.sign(
        { userId: user.id, email: user.email },
        { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1h' }, // 1-hour expiration
      );

      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
