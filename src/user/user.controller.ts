import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { Users } from './user.entity';
import { AuthService } from '../auth/auth.service'; // Import the AuthService

@Controller('auth')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService // Inject AuthService
  ) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.userService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.userService.findByEmail(body.email);
    
    if (user && (await this.userService.validateUser(body.email, body.password))) {
      // Generate JWT token
      const token = this.authService.generateToken({ id: user.id, email: user.email });

      return { 
        message: 'Login successful', 
        id: user.id,
        email: user.email,
        token, // Return token
      };
    }
    
    return { message: 'Invalid credentials' };
  }

  @Post('apple')
  async appleSignIn(@Body() body: { appleUserId: string; email: string }) {
    return this.userService.registerWithApple(body.appleUserId, body.email);
  }

  @Get('users') // New endpoint to get all users
  async getAllUsers(): Promise<Users[]> {
    return this.userService.findAll();
  }
}
