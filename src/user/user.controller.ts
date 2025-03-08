import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { Users } from './user.entity';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.userService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.userService.findByEmail(body.email);
    if (user && await this.userService.validateUser(body.email, body.password)) {
      return { 
        message: 'Login successful', 
        id: user.id,
        email: user.email
      };
    }
    return { message: 'Invalid credentials' };
  }

  @Get('users') // New endpoint to get all users
  async getAllUsers(): Promise<Users[]> {
    return this.userService.findAll();
  }
}