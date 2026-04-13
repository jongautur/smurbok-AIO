export type Lang = 'is' | 'en'

// ── Reminder type labels ──────────────────────────────────────────────────────

export const reminderTypeLabels: Record<string, Record<Lang, string>> = {
  OIL_CHANGE:         { en: 'Oil change',         is: 'Olíuskipti' },
  INSPECTION:         { en: 'Inspection',          is: 'Skoðun' },
  INSURANCE_RENEWAL:  { en: 'Insurance renewal',   is: 'Endurnýjun tryggingar' },
  TAX_DUE:            { en: 'Tax due',             is: 'Gjalddagi skatts' },
  TIRE_CHANGE:        { en: 'Tire change',         is: 'Dekkaskipti' },
  OTHER:              { en: 'Other',               is: 'Annað' },
}

// ── Stage labels ──────────────────────────────────────────────────────────────

export const stageLabels: Record<number, Record<Lang, string>> = {
  14: { en: 'due in 14 days', is: 'gjalddagi eftir 14 daga' },
  7:  { en: 'due in 7 days',  is: 'gjalddagi eftir 7 daga' },
  0:  { en: 'due today',      is: 'gjalddagi í dag' },
}

// ── Email copy ────────────────────────────────────────────────────────────────

export const copy = {
  reminder: {
    label:               { en: 'REMINDER',            is: 'ÁMINNING' },
    vehicle:             { en: 'Vehicle',              is: 'Bifreið' },
    licensePlate:        { en: 'License plate',        is: 'Númeraplata' },
    dueDate:             { en: 'Due date',             is: 'Eindagi' },
    dueAt:               { en: 'Due at',               is: 'Gjalddagi við' },
    km:                  { en: 'km',                   is: 'km' },
    estimatedFromMileage:{ en: '(estimated from mileage)', is: '(metið út frá km-stöðu)' },
    note:                { en: 'Note',                 is: 'Athugasemd' },
    unsubscribe:         { en: 'Unsubscribe from reminders', is: 'Afskrá frá áminningum' },
    body: (lang: Lang, name: string, stage: string) => lang === 'is'
      ? `Hæ ${name}, þetta er áminning um að framangreind þjónusta er ${stage} á þínu ökutæki. Skráðu þig inn á Smurbók til að merkja það sem gert eða fresta.`
      : `Hi ${name}, this is a reminder that the above service is ${stage} for your vehicle. Log in to Smurbók to mark it as done or snooze it.`,
    subjectToday: (lang: Lang, type: string, plate: string) => lang === 'is'
      ? `Áminning í dag: ${type} — ${plate}`
      : `Reminder due today: ${type} — ${plate}`,
    subjectDays: (lang: Lang, days: number, type: string, plate: string) => lang === 'is'
      ? `Áminning eftir ${days} daga: ${type} — ${plate}`
      : `Reminder in ${days} days: ${type} — ${plate}`,
  },

  workOrderCompleted: {
    label:           { en: 'WORK ORDER COMPLETED',  is: 'VERKPÖNTUN LOKIÐ' },
    licensePlate:    { en: 'License plate',          is: 'Númeraplata' },
    workshop:        { en: 'Workshop',               is: 'Verkstæði' },
    technician:      { en: 'Technician',             is: 'Tæknimaður' },
    completed:       { en: 'Completed',              is: 'Lokið' },
    workDescription: { en: 'Work description',       is: 'Lýsing á vinnu' },
    preview: (lang: Lang, plate: string, workshop: string) => lang === 'is'
      ? `Vinnu lokið á ${plate} af ${workshop}`
      : `Work completed on ${plate} by ${workshop}`,
    body: (lang: Lang, name: string) => lang === 'is'
      ? `Hæ ${name}, vinnu á þínu ökutæki er lokið. Skráðu þig inn á Smurbók til að skoða verkpöntunina í heild sinni.`
      : `Hi ${name}, the work on your vehicle has been completed. Log in to Smurbók to view the full work order.`,
    subject: (lang: Lang, make: string, model: string, plate: string) => lang === 'is'
      ? `Vinnu lokið á þínum ${make} ${model} (${plate})`
      : `Work completed on your ${make} ${model} (${plate})`,
  },

  workOrderSigned: {
    label:           { en: 'WORK ORDER SIGNED',     is: 'VERKPÖNTUN STAÐFEST' },
    licensePlate:    { en: 'License plate',          is: 'Númeraplata' },
    workshop:        { en: 'Workshop',               is: 'Verkstæði' },
    technician:      { en: 'Technician',             is: 'Tæknimaður' },
    signed:          { en: 'Signed',                 is: 'Staðfest' },
    workDescription: { en: 'Work description',       is: 'Lýsing á vinnu' },
    preview: (lang: Lang, plate: string, workshop: string) => lang === 'is'
      ? `Verkpöntun staðfest á ${plate} af ${workshop}`
      : `Work order signed off on ${plate} by ${workshop}`,
    body: (lang: Lang, name: string) => lang === 'is'
      ? `Hæ ${name}, verkpöntun fyrir þitt ökutæki hefur verið staðfest með rafrænni undirskrift. Þjónustuskráin er nú hluti af sögu ökutækisins í Smurbók.`
      : `Hi ${name}, the work order for your vehicle has been digitally signed off. The service record is now part of your vehicle's history in Smurbók.`,
    subject: (lang: Lang, make: string, model: string, plate: string) => lang === 'is'
      ? `Verkpöntun staðfest á þínum ${make} ${model} (${plate})`
      : `Work order signed off on your ${make} ${model} (${plate})`,
  },

  footer: { en: 'Smurbók · smurbok.is', is: 'Smurbók · smurbok.is' },
} as const

export function tr<T>(field: Record<Lang, T>, lang: Lang): T {
  return field[lang]
}
