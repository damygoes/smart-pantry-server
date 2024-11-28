import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Strategy } from 'passport-google-oauth20';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      clientID: 'YOUR_GOOGLE_CLIENT_ID', // Google OAuth Client ID
      clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET', // Google OAuth Client Secret
      callbackURL: 'http://localhost:3000/auth/google/callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const { id, emails, displayName } = profile;

    // Check if the user exists in the database
    let user = await this.userRepository.findOne({ where: { googleId: id } });
    if (!user) {
      // If not, register the new user
      user = await this.userRepository.save({
        googleId: id,
        email: emails[0].value,
        name: displayName,
        verified: true, // Automatically verify the user if they login with Google
      });
    }

    return user;
  }
}
