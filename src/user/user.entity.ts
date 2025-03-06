import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Watch } from 'src/watches/watch.entity';

@Entity('users') // Ensure the table name is 'users'
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Watch, watch => watch.user) // Establish the relationship
  watches: Watch[]; // This will hold the references to the Watch entities
}