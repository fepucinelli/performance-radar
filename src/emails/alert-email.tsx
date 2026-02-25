import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components"

interface MetricAlert {
  metric: "lcp" | "cls" | "inp"
  value: number
  threshold: number
}

interface AlertEmailProps {
  projectName: string
  projectUrl: string
  projectPageUrl: string
  alerts: MetricAlert[]
  auditTriggeredBy: "manual" | "cron" | "api"
}

const METRIC_LABELS: Record<string, string> = {
  lcp: "Largest Contentful Paint (LCP)",
  cls: "Cumulative Layout Shift (CLS)",
  inp: "Interaction to Next Paint (INP)",
}

function formatValue(metric: string, value: number): string {
  if (metric === "cls") return value.toFixed(3)
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`
}

export function AlertEmail({
  projectName,
  projectUrl,
  projectPageUrl,
  alerts,
  auditTriggeredBy,
}: AlertEmailProps) {
  const triggerLabel =
    auditTriggeredBy === "cron"
      ? "uma auditoria agendada"
      : auditTriggeredBy === "api"
        ? "uma auditoria via API"
        : "uma auditoria manual"

  return (
    <Html>
      <Head />
      <Preview>
        {`Alerta de performance: ${projectName} — ${alerts.length} métrica${alerts.length > 1 ? "s" : ""} ultrapassou o limite`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Alerta de Performance</Heading>
          <Text style={text}>
            Durante {triggerLabel} em{" "}
            <a href={projectUrl} style={link}>
              {projectUrl}
            </a>
            , {alerts.length > 1 ? "as seguintes métricas ultrapassaram os limites configurados" : "a seguinte métrica ultrapassou o limite configurado"}:
          </Text>

          <Section style={alertBox}>
            {alerts.map((a) => (
              <Row key={a.metric} style={alertRow}>
                <Column>
                  <Text style={metricLabel}>{METRIC_LABELS[a.metric] ?? a.metric}</Text>
                </Column>
                <Column style={{ textAlign: "right" as const }}>
                  <Text style={metricValue}>
                    {formatValue(a.metric, a.value)}{" "}
                    <span style={threshold}>(limite: {formatValue(a.metric, a.threshold)})</span>
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
            <Button href={projectPageUrl} style={button}>
              Ver Relatório Completo
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Você está recebendo este e-mail porque configurou alertas de performance para{" "}
            <strong>{projectName}</strong>. Gerencie suas configurações de alerta na página do projeto.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
}

const heading = {
  fontSize: "22px",
  fontWeight: "700" as const,
  color: "#111827",
  margin: "0 0 16px",
}

const text = {
  fontSize: "14px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const link = {
  color: "#2563eb",
  textDecoration: "none",
}

const alertBox = {
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  padding: "16px",
}

const alertRow = {
  marginBottom: "8px",
}

const metricLabel = {
  fontSize: "13px",
  fontWeight: "600" as const,
  color: "#92400e",
  margin: 0,
}

const metricValue = {
  fontSize: "13px",
  color: "#dc2626",
  fontWeight: "700" as const,
  margin: 0,
}

const threshold = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "normal" as const,
}

const button = {
  backgroundColor: "#111827",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  display: "inline-block",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
}

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "1.5",
}
