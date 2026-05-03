'use client'

import { useEffect } from 'react'

export default function CheckoutCompletePage() {
  useEffect(() => {
    window.parent.postMessage(
      { source: 'kling-checkout', type: 'checkout:success', payload: {} },
      '*',
    )
  }, [])

  return null
}
