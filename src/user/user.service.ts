import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(email: string, password: string): Promise<User> {
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({ 
      email, 
      password: hashedPassword 
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async validateUser(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (user) {
      return bcrypt.compare(password, user.password);
    }
    return false;
  }
}