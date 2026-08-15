// Feature 22 / MAT-01 — "Como enviar o material".
//
// Esta é a página que separa a loja de um catálogo qualquer: a cliente precisa enviar pelo correio
// um material insubstituível — cinzas de cremação, leite materno, um cacho de cabelo, o primeiro
// dente do filho —, e se ele se perde não existe segunda via. Hoje isso é combinado por WhatsApp
// depois da compra; a partir daqui está escrito, antes.
//
// O tom não é escolha de marketing, é restrição de produto (`CLAUDE.md`): quem lê acabou de perder
// alguém. Instrução clara, nada de linguagem festiva, nada de urgência fabricada.
//
// **A rota está em `ROUTE_SLUGS`** (`@estrelinha/core/routes`). Com categoria na raiz do domínio
// (`AD-018`), rota de um segmento que não seja reservada encobre em silêncio a categoria homônima —
// e `reservedSlugs.test.ts` é bidirecional, então tirar uma das duas pontas derruba a suíte.

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, PackageOpen } from 'lucide-react'
import { useCanonical } from '@/shared/lib/useCanonical'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import { CHECKLIST, MATERIAL_FICHAS, PASSOS } from '@/widgets/material-guide/model/fichas'
import MaterialAddress from '@/widgets/material-guide/ui/MaterialAddress'

export const HOW_TO_SEND_PATH = '/como-enviar-o-material'

const HowToSendMaterialPage = () => {
  useCanonical(HOW_TO_SEND_PATH)

  return (
    <div className="container max-w-3xl py-10 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-10"
      >
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-estrelinha-line bg-estrelinha-ground-deep px-4 py-1.5">
            <PackageOpen className="h-4 w-4 text-estrelinha-primary" aria-hidden />
            <span className="text-xs font-medium text-estrelinha-ink-soft">Envio do material</span>
          </span>
          <h1 className="font-display text-[30px] font-semibold leading-[36px] tracking-[-0.02em] text-estrelinha-ink md:text-[42px] md:leading-[48px]">
            Como enviar o material
          </h1>
          <p className="max-w-[560px] text-[16px] leading-[26px] text-estrelinha-ink-soft">
            Algumas das nossas joias são feitas com um material que só você tem. Esta página explica o
            que separar, como preparar e para onde enviar. Se ficar qualquer dúvida, fale com a gente
            antes de postar — a gente prefere responder duas vezes do que você enviar com receio.
          </p>
        </header>

        <section aria-labelledby="passos" className="flex flex-col gap-4">
          <h2
            id="passos"
            className="font-display text-[22px] font-semibold leading-[28px] text-estrelinha-ink"
          >
            O caminho, em quatro passos
          </h2>
          <ol className="flex flex-col gap-3">
            {PASSOS.map((passo, i) => (
              <li
                key={passo.titulo}
                className="flex gap-3 rounded-md border border-estrelinha-line bg-white p-4"
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-estrelinha-primary text-[13px] font-semibold text-white"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-estrelinha-ink">{passo.titulo}</p>
                  <p className="mt-1 text-[15px] leading-[24px] text-estrelinha-ink-soft">
                    {passo.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/*
          Uma ficha por material, e não uma instrução única: preparar leite materno não é preparar
          cinzas não é preparar cabelo. O `id` de cada seção é o destino do link da página do produto
          (`/como-enviar-o-material#cinzas`), então a cliente cai direto no caso dela.
        */}
        <section aria-labelledby="fichas" className="flex flex-col gap-4">
          <h2
            id="fichas"
            className="font-display text-[22px] font-semibold leading-[28px] text-estrelinha-ink"
          >
            Preparo, material por material
          </h2>
          <div className="flex flex-col gap-3">
            {MATERIAL_FICHAS.map(ficha => (
              <article
                key={ficha.kind}
                id={ficha.anchor}
                /* `scroll-mt` porque o header é sticky: sem ele a âncora encosta o título embaixo da
                   barra e a cliente cai no meio da ficha anterior. */
                className="scroll-mt-24 rounded-md border border-estrelinha-line bg-white p-4"
              >
                <h3 className="font-display text-[18px] font-semibold text-estrelinha-ink">
                  {ficha.titulo}
                </h3>
                <p className="mt-1 text-[15px] leading-[24px] text-estrelinha-ink">
                  <strong className="font-semibold">Quanto enviar:</strong> {ficha.quantidade}
                </p>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-[24px] text-estrelinha-ink-soft">
                  {ficha.preparo.map(passo => (
                    <li key={passo}>{passo}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="endereco" className="flex flex-col gap-4">
          <h2
            id="endereco"
            className="font-display text-[22px] font-semibold leading-[28px] text-estrelinha-ink"
          >
            Para onde enviar
          </h2>
          <MaterialAddress />
        </section>

        <section aria-labelledby="checklist" className="flex flex-col gap-4">
          <h2
            id="checklist"
            className="font-display text-[22px] font-semibold leading-[28px] text-estrelinha-ink"
          >
            Antes de fechar o envelope
          </h2>
          <ul className="flex flex-col gap-2 rounded-md border border-estrelinha-line bg-white p-4">
            {CHECKLIST.map(item => (
              <li key={item} className="flex items-start gap-2 text-[15px] leading-[24px] text-estrelinha-ink-soft">
                <CheckCircle2
                  className="mt-[3px] h-4 w-4 shrink-0 text-estrelinha-primary"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[15px] leading-[24px] text-estrelinha-ink-soft">
            Depois de postar, registre o código de rastreio na página do seu pedido, em{' '}
            <Link to="/conta" className={`${TAP_ROW} font-semibold text-estrelinha-primary hover:underline`}>
              Minha conta
            </Link>
            . Não é obrigatório — se preferir, é só avisar a gente.
          </p>
        </section>
      </motion.div>
    </div>
  )
}

export default HowToSendMaterialPage
