// Feature 61 — o texto e a formatação dos cartões da seção Analytics, fora dos arquivos de
// componente: o Fast Refresh só preserva estado de arquivo que exporta apenas componentes, e os
// testes leem estas frases diretamente (`AnalyticsPanel.test.tsx`).

const FUSO = 'America/Sao_Paulo'

/** "Hoje, 14:32" quando foi hoje no fuso da loja; "03/10/2026, 14:32" quando não. */
export const formatSentAt = (iso: string, agora: Date = new Date()): string => {
  const quando = new Date(iso)
  const dia = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: FUSO })
  const hora = quando.toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${dia(quando) === dia(agora) ? 'Hoje' : dia(quando)}, ${hora}`
}

/** A frase de cada recorte, com plural de verdade — "1 compras" é o tipo de descuido que se lê. */
export const declinedSentence = (n: number): string =>
  n === 1
    ? '1 compra aprovada ficou fora porque a cliente desligou as estatísticas.'
    : `${n} compras aprovadas ficaram fora porque a cliente desligou as estatísticas.`

export const failedSentence = (n: number): string =>
  n === 1
    ? '1 compra aprovada não chegou ao Google porque o envio falhou.'
    : `${n} compras aprovadas não chegaram ao Google porque o envio falhou.`

/** O passo a passo de `SecretHelpCard` (`ANL-07`). */
export const SECRET_HELP_STEPS: readonly string[] = [
  'No Google Analytics, abra Administrador (a engrenagem).',
  'Coleta e modificação de dados → Fluxos de dados → o fluxo com o ID acima.',
  'Chaves secretas da API do Measurement Protocol → Criar. Dê um apelido, como “loja nova”.',
  'Copie o “Valor da chave secreta” e cole em Substituir, no cartão das chaves.',
]
