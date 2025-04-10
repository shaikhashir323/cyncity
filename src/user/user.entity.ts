import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Watch } from 'src/watches/watch.entity';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  verificationToken: string | null;

  @Column({ unique: true, nullable: true }) // Make phoneNumber nullable
  phoneNumber: string | null;

  @ManyToMany(() => Watch, watch => watch.caregivers) // Many-to-many relation
  watches: Watch[]; // Ab watches array hoga
}