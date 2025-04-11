import { Injectable, NotFoundException } from '@nestjs/common';
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

  async register(
    name: string,
    brand: string,
    username: string,
    password: string,
    phoneNumber: string,
    caregiverPhoneNumbers: string = '', // ✅ Comma-separated string
  ): Promise<Watch> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const watch = this.watchRepository.create({
      name,
      brand,
      username,
      password: hashedPassword,
      phoneNumber,
      caregiverPhoneNumbers,
    });

    return this.watchRepository.save(watch);
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ watch: Watch; caregiverPhoneNumbers: string[] } | null> {
    const watch = await this.watchRepository.findOne({
      where: { username },
    });

    if (watch && (await bcrypt.compare(password, watch.password))) {
      const phones = watch.caregiverPhoneNumbers
        ? watch.caregiverPhoneNumbers.split(',').map(phone => phone.trim())
        : [];

      return { watch, caregiverPhoneNumbers: phones };
    }

    return null;
  }

  async findAll(): Promise<Watch[]> {
    return this.watchRepository.find();
  }

  async getWatchById(id: number): Promise<Watch | null> {
    return this.watchRepository.findOne({
      where: { id },
    });
  }

  async getWatchByPhoneNumber(phoneNumber: string): Promise<Watch | null> {
    return this.watchRepository.findOne({
      where: { phoneNumber },
    });
  }

  async addCaregiversByPhoneNumber(
    watchId: number,
    caregiverPhoneNumbers: string,
  ): Promise<Watch> {
    const newPhones = caregiverPhoneNumbers
      .split(',')
      .map(phone => phone.trim());

    const watch = await this.watchRepository.findOne({
      where: { id: watchId },
    });

    if (!watch) {
      throw new NotFoundException('Watch not found');
    }

    const existingPhones = watch.caregiverPhoneNumbers
      ? watch.caregiverPhoneNumbers.split(',').map(p => p.trim())
      : [];

    const combinedPhones = [
      ...existingPhones,
      ...newPhones.filter(phone => !existingPhones.includes(phone)),
    ];

    watch.caregiverPhoneNumbers = combinedPhones.join(','); // ✅ Save as comma-separated string

    return this.watchRepository.save(watch);
  }
}
