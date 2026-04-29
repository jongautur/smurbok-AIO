import { Injectable, Logger } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'
import { render } from '@react-email/render'
import type { ReactElement } from 'react'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transporter: Transporter | null
  private readonly from: string

  constructor() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM } = process.env

    this.from = GMAIL_FROM ?? 'noreply@smurbok.is'

    if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_FROM) {
      this.transporter = createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: GMAIL_FROM,
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          refreshToken: GMAIL_REFRESH_TOKEN,
        },
      })
      this.logger.log(`Mail service ready — sending as ${GMAIL_FROM}`)
    } else {
      this.logger.warn('Gmail OAuth2 credentials not fully configured — email sending disabled')
      this.transporter = null
    }
  }

  async sendRaw(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[DEV] Magic link email to ${to} — no mail transport configured`)
      this.logger.warn(`[DEV] HTML: ${html}`)
      return
    }
    try {
      await this.transporter.sendMail({ from: `Smurbók <${this.from}>`, to, subject, html })
      this.logger.log(`Email sent to ${to}: ${subject}`)
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err)
    }
  }

  async send(to: string, subject: string, template: ReactElement): Promise<void> {
    if (!this.transporter) return

    let html: string
    try {
      html = await render(template)
    } catch (err) {
      this.logger.error('Failed to render email template', err)
      return
    }

    try {
      await this.transporter.sendMail({
        from: `Smurbók <${this.from}>`,
        to,
        subject,
        html,
      })
      this.logger.log(`Email sent to ${to}: ${subject}`)
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err)
    }
  }
}
