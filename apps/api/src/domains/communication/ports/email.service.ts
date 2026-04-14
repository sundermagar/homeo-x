export interface SendEmailDto {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; path?: string; content?: any }[];
}

export interface EmailService {
  sendEmail(data: SendEmailDto): Promise<boolean>;
}
