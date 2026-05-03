import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

const KLING_BASE = 'https://api.kling.is'

export interface KlingCustomer {
  id: string
  external_id: string | null
  email: string | null
  name: string | null
}

export interface KlingCheckoutSession {
  id: string
  url: string
  status: string
  customer: string | null
  product: string | null
  subscription: string | null
}

export interface KlingSubscription {
  id: string
  customer: string
  product: string
  status: string
  current_period_end: number | null
}

@Injectable()
export class KlingService {
  private readonly logger = new Logger(KlingService.name)
  private readonly apiKey = process.env.KLING_API_KEY ?? ''

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${KLING_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      this.logger.error(`Kling ${method} ${path} → ${res.status}: ${JSON.stringify(err)}`)
      throw new Error(`Kling API error ${res.status}`)
    }
    return res.json()
  }

  async findCustomerByExternalId(externalId: string): Promise<KlingCustomer | null> {
    const res = await fetch(
      `${KLING_BASE}/v1/customers?external_id=${encodeURIComponent(externalId)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data.data as KlingCustomer[])?.[0] ?? null
  }

  async getCheckoutSession(sessionId: string): Promise<KlingCheckoutSession> {
    return this.request('GET', `/v1/checkout/sessions/${sessionId}`)
  }

  async createCustomer(externalId: string, email: string, name?: string | null): Promise<KlingCustomer> {
    const body: Record<string, string> = { external_id: externalId, email }
    if (name) body.name = name
    return this.request('POST', '/v1/customers', body)
  }

  async createCheckoutSession(params: {
    customerId: string
    productId: string
    successUrl: string
    cancelUrl: string
  }): Promise<KlingCheckoutSession> {
    return this.request('POST', '/v1/checkout/sessions', {
      customer_id: params.customerId,
      product_id: params.productId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      save_payment_method: true,
    })
  }

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    return this.request('POST', '/v1/billing-portal/sessions', {
      customer: customerId,
      return_url: returnUrl,
    })
  }

  async getSubscription(subscriptionId: string): Promise<KlingSubscription> {
    return this.request('GET', `/v1/subscriptions/${subscriptionId}`)
  }

  async cancelSubscription(subscriptionId: string, immediately = false): Promise<void> {
    await this.request('POST', `/v1/subscriptions/${subscriptionId}/cancel`, {
      cancel_immediately: immediately,
    })
  }

  verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
    try {
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    } catch {
      return false
    }
  }
}
