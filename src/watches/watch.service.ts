import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watch } from './watch.entity';
import { Users } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { In } from 'typeorm';

@Injectable()
export class WatchService {
  constructor(
    @InjectRepository(Watch)
    private watchRepository: Repository<Watch>,
    @InjectRepository(Users)
    private userRepository: Repository<Users>,
  ) {}

  // Register a patient with multiple caregiver IDs
  async register(
    name: string,
    brand: string,
    username: string,
    password: string,
    phoneNumber: string,
    caregiverIds: number[],
  ): Promise<Watch> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const caregivers = await this.userRepository.findByIds(caregiverIds);
    if (caregivers.length !== caregiverIds.length) {
      throw new NotFoundException('One or more caregivers not found');
    }

    const watch = this.watchRepository.create({
      name,
      brand,
      username,
      password: hashedPassword,
      phoneNumber,
      caregivers,
    });

    return this.watchRepository.save(watch);
  }

  async login(
    username: string, 
    password: string, 
    caregiverEmails?: string[]
  ): Promise<{ watch: Watch; caregiverIds: number[] } | null> {
    const watch = await this.watchRepository.findOne({
      where: { username },
      relations: ['caregivers'],
    });

    if (watch && (await bcrypt.compare(password, watch.password))) {
      const caregiverIds = watch.caregivers.map(caregiver => caregiver.id);
      return { watch, caregiverIds };
    }
    return null;
  }

  async findAll(): Promise<Watch[]> {
    return this.watchRepository.find({ relations: ['caregivers'] });
  }

  async getWatchById(id: number): Promise<Watch | null> {
    return this.watchRepository.findOne({
      where: { id },
      relations: ['caregivers'],
    });
  }

  // New method to fetch watch by phone number
  async getWatchByPhoneNumber(phoneNumber: string): Promise<Watch | null> {
    return this.watchRepository.findOne({
      where: { phoneNumber },
      relations: ['caregivers'],
    });
  }

  async addCaregivers(watchId: number, caregiverIds: number[]): Promise<Watch> {
    const watch = await this.watchRepository.findOne({
      where: { id: watchId },
      relations: ['caregivers'],
    });
    
    if (!watch) throw new NotFoundException('Patient not found');

    const newCaregivers = await this.userRepository.findByIds(caregiverIds);
    if (newCaregivers.length !== caregiverIds.length) {
      throw new NotFoundException('One or more caregivers not found');
    }

    const updatedCaregivers = [
      ...watch.caregivers,
      ...newCaregivers.filter(
        newCaregiver => !watch.caregivers.some(existingCaregiver => existingCaregiver.id === newCaregiver.id)
      ),
    ];

    watch.caregivers = updatedCaregivers;
    return this.watchRepository.save(watch);
  }

  // New method to add caregivers by email
  async addCaregiversByEmail(watchId: number, caregiverEmails: string): Promise<Watch> {
    const emailArray = caregiverEmails.split(',').map(email => email.trim());
  
    const watch = await this.watchRepository.findOne({
      where: { id: watchId },
      relations: ['caregivers'],
    });
  
    if (!watch) {
      throw new NotFoundException('Patient not found');
    }
  
    const newCaregivers = await this.userRepository.find({
      where: emailArray.map(email => ({ email })),
    });
  
    if (newCaregivers.length !== emailArray.length) {
      const foundEmails = newCaregivers.map(c => c.email);
      const missingEmails = emailArray.filter(email => !foundEmails.includes(email));
      throw new NotFoundException(`Users not found for emails: ${missingEmails.join(', ')}`);
    }
  
    const updatedCaregivers = [
      ...watch.caregivers,
      ...newCaregivers.filter(
        newCaregiver => !watch.caregivers.some(existing => existing.id === newCaregiver.id)
      ),
    ];
  
    watch.caregivers = updatedCaregivers;
    return this.watchRepository.save(watch);
  }
  
}