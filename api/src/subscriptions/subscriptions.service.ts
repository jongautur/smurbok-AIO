import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common'
import type { User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { KlingService } from './kling.service'

const TIER_PRODUCTS: Record<number, string | undefined> = {
  1: process.env.KLING_PRODUCT_TIER1_ID,
  2: process.env.KLING_PRODUCT_TIER2_ID,
}

function tierForProduct(productId: string): number | null {
  if (productId === process.env.KLING_PRODUCT_TIER1_ID) return 1
  if (productId === process.env.KLING_PRODUCT_TIER2_ID) return 2
  return null
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly kling: KlingService,
  ) {}

  // ── Checkout ──────────────────────────────────────────────────────────────

  async createCheckout(user: User, tier: 1 | 2): Promise<{ url: string; sessionId: string }> {
    const productId = TIER_PRODUCTS[tier]
    if (!productId) throw new BadRequestException(`KLING_PRODUCT_TIER${tier}_ID not configured`)

    const customerId = await this.ensureKlingCustomer(user)
    const base = process.env.FRONTEND_URL ?? 'https://smurbok.is'

    const session = await this.kling.createCheckoutSession({
      customerId,
      productId,
      successUrl: `${base}/checkout-complete`,
      cancelUrl: `${base}/en/user`,
    })

    return { url: session.url, sessionId: session.id }
  }

  // ── Confirm (no-webhook fallback) ─────────────────────────────────────────

  async confirmCheckout(userId: string, sessionId: string): Promise<{ tier: number }> {
    const session = await this.kling.getCheckoutSession(sessionId)
    if (session.status !== 'complete') return { tier: 0 }

    const productId = session.product
    if (!productId) return { tier: 0 }

    const tier = tierForProduct(productId)
    if (tier == null) return { tier: 0 }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        klingCustomerId: session.customer ?? undefined,
        klingSubscriptionId: session.subscription ?? undefined,
      },
    })

    return { tier }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancelSubscription(user: User): Promise<void> {
    if (!user.klingSubscriptionId) throw new NotFoundException('No active subscription')
    await this.kling.cancelSubscription(user.klingSubscriptionId, false)
    // Tier downgrade happens via webhook when subscription.canceled fires
  }

  // ── Billing portal ────────────────────────────────────────────────────────

  async getBillingPortalUrl(user: User): Promise<{ url: string }> {
    if (!user.klingCustomerId) throw new NotFoundException('No billing account found')
    const base = process.env.FRONTEND_URL ?? 'https://smurbok.is'
    return this.kling.createBillingPortalSession(user.klingCustomerId, `${base}/en/user`)
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const secret = process.env.KLING_WEBHOOK_SECRET
    if (!secret) throw new Error('KLING_WEBHOOK_SECRET not configured')

    if (!this.kling.verifySignature(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature')
    }

    const event = JSON.parse(rawBody.toString()) as { type: string; data: { object: any } }
    this.logger.log(`Kling webhook: ${event.type}`)

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.reactivated': {
        const sub = event.data.object
        await this.applySubscription(sub.customer, sub.product, sub.id)
        break
      }
      case 'subscription.canceled': {
        const sub = event.data.object
        await this.prisma.user.updateMany({
          where: { klingSubscriptionId: sub.id },
          data: { tier: 0, klingSubscriptionId: null },
        })
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object
        if (!session.subscription) break
        // Product is on the session when created with product_id
        if (session.product) {
          await this.applySubscription(session.customer, session.product, session.subscription)
        }
        break
      }
      case 'payment_intent.failed': {
        const pi = event.data.object
        this.logger.warn(`Payment failed for customer ${pi.customer ?? 'unknown'}: ${pi.id}`)
        break
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async applySubscription(klingCustomerId: string, productId: string, subscriptionId: string): Promise<void> {
    const tier = tierForProduct(productId)
    if (tier == null) {
      this.logger.warn(`Unknown product ${productId} in webhook`)
      return
    }
    const result = await this.prisma.user.updateMany({
      where: { klingCustomerId },
      data: { tier, klingSubscriptionId: subscriptionId },
    })
    if (result.count === 0) {
      this.logger.warn(`No user found for Kling customer ${klingCustomerId}`)
    }
  }

  private async ensureKlingCustomer(user: User): Promise<string> {
    if (user.klingCustomerId) return user.klingCustomerId

    let customer = await this.kling.findCustomerByExternalId(user.id)
    if (!customer) {
      customer = await this.kling.createCustomer(user.id, user.email, user.displayName)
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { klingCustomerId: customer.id },
    })

    return customer.id
  }
}
