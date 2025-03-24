import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';

@Module({
  providers: [AuthService], // ✅ Register AuthService
  exports: [AuthService],   // ✅ Export it so other modules (like UserModule) can use it
})
export class AuthModule {}
