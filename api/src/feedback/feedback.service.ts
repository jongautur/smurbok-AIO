import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'

export type FeedbackType = 'BUG' | 'IDEA' | 'OTHER'

interface CreateFeedbackInput {
  subject: string
  description: string
  type: FeedbackType
  submittedBy: string
  file?: Express.Multer.File
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name)

  private get configured(): boolean {
    const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env
    return !!(JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN && JIRA_PROJECT_KEY)
  }

  private get authHeader(): string {
    const token = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')
    return `Basic ${token}`
  }

  private get baseUrl(): string {
    return process.env.JIRA_BASE_URL!.replace(/\/$/, '')
  }

  private jiraHeaders() {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  private jiraIssueType(type: FeedbackType): string {
    if (type === 'BUG') return 'Bug'
    return 'Task'
  }

  async create(input: CreateFeedbackInput): Promise<{ issueKey: string }> {
    if (!this.configured) {
      this.logger.warn('Jira credentials not configured — feedback discarded')
      this.logger.warn(`Subject: ${input.subject} | Type: ${input.type} | By: ${input.submittedBy}`)
      return { issueKey: 'DEV-0' }
    }

    const typeLabel = input.type === 'BUG' ? 'Bug' : input.type === 'IDEA' ? 'Hugmynd' : 'Annad'

    const body = {
      fields: {
        project: { key: process.env.JIRA_PROJECT_KEY },
        summary: `[${typeLabel}] ${input.subject}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: input.description }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Sent by: ', marks: [{ type: 'strong' }] },
                { type: 'text', text: input.submittedBy },
              ],
            },
          ],
        },
        issuetype: { name: this.jiraIssueType(input.type) },
        components: [{ name: 'Bug reports' }],
        labels: ['Web_report'],
      },
    }

    const res = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: this.jiraHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`Jira issue creation failed ${res.status}: ${text}`)
      throw new ServiceUnavailableException('Could not create Jira issue')
    }

    const json = await res.json() as { id: string; key: string }
    const issueKey = json.key

    await Promise.all([
      this.transitionTo(issueKey, 'Bug reports'),
      input.file ? this.attachFile(issueKey, input.file) : Promise.resolve(),
    ])

    this.logger.log(`Jira issue created: ${issueKey}`)
    return { issueKey }
  }

  // Fetches available transitions and moves the issue to the one whose name
  // matches `targetName` (case-insensitive). Logs a warning if not found.
  private async transitionTo(issueKey: string, targetName: string) {
    const res = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
      headers: this.jiraHeaders(),
    })

    if (!res.ok) {
      this.logger.warn(`Could not fetch transitions for ${issueKey}: ${res.status}`)
      return
    }

    const { transitions } = await res.json() as { transitions: { id: string; name: string }[] }
    const match = transitions.find((t) => t.name.toLowerCase() === targetName.toLowerCase())

    if (!match) {
      this.logger.warn(
        `Transition "${targetName}" not found for ${issueKey}. Available: ${transitions.map((t) => t.name).join(', ')}`,
      )
      return
    }

    const tr = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers: this.jiraHeaders(),
      body: JSON.stringify({ transition: { id: match.id } }),
    })

    if (!tr.ok) {
      this.logger.warn(`Transition to "${targetName}" failed for ${issueKey}: ${tr.status}`)
    }
  }

  private async attachFile(issueKey: string, file: Express.Multer.File) {
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype })
    formData.append('file', blob, file.originalname)

    const res = await fetch(`${this.baseUrl}/rest/api/2/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    })

    if (!res.ok) {
      this.logger.warn(`Jira attachment failed for ${issueKey}: ${res.status}`)
    }
  }
}
