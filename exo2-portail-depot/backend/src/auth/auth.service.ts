import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, LawyerDto } from './dto/auth-response.dto';
import { Lawyer } from './entities/lawyer.entity';
import { LAWYER_REPOSITORY } from '../common/constants';

@Injectable()
export class AuthService {
  constructor(
    @Inject(LAWYER_REPOSITORY)
    private readonly lawyerRepository: Repository<Lawyer>,
    private readonly jwtService: JwtService,
  ) {}

  private buildLawyerDto(lawyer: Lawyer): LawyerDto {
    return {
      id: lawyer.id,
      email: lawyer.email,
      name: lawyer.name,
      createdAt: lawyer.createdAt,
    };
  }

  private buildAuthResponse(
    accessToken: string,
    lawyer: Lawyer,
  ): AuthResponseDto {
    return {
      accessToken,
      lawyer: this.buildLawyerDto(lawyer),
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.lawyerRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const lawyer = this.lawyerRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    const savedLawyer = await this.lawyerRepository.save(lawyer);
    const payload = { sub: savedLawyer.id, email: savedLawyer.email };
    const accessToken = this.jwtService.sign(payload);

    return this.buildAuthResponse(accessToken, savedLawyer);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const lawyer = await this.lawyerRepository
      .createQueryBuilder('lawyer')
      .addSelect('lawyer.password')
      .where('lawyer.email = :email', { email: dto.email })
      .getOne();

    const invalidMessage = 'Email or password is invalid.';
    if (!lawyer) {
      throw new UnauthorizedException(invalidMessage);
    }

    const passwordMatches = await bcrypt.compare(dto.password, lawyer.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(invalidMessage);
    }

    const payload = { sub: lawyer.id, email: lawyer.email };
    const accessToken = this.jwtService.sign(payload);
    return this.buildAuthResponse(accessToken, lawyer);
  }

  async validateLawyerById(id: string): Promise<Lawyer> {
    const lawyer = await this.lawyerRepository.findOne({ where: { id } });
    if (!lawyer) {
      throw new UnauthorizedException('Invalid token.');
    }
    return lawyer;
  }
}
