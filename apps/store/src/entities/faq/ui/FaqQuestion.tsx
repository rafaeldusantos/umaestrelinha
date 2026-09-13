import type { ResolvedFaq } from '@estrelinha/core/faq'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import { faqAnchorId } from '../lib/anchors'
import FaqAnswer from './FaqAnswer'

/**
 * Uma pergunta da página — `FAQL-03`, `FAQL-07`, `FAQL-11`.
 *
 * ⚠️ **`<details>` e `<summary>`, e NÃO o Accordion do shadcn.** A AC diz que a resposta tem de estar
 * no DOM mesmo com o acordeão fechado, e o Radix desmonta o conteúdo fechado. `<details>` mantém por
 * definição — é o elemento que o Google documenta como indexável, funciona sem JavaScript, é
 * acessível de fábrica, e nos navegadores atuais ainda abre sozinho quando a âncora aponta para algo
 * dentro dele. Trocá-lo por um acordeão que desmonta tiraria a resposta do alcance de qualquer
 * rastreador que não execute JS, que é parte do público que esta página existe para atender.
 *
 * ⚠️ **A âncora é o `id` da entrada, nunca um slug do título.** `policySectionId` deriva o `id` do
 * texto, e ali está certo: o título de uma política é literal de código. Aqui a dona edita a
 * pergunta no painel — derivar do texto faria a correção de uma vírgula quebrar todo link já
 * compartilhado por WhatsApp. Feio e estável ganha de bonito e frágil.
 */
const FaqQuestion = ({ item, open }: { item: ResolvedFaq; open?: boolean }) => (
  <details
    id={faqAnchorId(item.id)}
    open={open}
    className="group border-b border-estrelinha-line"
  >
    <summary
      className={`${TAP_ROW} flex cursor-pointer list-none flex-row items-start justify-between gap-4 py-4 text-[15.5px] font-medium leading-[22px] text-estrelinha-ink marker:hidden md:py-[22px] md:text-[18px] md:leading-[26px]`}
    >
      <span className="flex-1">{item.question}</span>
      <svg
        aria-hidden
        viewBox="0 0 14 14"
        className="mt-1.5 h-3.5 w-3.5 shrink-0 text-estrelinha-ink-soft transition-transform group-open:rotate-180 group-open:text-estrelinha-accent-strong"
      >
        <path
          d="M2 5L7 10L12 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </summary>
    <div className="pb-4 md:pb-[22px]">
      <FaqAnswer answer={item.answer} />
    </div>
  </details>
)

export default FaqQuestion
