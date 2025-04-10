import { Controller, Post, Body, Get } from '@nestjs/common';
import { WatchService } from './watch.service';

@Controller('watches')
export class WatchController {
  constructor(private readonly watchService: WatchService) {}

  @Post('register')
  async register(
    @Body() body: { name: string; brand: string; username: string; password: string; phoneNumber: string; caregiverIds: number[] }
  ) {
    return this.watchService.register(body.name, body.brand, body.username, body.password, body.phoneNumber, body.caregiverIds);
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string; caregiverEmails?: string[] }) {
    const result = await this.watchService.login(
      body.username, 
      body.password, 
      body.caregiverEmails
    );
    
    if (result) {
      return { 
        message: 'Login successful', 
        watch: result.watch, 
        caregiverIds: result.caregiverIds 
      };
    }
    return { message: 'Invalid credentials' };
  }

  @Get()
  async findAll() {
    return this.watchService.findAll();
  }

  @Post('add-caregivers')
  async addCaregivers(@Body() body: { watchId: number; caregiverIds: number[] }) {
    return this.watchService.addCaregivers(body.watchId, body.caregiverIds);
  }
  
  @Post('add-caregivers-by-email')
  async addCaregiversByEmail(@Body() body: { watchId: number; caregiverEmails: string }) {
    return this.watchService.addCaregiversByEmail(body.watchId, body.caregiverEmails);
  }
}