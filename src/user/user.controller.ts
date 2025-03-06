import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.userService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const isValid = await this.userService.validateUser(body.email, body.password);
    if (isValid) {
      return { message: 'Login successful' };
    }
    return { message: 'Invalid credentials' };
  }
}