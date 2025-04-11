import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Users } from 'src/user/user.entity';

@Entity('watch')
export class Watch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  brand: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ unique: true, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'text', nullable: true }) // ✅ Store as comma-separated string
  caregiverPhoneNumbers: string | null;

  @ManyToMany(() => Users, user => user.watches)
  @JoinTable()
  caregivers: Users[];
}