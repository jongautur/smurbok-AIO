import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { copy, tr, type Lang } from './translations'

interface Props {
  lang: Lang
  userName: string
  vehicleName: string
  licensePlate: string
  workshopName: string
  technicianName?: string
  description: string
  completedAt: string
}

export function WorkOrderCompletedEmail({ lang, userName, vehicleName, licensePlate, workshopName, technicianName, description, completedAt }: Props) {
  const c = copy.workOrderCompleted
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{c.preview(lang, licensePlate, workshopName)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Smurbók</Heading>
          <Hr style={styles.hr} />

          <Text style={styles.label}>{tr(c.label, lang)}</Text>
          <Heading as="h2" style={styles.subheading}>{vehicleName}</Heading>

          <Section style={styles.card}>
            <Text style={styles.detail}><strong>{tr(c.licensePlate, lang)}:</strong> {licensePlate}</Text>
            <Text style={styles.detail}><strong>{tr(c.workshop, lang)}:</strong> {workshopName}</Text>
            {technicianName && <Text style={styles.detail}><strong>{tr(c.technician, lang)}:</strong> {technicianName}</Text>}
            <Text style={styles.detail}><strong>{tr(c.completed, lang)}:</strong> {completedAt}</Text>
            <Hr style={styles.innerHr} />
            <Text style={styles.detail}><strong>{tr(c.workDescription, lang)}:</strong></Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </Section>

          <Text style={styles.bodyText}>{c.body(lang, userName)}</Text>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>{tr(copy.footer, lang)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body:            { backgroundColor: '#f6f6f6', fontFamily: 'sans-serif' },
  container:       { margin: '0 auto', padding: '20px 0 48px', width: '560px' },
  heading:         { fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 8px' },
  subheading:      { fontSize: '20px', color: '#111827', margin: '0 0 16px' },
  label:           { fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' as const },
  hr:              { borderColor: '#e5e7eb', margin: '16px 0' },
  innerHr:         { borderColor: '#e5e7eb', margin: '12px 0' },
  card:            { background: '#fff', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' },
  detail:          { fontSize: '14px', color: '#374151', margin: '4px 0' },
  descriptionText: { fontSize: '14px', color: '#6b7280', margin: '4px 0', fontStyle: 'italic' as const },
  bodyText:        { fontSize: '14px', color: '#6b7280', lineHeight: '24px' },
  footer:          { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const },
}
