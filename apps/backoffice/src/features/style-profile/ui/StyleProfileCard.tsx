// O card "Perfil de estilo da loja" — o último de Configurações › Dados da loja.
//
// A dona escolhe a paleta que a loja inteira veste, confere na loja de verdade sem salvar, e salva.
// Grava só `{ profile }` na chave `appearance`, e nada mais: o perfil muda só as cores, então não há
// conteúdo a apagar nem a regravar, e voltar ao Padrão é a mesma escolha.
//
// **Autocontido**, no molde das seções de Configurações: próprio estado, próprio salvamento. O
// vocabulário (os perfis, os nomes, as frases) é de `core/appearance`, e as cores das amostras são
// as do dono dos perfis (`ESTRELINHA_PROFILES`) — o painel não escreve uma segunda paleta. O painel
// também não veste o perfil: a prévia é a loja num iframe, outro documento.

import { useEffect, useState } from 'react'
import { Clock, ExternalLink, WifiOff } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@estrelinha/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import { cn } from '@estrelinha/ui/lib/utils'
import { ESTRELINHA_PROFILES } from '@estrelinha/ui/tokens/estrelinha'
import {
  STYLE_PROFILES,
  STYLE_PROFILE_COPY,
  STYLE_PROFILE_LABELS,
  styleProfilePreviewTitle,
  type StyleProfile,
} from '@estrelinha/core/appearance'
import { useStyleProfile } from '@estrelinha/core/hooks/useStyleProfile'
import { InfoBanner, SettingsSaveButton } from '@/shared/ui'
import { useSettingsSave } from '@/features/settings/model/useSettingsSave'
import StyleProfileLivePreview from './StyleProfileLivePreview'

/** As quatro amostras de cada opção, nesta ordem. */
const AMOSTRAS = ['primary-strong', 'primary', 'accent', 'ground-deep'] as const

/**
 * A miniatura da loja num perfil: cabeçalho, menu, três peças sobre o chão e a barra de ação.
 *
 * As peças são hachuradas na cor `ground-deep` do perfil, passada ao bloco pela variável
 * `--hachura`: a classe é uma só para os dois perfis, e a cor continua vindo do dono dos perfis.
 */
const HACHURA = 'bg-[repeating-linear-gradient(135deg,var(--hachura)_0_2px,transparent_2px_6px)]'

const Miniatura = ({ perfil }: { perfil: StyleProfile }) => {
  const cores = ESTRELINHA_PROFILES[perfil]
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-border">
      <div data-testid="miniatura-cabecalho" className="h-[22px]" style={{ backgroundColor: cores['primary-strong'] }} />
      <div data-testid="miniatura-departamentos" className="h-3" style={{ backgroundColor: cores.primary }} />
      <div className="flex gap-1.5 p-2" style={{ backgroundColor: cores.ground }}>
        {[0, 1, 2].map(n => (
          <div
            key={n}
            data-testid="miniatura-bloco"
            className={cn('h-[34px] flex-1 rounded', HACHURA)}
            style={{ '--hachura': cores['ground-deep'] } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="px-2 pb-2" style={{ backgroundColor: cores.ground }}>
        <div data-testid="miniatura-botao" className="h-3.5 rounded" style={{ backgroundColor: cores.primary }} />
      </div>
    </div>
  )
}

const StyleProfileCard = () => {
  const { profile: salvo, isLoading, readFailed, retry } = useStyleProfile()
  const { salvar, salvando, semConexao } = useSettingsSave()
  // Lendo, ou com a leitura falhando, o card não sabe qual perfil está salvo: nenhum "Em uso", e
  // nada para escolher nem salvar. Na falha o `salvo` é o Padrão de recuo, e afirmá-lo levaria a
  // dona a crer que a loja já voltou ao Padrão.
  const semSalvo = isLoading || readFailed

  const [escolhido, setEscolhido] = useState<StyleProfile>(salvo)
  const [previaAberta, setPreviaAberta] = useState(false)

  useEffect(() => {
    setEscolhido(salvo)
  }, [salvo])

  const gravar = () =>
    void salvar('appearance', { profile: escolhido }, { title: STYLE_PROFILE_COPY.saved })

  return (
    <Card className="rounded-2xl" data-testid="card-perfil-de-estilo">
      <CardHeader>
        <h2 className="font-heading text-lg font-semibold leading-none tracking-tight">{STYLE_PROFILE_COPY.title}</h2>
        <CardDescription>{STYLE_PROFILE_COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="radiogroup"
          aria-label={STYLE_PROFILE_COPY.groupLabel}
          className="grid gap-3 lg:grid-cols-2"
        >
          {STYLE_PROFILES.map(perfil => {
            const marcado = escolhido === perfil
            const { name, description } = STYLE_PROFILE_LABELS[perfil]
            return (
              <label
                key={perfil}
                data-testid={`perfil-${perfil}`}
                className={cn(
                  'flex min-h-11 min-w-0 cursor-pointer flex-col gap-3 rounded-xl border-2 p-3 transition-colors motion-reduce:transition-none',
                  marcado ? 'border-estrelinha-admin-violet bg-estrelinha-admin-violet/[0.03]' : 'border-border',
                  semSalvo && 'cursor-not-allowed opacity-60',
                )}
              >
                <Miniatura perfil={perfil} />
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="radio"
                    name="perfil-de-estilo"
                    value={perfil}
                    checked={marcado}
                    disabled={semSalvo}
                    onChange={() => setEscolhido(perfil)}
                    className="h-5 w-5 shrink-0 accent-primary"
                  />
                  <span className="text-sm font-semibold text-foreground">{name}</span>
                  {salvo === perfil && !semSalvo && (
                    <span className="rounded-full border border-estrelinha-admin-emerald/20 bg-estrelinha-admin-emerald/10 px-2 py-0.5 text-xs font-semibold text-estrelinha-admin-emerald">
                      {STYLE_PROFILE_COPY.inUse}
                    </span>
                  )}
                </span>
                <span className="break-words text-xs text-muted-foreground">{description}</span>
                <span className="flex gap-1">
                  {AMOSTRAS.map(token => (
                    <span
                      key={token}
                      data-testid="amostra-de-cor"
                      data-cor={ESTRELINHA_PROFILES[perfil][token]}
                      className="h-5 w-5 rounded-[6px] border border-border"
                      style={{ backgroundColor: ESTRELINHA_PROFILES[perfil][token] }}
                    />
                  ))}
                </span>
              </label>
            )
          })}
        </div>

        {readFailed && (
          <div className="space-y-2" data-testid="perfil-leitura-falhou">
            <p role="alert" className="text-sm text-destructive">
              {STYLE_PROFILE_COPY.readFailed}
            </p>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={retry}>
              {STYLE_PROFILE_COPY.retry}
            </Button>
          </div>
        )}

        <InfoBanner icon={Clock} tone="neutro" data-testid="aviso-perfil-de-estilo">
          <p>{STYLE_PROFILE_COPY.notice}</p>
        </InfoBanner>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviaAberta(true)}
              className="h-11 w-full rounded-xl sm:w-auto"
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              {STYLE_PROFILE_COPY.previewAction}
            </Button>
          </div>
          <SettingsSaveButton
            testId="salvar-perfil-de-estilo"
            loading={salvando && !semConexao}
            disabled={semSalvo || salvando || escolhido === salvo}
            onClick={gravar}
          />
        </div>

        {/* Sem conexão a gravação fica na fila do React Query até a rede voltar, e sai sozinha. O
            botão não gira enquanto isso: girar diz "está salvando", e nada está saindo. */}
        {semConexao && (
          <InfoBanner icon={WifiOff} role="status" data-testid="perfil-sem-conexao">
            <p>{STYLE_PROFILE_COPY.offline}</p>
          </InfoBanner>
        )}
      </CardContent>

      <Dialog open={previaAberta} onOpenChange={setPreviaAberta}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[960px]">
          <DialogHeader>
            <DialogTitle>{styleProfilePreviewTitle(escolhido)}</DialogTitle>
            <DialogDescription>{STYLE_PROFILE_COPY.previewSubtitle}</DialogDescription>
          </DialogHeader>
          {previaAberta && <StyleProfileLivePreview profile={escolhido} />}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 rounded-xl">
                {STYLE_PROFILE_COPY.close}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default StyleProfileCard
