import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watch } from './watch.entity';
import { WatchService } from './watch.service';
import { WatchController } from './watch.controller';
import { Users } from '../user/user.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Watch, Users]),
    UserModule
  ],
  controllers: [WatchController],
  providers: [WatchService],
  exports: [WatchService],
})
export class WatchModule {
  
}