import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { copy, tr, type Lang } from './translations'

interface Props {
  lang: Lang
  userName: string
  vehicleName: string
  licensePlate: string
  reminderType: string
  dueDate: string
  stage: string
  dueMileage?: number
  note?: string
}

export function ReminderDueEmail({ lang, userName, vehicleName, licensePlate, reminderType, dueDate, stage, dueMileage, note }: Props) {
  const c = copy.reminder
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{reminderType} — {licensePlate} — {stage}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Smurbók</Heading>
          <Hr style={styles.hr} />

          <Text style={styles.label}>{tr(c.label, lang)} — {stage.toUpperCase()}</Text>
          <Heading as="h2" style={styles.subheading}>{reminderType}</Heading>

          <Section style={styles.card}>
            <Text style={styles.detail}><strong>{tr(c.vehicle, lang)}:</strong> {vehicleName}</Text>
            <Text style={styles.detail}><strong>{tr(c.licensePlate, lang)}:</strong> {licensePlate}</Text>
            <Text style={styles.detail}>
              <strong>{tr(c.dueDate, lang)}:</strong> {dueDate}
              {dueMileage ? ` ${tr(c.estimatedFromMileage, lang)}` : ''}
            </Text>
            {dueMileage && (
              <Text style={styles.detail}>
                <strong>{tr(c.dueAt, lang)}:</strong> {dueMileage.toLocaleString()} {tr(c.km, lang)}
              </Text>
            )}
            {note && <Text style={styles.detail}><strong>{tr(c.note, lang)}:</strong> {note}</Text>}
          </Section>

          <Text style={styles.bodyText}>{c.body(lang, userName, stage)}</Text>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>{tr(copy.footer, lang)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body:      { backgroundColor: '#f6f6f6', fontFamily: 'sans-serif' },
  container: { margin: '0 auto', padding: '20px 0 48px', width: '560px' },
  heading:   { fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 8px' },
  subheading:{ fontSize: '20px', color: '#111827', margin: '0 0 16px' },
  label:     { fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' as const },
  hr:        { borderColor: '#e5e7eb', margin: '16px 0' },
  card:      { background: '#fff', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' },
  detail:    { fontSize: '14px', color: '#374151', margin: '4px 0' },
  bodyText:  { fontSize: '14px', color: '#6b7280', lineHeight: '24px' },
  footer:    { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const },
}
