import { Controller, Post, Body } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('apple-signin')
  async appleSignIn(
    @Body('appleId') appleId: string = '000038.0e051e8b214e45cab5c5022f8ab79f10.1023',
    @Body('name') name: string = 'QF Developers',
    @Body('email') email: string = 'developers@qfnetwork.org',
  ) {
    const response = {
      message: 'Apple Sign-In Successful',
      appleId,
      name,
      email,
    };
    console.log('Apple Sign-In Response:', response);
    return response;
  }
}