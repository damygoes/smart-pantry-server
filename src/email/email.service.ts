import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMagicLinkEmail(email: string, link: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your Magic Link',
      text: `Click the link to login: ${link}`,
    });
  }
}
