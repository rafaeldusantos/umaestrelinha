import { sanitizeHtml } from '@/shared/lib/sanitizeHtml'

/**
 * A descrição do produto, desenhada de verdade — `PDP-02`.
 *
 * Até a feature 27 este campo saía como texto puro dentro de um `<p>` na coluna de informação, e
 * como 100% das descrições do catálogo são HTML, a cliente lia `<h2>Anel Afetivo
 * Cora&ccedil;&otilde;es` na tela. Agora ele é o corpo da seção "Detalhes do Produto".
 *
 * **Por que não `prose`** (o `@tailwindcss/typography` está no preset e não é usado em lugar nenhum
 * da loja): o plugin traz a própria paleta — `--tw-prose-body` são os cinzas do Tailwind —, o que
 * plantaria cor de fora do sistema na loja pela primeira vez, e `contrast.test.ts` mede token, não
 * `--tw-prose-*`. Para as sete tags que o dado real usa, seletor de filho explícito é menos código do
 * que sobrescrever a paleta do plugin, e cada cor continua sendo um token auditável.
 *
 * O `dangerouslySetInnerHTML` recebe **só** o que `sanitizeHtml` devolveu.
 */
const ProductDescription = ({ html }: { html: string }) => {
  const limpo = sanitizeHtml(html)

  // `PDP-10`: a decisão olha o SANITIZADO, não o campo cru — uma descrição que só tinha `<script>`
  // chega aqui como string vazia, e a seção não deve abrir um bloco em branco.
  if (!limpo) return null

  return (
    <div
      className={[
        'max-w-[640px] text-[14px] leading-[22px] text-estrelinha-ink-soft',
        // O primeiro filho encosta no topo da seção; os demais respiram.
        '[&>*:first-child]:mt-0',
        '[&_h4]:mt-5 [&_h4]:font-display [&_h4]:text-[15px] [&_h4]:font-semibold [&_h4]:leading-[20px] [&_h4]:text-estrelinha-ink',
        '[&_h5]:mt-4 [&_h5]:font-display [&_h5]:text-[14px] [&_h5]:font-semibold [&_h5]:text-estrelinha-ink',
        '[&_p]:mt-2.5',
        '[&_ul]:mt-2.5 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:mt-2.5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:mt-1',
        '[&_strong]:font-semibold [&_strong]:text-estrelinha-ink',
        '[&_b]:font-semibold [&_b]:text-estrelinha-ink',
        '[&_a]:text-estrelinha-primary [&_a]:underline',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: limpo }}
    />
  )
}

export default ProductDescription
