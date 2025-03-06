import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/user.entity';

@Entity('watch') // Specify the table name as 'watches'
export class Watch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  brand: string;

  @Column()
  username: string; // Add username field

  @Column()
  password: string; // Add password field

  @ManyToOne(() => User, user => user.watches) // Establish the relationship
  user: User; // This will hold the reference to the User entity
}