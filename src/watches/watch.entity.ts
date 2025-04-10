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

  @Column({ unique: true, nullable: true }) // Make phoneNumber nullable
  phoneNumber: string | null;

  @ManyToMany(() => Users, user => user.watches) // Many-to-many relation
  @JoinTable() // Yeh watch_users table banayega
  caregivers: Users[]; // Ab caregivers array hoga
}