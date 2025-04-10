// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
// // import { Users } from '../user/user.entity';

// @Entity('children')
// export class Child {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column()
//   name: string;

//   @Column({ unique: true })
//   deviceId: string;

//   @ManyToOne(() => Users, (user) => user.children)
//   parent: Users;
// }