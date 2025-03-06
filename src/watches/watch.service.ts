import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watch } from './watch.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WatchService {
  constructor(
    @InjectRepository(Watch)
    private watchRepository: Repository<Watch>,
  ) {}

  async register(name: string, brand: string, username: string, password: string, userId: number): Promise<Watch> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const watch = this.watchRepository.create({ 
      name, 
      brand, 
      username, 
      password: hashedPassword,
      user: { id: userId } // Set the user relation instead of userId
    });

    return this.watchRepository.save(watch);
  }

  async login(username: string, password: string): Promise<Watch | null> {
    const watch = await this.watchRepository.findOne({ where: { username } });
    if (watch && await bcrypt.compare(password, watch.password)) {
      return watch; // Return the watch if login is successful
    }
    return null; // Return null if login fails
  }

  async findAll(): Promise<Watch[]> {
    return this.watchRepository.find();
  }
}