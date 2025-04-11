import { Controller, Post, Body, Get } from '@nestjs/common';
import { WatchService } from './watch.service';

@Controller('watches')
export class WatchController {
  constructor(private readonly watchService: WatchService) {}

  @Post('register')
  async register(
    @Body() body: {
      name: string;
      brand: string;
      username: string;
      password: string;
      phoneNumber: string;
      caregiverPhoneNumbers?: string[]; // Accept array in the request
    },
  ) {
    const caregiversAsString = body.caregiverPhoneNumbers
      ? body.caregiverPhoneNumbers.join(',') // ✅ convert to string
      : '';

    return this.watchService.register(
      body.name,
      body.brand,
      body.username,
      body.password,
      body.phoneNumber,
      caregiversAsString // ✅ send as string
    );
  }


  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.watchService.login(body.username, body.password);
    if (result) {
      return { 
        message: 'Login successful', 
        watch: result.watch, 
        caregiverPhoneNumbers: result.caregiverPhoneNumbers 
      };
    }
    return { message: 'Invalid credentials' };
  }

  @Get()
  async findAll() {
    return this.watchService.findAll();
  }

  @Post('add-caregivers-by-phone')
  async addCaregiversByPhoneNumber(@Body() body: { watchId: number; caregiverPhoneNumbers: string }) {
    return this.watchService.addCaregiversByPhoneNumber(body.watchId, body.caregiverPhoneNumbers);
  }
}