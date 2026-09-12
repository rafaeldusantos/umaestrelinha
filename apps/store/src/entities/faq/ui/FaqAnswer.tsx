import { faqAnswerBlocks } from '@estrelinha/core/faq'

/**
 * A resposta de uma pergunta, desenhada a partir dos blocos — `FAQL-30`.
 *
 * **Nenhum `dangerouslySetInnerHTML`, e isso é regra, não descuido.** A resposta é `text` no banco e
 * assim continua: quem interpreta o texto é `faqAnswerBlocks` (`@estrelinha/core/faq`), e o React
 * escapa o que sobra. É a mesma diferença que separa esta seção da descrição do produto, que é HTML
 * de origem externa e por isso paga um sanitizador inteiro.
 *
 * Sem `prose`: o plugin de tipografia traz a própria paleta (`--tw-prose-*`), que `contrast.test.ts`
 * não mede. Seletor explícito mantém toda cor em token auditável.
 */
const FaqAnswer = ({ answer }: { answer: string }) => {
  const blocos = faqAnswerBlocks(answer)
  if (blocos.length === 0) return null

  return (
    <div className="flex flex-col gap-3 pr-7 text-[14px] font-light leading-[24px] text-estrelinha-ink-soft md:text-[15.5px] md:leading-[28px]">
      {blocos.map((bloco, i) =>
        bloco.kind === 'paragraph' ? (
          <p key={i}>{bloco.text}</p>
        ) : (
          <ul key={i} className="flex flex-col gap-1.5">
            {bloco.items.map((texto, j) => (
              <li key={j} className="flex flex-row items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-estrelinha-accent-strong"
                />
                <span className="flex-1">{texto}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}

export default FaqAnswer
