// import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';
// import { AuthService } from './auth/auth.service';


// @Injectable()
// export class JwtMiddleware implements NestMiddleware {
//   constructor(
//     private jwtService: JwtService,
//     private configService: ConfigService
//   ) {}

//   async use(req: Request, res: Response, next: NextFunction) {
//     const token = req.headers.authorization?.split(' ')[1];

//     if (!token) {
//       throw new UnauthorizedException('No token provided');
//     }

//     try {
//       const decoded = await this.jwtService.verifyAsync(token, {
//         secret: this.configService.get<string>('JWT_SECRET_KEY'), // Read from .env
//       });

//       req.user = decoded; // Attach user data to the request object
//       next();
//     } catch (err) {
//       console.error(err);
//       throw new UnauthorizedException('Invalid or expired token');
//     }
//   }
// }
