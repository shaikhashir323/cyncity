import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watch } from './watch.entity';
import { WatchService } from './watch.service';
import { WatchController } from './watch.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Watch])],
  controllers: [WatchController],
  providers: [WatchService],

})
export class WatchModule {
  
}