import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Users } from './user.entity';
import { AuthModule } from '../auth/auth.module'; // ✅ Import AuthModule

@Module({
  imports: [TypeOrmModule.forFeature([Users]), AuthModule], // ✅ Add AuthModule here
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
