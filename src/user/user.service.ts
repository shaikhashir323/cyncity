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

  async register(email: string, password: string): Promise<{ message: string; user?: Users }> {
    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      return { message: 'User already registered' };
    }
  
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
  
    const user = this.userRepository.create({ 
      email, 
      password: hashedPassword 
    });
    
    await this.userRepository.save(user);
    return { message: 'User registered successfully', user };
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

  async registerWithApple(appleUserId: string, email: string): Promise<any> {
    // Step 1: Check if user exists
    let user = await this.userRepository.findOne({ where: { email } });

    if (user) {
        user.accessToken = appleUserId; // Update the access token
        await this.userRepository.save(user); // Save the updated user
        return {
            message: 'User logged in successfully with Apple.',
            user: {
                id: user.id,
                email: user.email,
                isVerified: user.isVerified,
            },
        };
    }

    // Step 2: Register a new user if not found
    user = this.userRepository.create({
        email,
        isVerified: true, // Assuming Apple users are verified
        accessToken: appleUserId,
        password: null // Set password to null since it's not needed
    });
    await this.userRepository.save(user);
    return {
        message: 'User registered successfully with Apple.',
        user: {
            id: user.id,
            email: user.email,
            isVerified: user.isVerified,
            accessToken: user.accessToken,
        },
    };
}

  async findAll(): Promise<Users[]> {
    return this.userRepository.find(); // Fetch all users
  }
}