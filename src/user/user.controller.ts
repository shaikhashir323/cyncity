import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { Users } from './user.entity';
import { AuthService } from '../auth/auth.service';

@Controller('auth')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; phoneNumber?: string; watchIds?: number[] }
  ) {
    const { email, password, phoneNumber, watchIds = [] } = body;
    const result = await this.userService.register(email, password, phoneNumber, watchIds);

    if (result.user) {
      const token = this.authService.generateToken({ id: result.user.id, email: result.user.email });
      return {
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          phoneNumber: result.user.phoneNumber,
          isVerified: result.user.isVerified,
          watches: result.user.watches || [],
        },
        token,
      };
    }
    return result;
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.userService.findByEmail(body.email);

    if (user && (await this.userService.validateUser(body.email, body.password))) {
      const token = this.authService.generateToken({ id: user.id, email: user.email });
      return {
        message: 'Login successful',
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        watches: user.watches || [],
        token,
      };
    }
    return { message: 'Invalid credentials' };
  }

  @Post('apple')
  async appleSignIn(
    @Body() body: { appleUserId: string; email: string; phoneNumber?: string; watchIds?: number[] }
  ) {
    const { appleUserId, email, phoneNumber, watchIds = [] } = body;
    const result = await this.userService.registerWithApple(appleUserId, email, phoneNumber, watchIds);

    if (result.user) {
      const token = this.authService.generateToken({ id: result.user.id, email: result.user.email });
      return {
        ...result,
        user: {
          ...result.user,
          token,
          watches: result.user.watches || [],
        },
      };
    }
    return result;
  }

  @Get('users')
  async getAllUsers(): Promise<Users[]> {
    return this.userService.findAll();
  }
}