import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { NOTIFICATION_EVENT_NAMES, PUSH_EVENTS, type PushEvent } from '@estrelinha/core/notifications'

import { useRecusaDePapel } from '@/features/access-check'
import {
  APARELHO_DESCARTADO,
  AVISAR_NESTE_CELULAR,
  AVISOS_BLOQUEADOS,
  AVISOS_NESTE_CELULAR,
  ENVIAR_TESTE,
  NAO_ATIVOU,
  NAO_CONFERIU,
  NAO_GRAVOU_ESCOLHA,
  NAO_PAROU,
  PARAR_AVISOS,
  SEM_SUPORTE,
  TENTAR_DE_NOVO,
  TESTE_AGUARDE,
  TESTE_NAO_SAIU,
  usePushNoAparelho,
} from '@/features/push-notifications'
import { AVISO_DE_ERRO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from '@/shared/ui/campo'
import { Traco } from '@/shared/ui/leitura'

export const TITULO_DO_DOCUMENTO = 'Avisos neste celular · Ateliê'

/** O botão da tela: alvo de 48 px (`MAN-40`), desabilitado e `aria-busy` enquanto grava (`MAN-41`). */
const Botao = ({
  children,
  onClick,
  ocupado = false,
  secundario = false,
}: {
  children: string
  onClick: () => void
  ocupado?: boolean
  secundario?: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={ocupado}
    aria-busy={ocupado || undefined}
    className={cn(
      secundario ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO,
      secundario && 'border border-estrelinha-primary',
      'disabled:opacity-60',
    )}
  >
    {children}
  </button>
)

/**
 * Um interruptor como LINHA INTEIRA tocável (design §4.5, `MAN-40`): o `<label>` envolve o controle,
 * a linha tem `min-h-12` e é o alvo. O controle é um `<input type="checkbox" role="switch">` — nome
 * acessível = o texto do `<label>`, que é `NOTIFICATION_EVENT_NAMES[evento]`. Não é o `Switch` de
 * `packages/ui`: o polegar dele anima por classe que este app não alcança, e todo movimento da tela
 * tem par `motion-reduce:` (`MAN-41`).
 */
const Interruptor = ({
  evento,
  ligado,
  gravando,
  bloqueado,
  onTrocar,
}: {
  evento: PushEvent
  ligado: boolean
  gravando: boolean
  bloqueado: boolean
  onTrocar: (ligar: boolean) => void
}) => (
  <label
    data-testid="linha-do-interruptor"
    className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-2"
  >
    {/* `break-words hyphens-auto`: com a fonte do sistema a 200 % em 360 px, "Pagamento" é mais largo
        que a caixa e, sem quebra, passava por baixo do trilho (T28, `prova-navegador.md`). */}
    <span className="min-w-0 flex-1 break-words text-base text-estrelinha-ink hyphens-auto">{NOTIFICATION_EVENT_NAMES[evento]}</span>
    <input
      type="checkbox"
      role="switch"
      className="peer sr-only"
      checked={ligado}
      disabled={bloqueado}
      aria-busy={gravando || undefined}
      onChange={(e) => onTrocar(e.target.checked)}
    />
    <span
      aria-hidden="true"
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-estrelinha-field transition-colors motion-reduce:transition-none peer-checked:bg-estrelinha-primary peer-focus-visible:ring-2 peer-focus-visible:ring-estrelinha-primary peer-focus-visible:ring-offset-2 peer-disabled:opacity-60"
    >
      <span
        className={cn(
          'block h-5 w-5 rounded-full bg-estrelinha-surface shadow-sm transition-transform motion-reduce:transition-none',
          ligado ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </span>
  </label>
)

/** O título da página, focável por script sem entrar na ordem do Tab (o molde de `FolhaDoRastreio`). */
const focarTitulo = () => {
  const h1 = document.querySelector<HTMLElement>('main h1')
  if (!h1) return
  if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
  h1.focus({ preventScroll: true })
}

/** O foco caiu no `<body>` (o controle saiu da tela ou foi desabilitado enquanto gravava)? */
const focoPerdido = () => !document.activeElement || document.activeElement === document.body

/**
 * Devolve o foco a quem disparou a ação, se ele ainda está na tela e habilitado; se saiu, ao título.
 * Só quando o foco CAIU no `<body>`: o que a pessoa levou a outro lugar no meio não é roubado.
 */
const devolverFoco = (origem: HTMLElement | null) => {
  if (!focoPerdido()) return
  if (origem && origem.isConnected && !(origem as HTMLButtonElement).disabled) origem.focus({ preventScroll: true })
  else focarTitulo()
}

/** A frase de falha de uma ação, viva (`role="alert"`). */
const Falha = ({ children }: { children: string }) => (
  <p role="alert" className={AVISO_DE_ERRO}>
    {children}
  </p>
)

/**
 * O conteúdo da tela. Os estados são EXCLUSIVOS (`L-063`): cada um desenha a sua frase e os seus
 * controles, e nenhum outro.
 */
const Avisos = ({ reler }: { reler: () => void }) => {
  const avisos = usePushNoAparelho()
  const { estado } = avisos
  const [recusaDaAcao, setRecusaDaAcao] = useState<unknown>(null)

  // A recusa de papel (`42501`) — lida ao abrir, ou relançada por uma ação — vai à vigia da `72`, que
  // reconfere o papel UMA vez por episódio; o `RequireAdmin` leva à recusa. Rede nunca é recusa.
  const leituraBoa = !avisos.recusa && estado.tipo !== 'verificando' && !(estado.tipo === 'erro' && estado.motivo === 'ler')
  const recusada = useRecusaDePapel([avisos.recusa, recusaDaAcao], leituraBoa)

  const agir = useCallback(
    (acao: () => Promise<void>) => () => {
      origemDoFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      acao().catch((e: unknown) => {
        if (isAccessDenied(e)) setRecusaDaAcao(e)
      })
    },
    [],
  )

  // QA da `79` (BUG-20261025-foco-cai-no-body-nos-avisos): o controle tocado sai da tela (ativar,
  // parar) ou fica desabilitado enquanto grava (`MAN-41`), e o navegador tira o foco dele. Quando a
  // ação termina, o foco volta a ele ou, se ele saiu, ao título — nunca fica no `<body>`.
  const origemDoFoco = useRef<HTMLElement | null>(null)
  const emCurso = estado.tipo === 'ativando' || avisos.gravando !== null || avisos.parando || avisos.testando
  useEffect(() => {
    if (emCurso || !origemDoFoco.current) return
    const origem = origemDoFoco.current
    origemDoFoco.current = null
    devolverFoco(origem)
  })

  if (recusada || estado.tipo === 'verificando') {
    // Esqueleto: nenhuma frase de estado e nenhum botão ativo enquanto a tela não sabe o que dizer.
    return (
      <div data-testid="avisos-verificando" aria-busy="true" className="space-y-3">
        <Traco className="h-12 w-full" />
        <Traco className="h-12 w-full" />
      </div>
    )
  }

  if (estado.tipo === 'sem-suporte') return <p className="text-base text-estrelinha-ink">{SEM_SUPORTE}</p>

  if (estado.tipo === 'bloqueado') return <p className="text-base text-estrelinha-ink">{AVISOS_BLOQUEADOS}</p>

  if (estado.tipo === 'erro' && estado.motivo === 'ler') {
    return (
      <div className="space-y-4">
        <Falha>{NAO_CONFERIU}</Falha>
        <Botao secundario onClick={reler}>
          {TENTAR_DE_NOVO}
        </Botao>
      </div>
    )
  }

  if (estado.tipo !== 'ligado') {
    // `desligado`, `ativando` e o `erro` de ativar: o mesmo botão, e nenhum interruptor (`MAN-16`).
    return (
      <div className="space-y-4">
        {estado.tipo === 'erro' && <Falha>{NAO_ATIVOU}</Falha>}
        {/* O servidor apagou a inscrição (o 410 do teste, o 404 de um interruptor): a tela voltou ao
            começo e diz por quê (BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada). */}
        {estado.tipo === 'desligado' && avisos.descartado && <Falha>{APARELHO_DESCARTADO}</Falha>}
        <Botao onClick={agir(avisos.ativar)} ocupado={estado.tipo === 'ativando'}>
          {AVISAR_NESTE_CELULAR}
        </Botao>
      </div>
    )
  }

  const ocupado = avisos.parando
  return (
    <div className="space-y-6">
      <fieldset className="min-w-0">
        <legend className="sr-only">{AVISOS_NESTE_CELULAR}</legend>
        <div className="divide-y divide-estrelinha-line rounded-lg border border-estrelinha-line bg-estrelinha-surface">
          {PUSH_EVENTS.map((evento) => (
            <Interruptor
              key={evento}
              evento={evento}
              ligado={estado.events.includes(evento)}
              gravando={avisos.gravando === evento}
              bloqueado={avisos.gravando !== null || ocupado}
              onTrocar={(ligar) => agir(() => avisos.alternar(evento, ligar))()}
            />
          ))}
        </div>
      </fieldset>
      {avisos.falhaAoGravar && <Falha>{NAO_GRAVOU_ESCOLHA}</Falha>}

      <div className="space-y-3">
        {avisos.falhaDoTeste === 'cooldown' && <Falha>{TESTE_AGUARDE}</Falha>}
        {avisos.falhaDoTeste === 'falhou' && <Falha>{TESTE_NAO_SAIU}</Falha>}
        <Botao secundario onClick={agir(avisos.testar)} ocupado={avisos.testando || ocupado}>
          {ENVIAR_TESTE}
        </Botao>
      </div>

      <div className="space-y-3">
        {avisos.falhaAoParar && <Falha>{NAO_PAROU}</Falha>}
        <Botao secundario onClick={agir(avisos.parar)} ocupado={ocupado}>
          {PARAR_AVISOS}
        </Botao>
      </div>
    </div>
  )
}

/**
 * "Avisos neste celular" (feature `79`, `MAN-10`..`MAN-17`, `MAN-31`..`MAN-33`, `MAN-39`..`MAN-41`) —
 * rota `/avisos`, dentro do `RequireAdmin`, alcançada pelo menu da conta. Sem aba própria
 * (`ROTAS_DA_CONTA` em `abasSaoAsRotas.test.ts`).
 *
 * - **Abrir NUNCA pede permissão** (`MAN-10`): o pedido nasce do toque em "Avisar neste celular".
 * - Quem decide o estado é `usePushNoAparelho`; a tela só desenha (os textos de `frases.ts`).
 * - O `h1` existe em todo estado: o foco do `MobileLayout` vai a ele.
 * - "Tentar de novo" da leitura que falhou RELÊ remontando o conteúdo (a `key`), que é a leitura de
 *   abertura do hook — sem uma segunda leitura escrita aqui.
 */
const AvisosPage = () => {
  const [leitura, setLeitura] = useState(0)
  useEffect(() => {
    document.title = TITULO_DO_DOCUMENTO
  }, [])
  // "Tentar de novo" remonta o conteúdo e o botão sai da tela: o foco vai ao título (QA da `79`).
  useEffect(() => {
    if (leitura > 0 && focoPerdido()) focarTitulo()
  }, [leitura])
  return (
    <section className="space-y-6">
      <h1 className="font-display text-2xl">{AVISOS_NESTE_CELULAR}</h1>
      <Avisos key={leitura} reler={() => setLeitura((n) => n + 1)} />
    </section>
  )
}

export default AvisosPage
