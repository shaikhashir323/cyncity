import { Controller, Post, Body, Get } from '@nestjs/common';
import { WatchService } from './watch.service';

@Controller('watches')
export class WatchController {
  constructor(private readonly watchService: WatchService) {}

  @Post('register')
  async register(@Body() body: { name: string; brand: string; username: string; password: string; userId: number }) {
    return this.watchService.register(body.name, body.brand, body.username, body.password, body.userId);
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.watchService.login(body.username, body.password);
    if (result) {
      return { message: 'Login successful', watch: result.watch, userId: result.userId };
    }
    return { message: 'Invalid credentials' };
  }

  @Get()
  async findAll() {
    return this.watchService.findAll();
  }
}