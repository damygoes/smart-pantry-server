import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getOrCreateUserByEmail(email: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      user = new User();
      user.email = email;
      user.verified = false;
      user = await this.userRepository.save(user); // Save the new user
    }

    // Update firstName and lastName based on email
    user.updateNamesFromEmail();

    return this.userRepository.save(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
