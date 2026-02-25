import type { MetricKey } from "./metrics"

export const METRIC_EXPLANATIONS: Record<
  MetricKey,
  {
    name: string
    shortName: string
    what: string
    why: string
    unit: string
    target: string
  }
> = {
  lcp: {
    name: "Maior Elemento Visível",
    shortName: "LCP",
    what: "Quanto tempo leva para o conteúdo principal da página aparecer.",
    why: "Os visitantes percebem o LCP como 'quando a página ficou pronta'. Um LCP lento faz as pessoas acharem que o site está quebrado ou não é confiável.",
    unit: "segundos",
    target: "Abaixo de 2,5s",
  },
  cls: {
    name: "Mudança de Layout Acumulada",
    shortName: "CLS",
    what: "O quanto a página se move enquanto carrega.",
    why: "Mudanças de layout causam cliques acidentais — um botão se move no momento em que alguém vai clicar. Em e-commerces isso pode gerar compras erradas.",
    unit: "pontuação (menor é melhor)",
    target: "Abaixo de 0,1",
  },
  inp: {
    name: "Interação até Próxima Pintura",
    shortName: "INP",
    what: "Com que rapidez a página responde quando alguém clica, toca ou digita.",
    why: "Páginas que travam após interações perdem usuários. INP acima de 200ms e as pessoas acham que algo quebrou.",
    unit: "milissegundos",
    target: "Abaixo de 200ms",
  },
  fcp: {
    name: "Primeira Pintura com Conteúdo",
    shortName: "FCP",
    what: "Quando o primeiro conteúdo (texto, imagem ou logo) aparece na tela.",
    why: "O FCP é o primeiro sinal de que 'algo está acontecendo'. Se nada aparecer em 2 segundos, os visitantes assumem que a página falhou.",
    unit: "segundos",
    target: "Abaixo de 1,8s",
  },
  ttfb: {
    name: "Tempo até o Primeiro Byte",
    shortName: "TTFB",
    what: "Com que rapidez o servidor envia o primeiro byte da página.",
    why: "O TTFB é totalmente do lado do servidor. TTFB lento significa hospedagem lenta, consultas lentas ao banco de dados ou código não otimizado — tudo mais espera por isso.",
    unit: "milissegundos",
    target: "Abaixo de 800ms",
  },
}

// Mapeia IDs de auditoria do Lighthouse → orientações de correção em português.
export const AUDIT_ACTIONS: Record<
  string,
  { title: string; fix: string; impact: "high" | "medium" | "low" }
> = {
  "render-blocking-resources": {
    title: "Remover CSS e JavaScript que bloqueiam a renderização",
    fix: "Arquivos estão carregando antes que a página possa exibir qualquer coisa. Adicione `defer` nas tags de script, insira o CSS crítico inline ou use `<link rel=preload>` para recursos importantes.",
    impact: "high",
  },
  "uses-optimized-images": {
    title: "Comprimir e modernizar as imagens",
    fix: "Imagens não comprimidas ou em formatos desatualizados. Converta para WebP/AVIF e comprima usando Squoosh (gratuito, squoosh.app) ou TinyPNG. Isso geralmente reduz o tamanho das imagens em 50–80%.",
    impact: "high",
  },
  "unused-javascript": {
    title: "Remover JavaScript que nunca é usado",
    fix: "JavaScript está sendo baixado e processado, mas nunca executado. Remova bibliotecas não utilizadas, divida seu bundle ou carregue o código sob demanda em páginas específicas.",
    impact: "high",
  },
  "server-response-time": {
    title: "Acelerar o tempo de resposta do servidor",
    fix: "Seu servidor demora muito para responder. Verifique consultas lentas ao banco de dados, ative cache no servidor (Redis, Varnish) ou melhore seu plano de hospedagem. Considere um CDN.",
    impact: "high",
  },
  "largest-contentful-paint-element": {
    title: "Otimizar o maior elemento de conteúdo",
    fix: "O elemento de conteúdo principal (geralmente uma imagem de destaque ou título) está demorando para carregar. Faça preload com `<link rel=preload>`, otimize o tamanho ou mova-o para mais cedo no HTML.",
    impact: "high",
  },
  "uses-long-cache-ttl": {
    title: "Cachear recursos estáticos por mais tempo",
    fix: "Os navegadores re-baixam imagens, fontes e scripts a cada visita. Defina `Cache-Control: max-age=31536000` (1 ano) para recursos que não mudam.",
    impact: "medium",
  },
  "uses-text-compression": {
    title: "Ativar compressão Gzip ou Brotli",
    fix: "Arquivos de texto (HTML, CSS, JS) estão sendo enviados sem compressão. Ative o Brotli no seu servidor ou CDN — reduz o tamanho transferido em 60–80% sem alterações no código.",
    impact: "medium",
  },
  "uses-responsive-images": {
    title: "Servir imagens no tamanho correto",
    fix: "Imagens são muito maiores do que o tamanho em que são exibidas. Use `srcset` para servir imagens menores em telas menores. Uma imagem de 1200px numa tela de 400px desperdiça 9x a largura de banda.",
    impact: "medium",
  },
  "offscreen-images": {
    title: "Carregar imagens fora da tela sob demanda",
    fix: "Imagens que não estão visíveis ao carregar a página estão sendo baixadas imediatamente. Adicione `loading='lazy'` nas tags `<img>` que ficam abaixo da área visível.",
    impact: "medium",
  },
  "unused-css-rules": {
    title: "Remover CSS não utilizado",
    fix: "Regras CSS estão sendo carregadas mas nunca aplicadas. Use PurgeCSS ou configure seu framework de CSS para incluir apenas os estilos que você realmente usa.",
    impact: "medium",
  },
  "unminified-javascript": {
    title: "Minificar os arquivos JavaScript",
    fix: "Arquivos JavaScript têm espaços em branco e comentários desnecessários. Ative a minificação na sua ferramenta de build (Webpack, Vite, etc.). No WordPress, use um plugin de cache.",
    impact: "low",
  },
  "unminified-css": {
    title: "Minificar os arquivos CSS",
    fix: "Arquivos CSS têm espaços em branco desnecessários. Ative a minificação de CSS na sua ferramenta de build ou adicione um plugin de minificação ao seu CMS.",
    impact: "low",
  },
  "uses-rel-preload": {
    title: "Fazer preload de recursos importantes",
    fix: "Recursos críticos (fontes, imagens de destaque, scripts-chave) são descobertos tarde. Adicione `<link rel=preload>` no seu `<head>` para que o navegador os busque mais cedo.",
    impact: "low",
  },
}

export type ActionItem = {
  auditId: string
  title: string
  fix: string
  impact: "high" | "medium" | "low"
  savings?: string
}

export function getActionPlan(lighthouseRaw: unknown): ActionItem[] {
  const lhr = lighthouseRaw as { audits?: Record<string, { score?: number | null; displayValue?: string }> }
  const audits = lhr?.audits ?? {}

  return Object.entries(AUDIT_ACTIONS)
    .filter(([auditId]) => {
      const audit = audits[auditId]
      return audit !== undefined && audit.score !== null && (audit.score ?? 1) < 0.9
    })
    .map(([auditId, action]) => ({
      auditId,
      ...action,
      savings: audits[auditId]?.displayValue,
    }))
    .sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
      return (order[a.impact] ?? 3) - (order[b.impact] ?? 3)
    })
    .slice(0, 8)
}
