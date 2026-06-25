interface WhatsAppMessage {
  to:       string
  template: string
  params:   string[]
  language?: string
}

export async function sendWhatsAppNotification({ to, template, params, language = 'en' }: WhatsAppMessage) {
  const token    = process.env.WHATSAPP_API_TOKEN
  const phoneId  = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Missing credentials — notification skipped')
    return
  }

  // Normalise number: strip non-digits, ensure starts with country code
  const normalised = to.replace(/\D/g, '').replace(/^0/, '94')

  const payload = {
    messaging_product: 'whatsapp',
    to: normalised,
    type: 'template',
    template: {
      name:     template,
      language: { code: language },
      components: [
        {
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[WhatsApp] Send failed:', err)
  }
}
