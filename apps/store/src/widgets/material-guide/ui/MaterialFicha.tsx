import { ChevronDown, Check, Play } from 'lucide-react'
import { materialAnchor } from '@estrelinha/core/material'
import { ESTRELINHA_ICONS } from '@/shared/ui/icons'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import type { AvisoDaFicha, FichaDeMaterial } from '../model/guide'
import { videoDoMaterial } from '../model/videos'

/**
 * Uma ficha rica: quantidade, recipientes, os passos ilustrados e os avisos (`5MC-0` / `6AU-0`).
 *
 * **Acordeão no celular, aberta no computador** — é o que os dois artboards desenham, e a diferença
 * não é estética: com tudo aberto a página passa de 6.700px no mobile, e quem veio pelo link
 * `#cinzas` teria de rolar por duas fichas que não são a dela. Quem decide é `compacta`, resolvido
 * uma vez pela página e passado para cá — sete fichas consultando `matchMedia` por conta própria
 * seriam sete assinaturas do mesmo evento.
 *
 * **O que o acordeão esconde são DOIS blocos**, um em cada coluna do desktop: a identificação
 * (quantidade, recipientes, vídeo) e o preparo (passos, avisos). O título precisa ficar no topo da
 * coluna da esquerda para o desenho do board fechar, então não há um invólucro único para controlar.
 * `aria-controls` aceita lista de ids, e é assim que o botão diz a verdade sobre as duas regiões em
 * vez de apontar para metade delas.
 */

const Aviso = ({ aviso }: { aviso: AvisoDaFicha }) => {
  const Icone = aviso.icone ? ESTRELINHA_ICONS[aviso.icone] : null

  // `alerta` é erro que estraga o material; `calma` é informação que tranquiliza. A barra à esquerda
  // separa os dois de relance, antes de a frase ser lida.
  if (aviso.tom === 'alerta') {
    return (
      <p className="flex h-full items-start gap-3 rounded-[2px] border-l-[3px] border-[#9E4A3E] bg-[#F7EDE8] px-5 py-4 text-[14px] font-light leading-6 text-estrelinha-ink md:px-[22px] md:py-5">
        <span
          aria-hidden
          className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#9E4A3E] text-[13px] font-bold text-[#9E4A3E]"
        >
          !
        </span>
        <span>{aviso.texto}</span>
      </p>
    )
  }

  return (
    <p className="flex h-full items-start gap-3 rounded-md bg-estrelinha-serenity px-5 py-4 text-[14px] font-light leading-6 text-estrelinha-ink md:px-[26px] md:py-[22px]">
      {Icone ? (
        <Icone className="mt-0.5 h-[22px] w-[22px] shrink-0 text-estrelinha-primary" aria-hidden />
      ) : (
        <Check className="mt-0.5 h-[22px] w-[22px] shrink-0 text-estrelinha-primary" aria-hidden />
      )}
      <span>{aviso.texto}</span>
    </p>
  )
}

interface MaterialFichaProps {
  ficha: FichaDeMaterial
  /** Viewport de celular: a ficha vira acordeão. */
  compacta: boolean
  aberta: boolean
  onAlternar: () => void
  /** Abre o vídeo desta ficha em tela cheia. */
  onVerVideo: (videoId: string) => void
}

const MaterialFicha = ({ ficha, compacta, aberta, onAlternar, onVerVideo }: MaterialFichaProps) => {
  const Icone = ESTRELINHA_ICONS[ficha.icone]
  const anchor = materialAnchor(ficha.kind)
  const video = videoDoMaterial(ficha.kind)
  const idDetalhes = `ficha-${anchor}-detalhes`
  const idPreparo = `ficha-${anchor}-preparo`
  const visivel = !compacta || aberta

  return (
    <article
      id={anchor}
      className="scroll-mt-24 border-t border-estrelinha-line pt-6 md:pt-14"
      aria-labelledby={`ficha-${anchor}-titulo`}
    >
      {/*
        As âncoras dos materiais que esta ficha atende por tabela (pelo de pet, penas). São alvos de
        rolagem sem caixa própria: a página do produto endereça por `MaterialKind`, e o preparo dos
        três é o mesmo. Um `<span>` vazio com `id` é o objeto mais honesto — não inventa uma seção que
        não existe nem duplica o conteúdo dela.
      */}
      {(ficha.tambem ?? []).map(kind => (
        <span key={kind} id={materialAnchor(kind)} className="block scroll-mt-24" aria-hidden />
      ))}

      <div className="flex flex-col gap-5 md:flex-row md:gap-16">
        {/* Coluna da identificação: quem é o material, quanto, em quê. */}
        <div className="flex flex-col items-start gap-4 md:w-[340px] md:shrink-0 md:gap-[22px]">
          <h3 id={`ficha-${anchor}-titulo`} className="w-full">
            <button
              type="button"
              onClick={onAlternar}
              aria-expanded={compacta ? aberta : undefined}
              aria-controls={compacta ? `${idDetalhes} ${idPreparo}` : undefined}
              disabled={!compacta}
              className="flex w-full items-center gap-3 text-left disabled:cursor-default"
            >
              <Icone
                className="h-7 w-7 shrink-0 text-estrelinha-ink md:h-[30px] md:w-[30px]"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[21px] font-normal leading-[30px] text-estrelinha-ink md:text-[28px] md:leading-[34px]">
                  {ficha.titulo}
                </span>
                {/* A prévia do acordeão fechado: quantidade e se tem vídeo. Só no celular. */}
                <span className="block text-[13px] font-medium text-estrelinha-ink-soft md:hidden">
                  {ficha.quantidade.valor}
                  {video ? ' · com vídeo' : ''}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className={`h-5 w-5 shrink-0 text-estrelinha-ink-soft transition-transform md:hidden ${
                  aberta ? 'rotate-180' : ''
                }`}
              />
            </button>
          </h3>

          <div
            id={idDetalhes}
            className={`w-full flex-col items-start gap-4 md:gap-[22px] ${visivel ? 'flex' : 'hidden'}`}
          >
            <div className="flex w-full flex-col gap-0.5 border-l-[3px] border-estrelinha-accent bg-estrelinha-ground px-5 py-5 md:px-6">
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink-soft md:text-[13px]">
                Quantidade
              </span>
              <span className="font-display text-[34px] font-bold leading-[44px] tracking-[-0.02em] text-estrelinha-primary md:text-[44px] md:leading-[54px]">
                {ficha.quantidade.valor}
              </span>
              <span className="text-[14px] font-light leading-[18px] text-estrelinha-ink-soft">
                {ficha.quantidade.nota}
              </span>
            </div>

            <div className="flex w-full flex-col gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink-soft md:text-[13px]">
                {ficha.listaTitulo}
              </p>
              <ul className="flex flex-col gap-3">
                {ficha.lista.map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check
                      className="mt-1 h-[18px] w-[18px] shrink-0 text-estrelinha-accent-strong"
                      aria-hidden
                    />
                    <span className="text-[16px] font-light leading-[26px] text-estrelinha-ink md:text-[17px]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/*
              O botão do vídeo é AÇÃO, então `rounded-sm` e não a pílula do board: a loja separou ação
              de rótulo na feature 19, e `buttonShape.test.ts` mantém a separação viva. A pílula desta
              página ficou com os atalhos por material, que são rótulos de verdade.
            */}
            {video && (
              <button
                type="button"
                onClick={() => onVerVideo(video.id)}
                className="inline-flex items-center gap-2.5 rounded-sm bg-estrelinha-primary px-5 py-3 text-[14px] font-semibold tracking-[0.03em] text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong"
              >
                <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden />
                <span>
                  Ver o vídeo
                  {video.duracao ? ` · ${video.duracao}` : ''}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Coluna do preparo: os passos e os avisos. */}
        <div
          id={idPreparo}
          className={`flex-1 flex-col gap-6 md:gap-7 ${visivel ? 'flex' : 'hidden'}`}
        >
          <p className="flex items-center gap-4">
            <span className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-estrelinha-ink md:text-[13px]">
              Como preparar e embalar
            </span>
            <span className="h-px flex-1 bg-estrelinha-line" aria-hidden />
          </p>

          {/*
            No desktop os passos dividem a linha; no mobile empilham com a miniatura à esquerda — uma
            fita horizontal de quatro cartões a 390px é exatamente o que faz o `body` rolar na
            horizontal, o defeito que o `CLAUDE.md` registra da `ProductPage`.
          */}
          <ol className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
            {ficha.passos.map((passo, indice) => {
              const IconePasso = ESTRELINHA_ICONS[passo.icone]
              return (
                <li
                  key={passo.texto}
                  className="flex min-w-0 items-center gap-4 md:flex-1 md:flex-col md:items-stretch md:gap-3.5"
                >
                  <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-md bg-estrelinha-ground md:h-[134px] md:w-full">
                    <IconePasso
                      className="h-10 w-10 text-estrelinha-primary md:h-[60px] md:w-[60px]"
                      aria-hidden
                    />
                    {/*
                      O selo numerado sai `ink` sobre ouro (4,78:1), e não `on-primary` como no board:
                      creme sobre `accent` mede 2,52:1 e o algarismo some. O ouro do selo é o que o
                      board quer; a cor do número é o que a leitura exige.
                    */}
                    <span
                      aria-hidden
                      className="absolute left-2 top-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-estrelinha-accent text-[13px] font-bold text-estrelinha-ink md:left-3 md:top-3"
                    >
                      {indice + 1}
                    </span>
                  </div>
                  <p className="min-w-0 text-[15px] font-light leading-[26px] text-estrelinha-ink md:text-[17px]">
                    {passo.texto}
                  </p>
                </li>
              )
            })}
          </ol>

          <div className="flex flex-col gap-3 md:flex-row md:gap-6">
            {ficha.avisos.map(aviso => (
              <div key={aviso.texto} className="flex-1">
                <Aviso aviso={aviso} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* No celular a ficha aberta é longa: fechar também por baixo evita rolar de volta ao título. */}
      {compacta && aberta && (
        <button
          type="button"
          onClick={onAlternar}
          className={`${TAP_ROW} mt-5 text-[14px] font-medium text-estrelinha-primary md:hidden`}
        >
          Fechar {ficha.titulo.toLowerCase()}
        </button>
      )}
    </article>
  )
}

export default MaterialFicha
