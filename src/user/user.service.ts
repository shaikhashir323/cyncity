import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private userRepository: Repository<Users>,
  ) {}

  async register(email: string, password: string): Promise<Users> {
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({ 
      email, 
      password: hashedPassword 
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<Users> {
    return this.userRepository.findOne({ where: { email } });
  }

  async validateUser(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (user) {
      return bcrypt.compare(password, user.password);
    }
    return false;
    
  }
  async findAll(): Promise<Users[]> {
    return this.userRepository.find(); // Fetch all users
  }
}