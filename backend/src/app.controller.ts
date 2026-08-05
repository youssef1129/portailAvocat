import { Controller, Get } from '@nestjs/common';

@Controller('')
export class AppController {
  @Get()
  getHello(): string {
    return 'Portail API';
  }

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'OK' };
  }
}
