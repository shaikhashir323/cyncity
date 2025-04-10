import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from './user.entity';
import { Watch } from '../watches/watch.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private userRepository: Repository<Users>,
    @InjectRepository(Watch)
    private watchRepository: Repository<Watch>,
  ) { }

  async register(
    email: string,
    password: string,
    phoneNumber?: string,
    watchIds: number[] = []
  ): Promise<{ message: string; user?: Users }> {
    // Check for existing user by email or phone number
    const existingUser = await this.userRepository.findOne({
      where: [
        { email },
        { phoneNumber: phoneNumber || undefined }
      ]
    });

    if (existingUser) {
      throw new ConflictException('User already registered');
    }

    // Validate watch IDs if provided
    console.log(watchIds);
    let watches: Watch[] = [];

    if (watchIds && watchIds.length > 0) {
      for (const id of watchIds) {
        const watch = await this.watchRepository.findOne({ where: { id } });

        if (!watch) {
          throw new NotFoundException(`Watch with ID ${id} is invalid or not found`);
        }

        watches.push(watch);
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      phoneNumber,
      watches: watches, // Directly assign validated watches
    });

    // Save user
    await this.userRepository.save(user);

    // Retrieve and return full user with relations
    return {
      message: 'User registered successfully',
      user: await this.findById(user.id)
    };
  }

  async registerWithApple(
    appleUserId: string,
    email: string,
    phoneNumber?: string,
    watchIds: number[] = []
  ): Promise<{ message: string; user: Partial<Users> }> {
    // Check for existing user
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['watches']
    });

    // Validate watch IDs if provided
    let watches: Watch[] = [];
    if (watchIds && watchIds.length > 0) {
      watches = await this.watchRepository.findByIds(watchIds);

      if (watches.length !== watchIds.length) {
        throw new NotFoundException('One or more watch IDs are invalid');
      }
    }

    if (user) {
      // Update phone number if not set
      if (phoneNumber && !user.phoneNumber) {
        user.phoneNumber = phoneNumber;

        // Add new watches if not already associated
        const newWatches = watches.filter(
          watch => !user.watches.some(existingWatch => existingWatch.id === watch.id)
        );
        user.watches.push(...newWatches);

        await this.userRepository.save(user);
      }

      return {
        message: 'User logged in successfully with Apple.',
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          watches: user.watches || [],
        },
      };
    }

    // Create new user
    user = this.userRepository.create({
      email,
      phoneNumber,
      isVerified: true,
      password: null,
      watches: watches,
    });

    await this.userRepository.save(user);

    return {
      message: 'User registered successfully with Apple.',
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        watches: user.watches || [],
      },
    };
  }

  async findByEmail(email: string): Promise<Users | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['watches']
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Users | null> {
    return this.userRepository.findOne({
      where: { phoneNumber },
      relations: ['watches']
    });
  }

  async findById(id: number): Promise<Users | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['watches']
    });
  }

  async validateUser(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (user && user.password) {
      return bcrypt.compare(password, user.password);
    }
    return false;
  }

  async findAll(): Promise<Users[]> {
    return this.userRepository.find({ relations: ['watches'] });
  }
}