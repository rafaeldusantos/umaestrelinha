// Feature 46 / `FAQL-01`..`FAQL-15` — a página de perguntas frequentes da loja.
//
// A página é composição: quem sabe ordenar e agrupar é `resolveFaqPage` (`@estrelinha/core/faq`),
// quem sabe filtrar é `useFaqSearch`, quem sabe desenhar uma pergunta é `FaqQuestion`, e quem sabe
// o canal de contato é `PolicyContact`. Aqui ficam a moldura, os três estados e a cabeça do
// documento.
//
// **O fecho reusa `PolicyContact` inteiro**, e isso é uma divergência declarada do artboard: o board
// desenha um botão verde de WhatsApp, e o componente existente usa `primary` (navy). Um botão verde
// aqui exigiria uma segunda versão do componente que já é dono do bloco de contato em três páginas —
// e branco sobre `#25D366` mede ~1,9:1, que `contrast.test.ts` reprovaria de qualquer forma.

import { useEffect, useState } from 'react'
import { FAQ_PATH } from '@estrelinha/core/routes'
import { faqPageJsonLd } from '@estrelinha/core/faq'
import { FaqQuestion, FaqSubjectNav, faqSubjectId, useFaqPage, useFaqSearch } from '@/entities/faq'
import PolicyContact from '@/shared/ui/PolicyContact'
import Trilha, { COLUNA_INSTITUCIONAL } from '@/shared/ui/Trilha'
import { useCanonical } from '@/shared/lib/useCanonical'
import { useDocumentMeta } from '@/shared/lib/useDocumentMeta'
import { useJsonLd } from '@/shared/lib/useJsonLd'

const TITULO = 'Perguntas frequentes'
const DESCRICAO =
  'As dúvidas que mais chegam até a Uma Estrelinha — do material que você envia até os cuidados com a peça pronta.'

/** O `id` da pergunta que a URL pede, ou `null`. Sem o prefixo, é âncora de assunto, não de pergunta. */
const perguntaDaAncora = (hash: string): string | null => {
  const alvo = decodeURIComponent(String(hash ?? '').replace(/^#/, ''))
  return alvo.startsWith('p-') ? alvo.slice(2) : null
}

const FaqPage = () => {
  const { data, isLoading, error, refetch } = useFaqPage()
  const [termo, setTermo] = useState('')
  const { groups, matches, searching } = useFaqSearch(data, termo)

  // A âncora é lida **uma vez, no mount**: reagir a cada mudança de hash reabriria a pergunta que a
  // cliente acabou de fechar, porque clicar num assunto também troca o hash.
  const [ancora] = useState(() =>
    typeof window === 'undefined' ? null : perguntaDaAncora(window.location.hash),
  )

  useCanonical(FAQ_PATH)
  useDocumentMeta({ title: `${TITULO} · Uma Estrelinha`, description: DESCRICAO })
  // A origem vem do próprio navegador, e não de uma env: a página sabe onde está, e uma segunda
  // fonte para isso divergiria no dia do cutover de domínio. O `url` do JSON-LD precisa ser
  // absoluto — relativo, o rastreador o resolve contra a base que achar.
  useJsonLd(
    data && data.length > 0
      ? faqPageJsonLd(data, {
          url: typeof window === 'undefined' ? undefined : `${window.location.origin}${FAQ_PATH}`,
        })
      : null,
  )

  // Com o `<details>` da pergunta-alvo aberto, leva a viewport até ela. O navegador já faz isso em
  // carregamento normal, mas a página monta **depois** da leitura — quando o alvo aparece, o
  // documento já rolou.
  useEffect(() => {
    if (!ancora || !data) return
    document.getElementById(`p-${ancora}`)?.scrollIntoView({ block: 'start' })
  }, [ancora, data])

  return (
    <article className="flex flex-col">
      {/* A trilha é a MESMA das outras institucionais — `shared/ui/Trilha`, o componente que a
          Sobre e as políticas já usam. A que morava aqui era uma quarta escrita do mesmo degrau,
          com outro separador (`/` em vez do chevron), outra escala (12/13 contra 13/14), sem o
          `aria-current="page"` e sem o alvo de toque do `TAP_ROW`. Nada disso quebrava nada: as
          quatro trilhas simplesmente divergiam, que é o "defeito 01" na navegação. */}
      <Trilha paginaAtual={TITULO} />

      <div className={`${COLUNA_INSTITUCIONAL} pb-8 pt-9 md:pb-14 md:pt-14`}>
        {/* A FAIXA DE ABERTURA — board `EKT-0`: título à esquerda, busca à direita, alinhados pela
            BASE (`items-end`) e separados por `justify-between`.

            **A virada é em `lg`, e não em `md`, porque foi medida.** O board desenha 620 + 60 + 420
            = 1100px de conteúdo; em `md` (768) sobram 728 depois do respiro, e as duas colunas
            lado a lado empurrariam a faixa para fora da tela. É a mesma razão pela qual o resto
            desta página só vira duas colunas em `lg`.

            `lg:min-w-0` no bloco do título não é zelo: o mínimo automático de um item flex é o
            min-content dele, e um `<h1>` de 48px não encolhe sem isso — a faixa estouraria a
            largura em 1024 exatamente como a página do produto estourou na `27`. */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-[60px]">
          <div className="flex flex-col gap-3 md:max-w-[620px] lg:min-w-0 lg:flex-1">
            <h1 className="font-display text-[34px] leading-[41px] tracking-tight text-estrelinha-ink md:text-[48px] md:leading-[58px]">
              {TITULO}
            </h1>
            <p className="text-[15px] font-light leading-[26px] text-estrelinha-ink-soft md:text-[17px] md:leading-[29px]">
              {DESCRICAO}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 md:max-w-[420px] lg:w-[420px] lg:shrink-0">
            <label className="flex h-12 flex-row items-center gap-2.5 rounded-sm border-[1.5px] border-estrelinha-field bg-estrelinha-surface px-4">
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-estrelinha-ink-soft">
                <circle cx="6.8" cy="6.8" r="5.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.8 10.8L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Buscar por palavra — cinzas, prazo, ouro…"
                aria-label="Buscar nas perguntas frequentes"
                className="w-full bg-transparent text-[14.5px] font-light text-estrelinha-ink outline-none placeholder:text-estrelinha-ink-soft"
              />
            </label>
            {!isLoading && !error && (
              <p aria-live="polite" className="text-[12.5px] font-light text-estrelinha-ink-soft">
                {searching
                  ? `${matches} ${matches === 1 ? 'pergunta encontrada' : 'perguntas encontradas'}`
                  : `${matches} ${matches === 1 ? 'pergunta' : 'perguntas'}, em ${groups.length} ${groups.length === 1 ? 'assunto' : 'assuntos'}`}
              </p>
            )}
          </div>
        </div>

        {/* Os TRÊS estados, e nunca dois deles ao mesmo tempo: carregando não é vazio, e vazio não é
            ilegível. Esta última distinção é a que `AD-014` e o `BUG-20260809` custaram ao projeto. */}
        {isLoading ? (
          <p className="pt-10 text-[15px] font-light text-estrelinha-ink-soft">Carregando as perguntas…</p>
        ) : error ? (
          <div
            role="alert"
            className="mt-8 flex flex-col items-start gap-3 rounded-md border border-estrelinha-line bg-estrelinha-surface p-6"
          >
            <p className="text-[15px] text-estrelinha-ink">Não foi possível carregar as perguntas.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-11 rounded-sm border border-estrelinha-field px-5 text-[14px] font-medium text-estrelinha-primary-strong"
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-10 pt-6 lg:flex-row lg:gap-24 lg:pt-10">
            <aside className="lg:w-[248px] lg:shrink-0">
              {/* A FOLGA DO HEADER — e ela é **medida**, não escolhida: `widgets/header` empilha a
                  faixa da marca (`md:h-[84px]`) e a de departamentos (`h-[52px]`) dentro de um
                  `sticky top-0`, e no desktop ela NUNCA se recolhe (`md:translate-y-0` trava o
                  recuo, que é só do celular). São 136px de chrome permanente; o `top-24` daqui
                  valia 96, e a coluna de assuntos subia POR BAIXO da barra a cada rolagem.
                  152 = 136 + 16 de respiro.

                  Com a faixa de departamentos vazia — o estado em que a loja nasce hoje — o header
                  mede 84 e a folga sobra. Sobrar é o lado certo de errar: o que não pode é a coluna
                  sumir sob o menu. */}
              <div className="lg:sticky lg:top-[152px]">
                <FaqSubjectNav groups={groups} />
              </div>
            </aside>

            {/* A coluna de leitura **encolhe**, e o teto é 720 — não uma largura fixa.
              `lg:w-[720px] lg:shrink-0` pedia 248 + 96 de folga + 720 = **1064px** de conteúdo,
              e em `lg` exato (1024) existem 984: a página inteira rolava na horizontal, medido
              em navegador (body 1080 numa viewport de 1024). Era anterior a esta mudança e não
              aparecia em teste nenhum — jsdom devolve 0 para toda medida de layout.
              É a lição do `minmax(0, …)` da `27` na roupa do flex: quem não pode encolher é a
              trilha, e `min-w-0` é o que derruba o mínimo automático de min-content.
              Em 1440 nada muda: o teto de 720 volta a valer. */}
          <div className="flex flex-col gap-9 lg:min-w-0 lg:max-w-[720px] lg:flex-1">
              {groups.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="font-display text-[20px] text-estrelinha-ink">
                    {searching ? 'Nenhuma pergunta com esse texto.' : 'Ainda não há perguntas publicadas.'}
                  </p>
                  <p className="text-[14px] font-light leading-[24px] text-estrelinha-ink-soft">
                    Me chame e eu respondo — cada história é única, e nem sempre a gente consegue
                    responder tudo numa página.
                  </p>
                </div>
              ) : (
                groups.map(grupo => (
                  <section key={grupo.category} id={faqSubjectId(grupo.category)}>
                    <h2 className="pb-1 font-display text-[19px] leading-[26px] text-estrelinha-ink md:text-[26px] md:leading-[34px]">
                      {grupo.label}
                    </h2>
                    {grupo.items.map(item => (
                      <FaqQuestion key={item.id} item={item} open={item.id === ancora} />
                    ))}
                  </section>
                ))
              )}

              <div className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-6 md:p-8">
                <h2 className="font-display text-[20px] leading-[28px] text-estrelinha-ink md:text-[22px] md:leading-[30px]">
                  Ainda ficou com dúvida?
                </h2>
                <p className="text-[14px] font-light leading-[24px] text-estrelinha-ink-soft md:text-[15px] md:leading-[26px]">
                  Cada história é única, e nem sempre a gente consegue responder tudo numa página. Me
                  chame — vou conhecer a sua e ajudar a encontrar a melhor forma de eternizá-la.
                </p>
                <PolicyContact assunto="página de perguntas frequentes" />
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export default FaqPage
