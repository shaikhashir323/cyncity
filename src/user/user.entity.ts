import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Watch } from 'src/watches/watch.entity';

@Entity('users') // Ensure the table name is 'users'
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true }) // Make password nullable
  password: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  verificationToken: string | null;

  @OneToMany(() => Watch, (watch) => watch.user) // Establish the relationship
  watches: Watch[]; // This will hold the references to the Watch entities
}
