import type { ReactNode } from 'react'
import Trilha from '@/shared/ui/Trilha'
import { policySectionId } from '@/shared/lib/policySectionId'

/**
 * O invólucro das páginas de política — `POL-20`.
 *
 * **Um documento, duas páginas.** A escala de leitura, a medida da coluna, o espaçamento entre
 * seções e a cor de cada nível vivem AQUI e em lugar nenhum mais. Escrever a mesma escala duas vezes
 * não quebra build, `tsc` nem teste de componente: as duas políticas simplesmente passam a ter corpos
 * de tamanhos diferentes, e quem descobre é a cliente. É o "defeito 01" na sua forma mais barata de
 * evitar.
 *
 * **Sem `prose`**, embora `@tailwindcss/typography` esteja no preset: o plugin traz a própria paleta
 * (`--tw-prose-*`), que `contrast.test.ts` não mede — e uma página inteira de texto é o pior lugar
 * possível para ter cor fora de token auditável. Aqui a escala e a cor descem por **herança** a
 * partir do invólucro de cada seção, e o único seletor de filho é `[&_strong]`, que sobe a ênfase
 * para `ink`. Toda cor continua em token, que é o que o `apps/store/CLAUDE.md` cobra.
 *
 * **A medida de leitura é 720px**, o mesmo número da faixa "A história" da Sobre (`SOB-02`): a
 * largura de linha confortável desta loja já foi decidida uma vez, e redecidi-la por página é como
 * ter dois donos da mesma régua.
 */

/** A coluna do documento: 350 no mobile (390 − 2×20), 720 no desktop — a medida de leitura. */
const COLUNA_DE_LEITURA = 'mx-auto w-full max-w-[720px] px-5'

/**
 * A escala do corpo, idêntica à da Sobre: 17/28 no mobile, 19/34 no desktop, em `ink-soft`.
 *
 * `ink-soft` é o **piso** de contraste da loja (6,00:1 sobre `ground`). Texto corrido não desce
 * abaixo dele, e ouro não é opção em superfície clara (2,66:1).
 */
const CORPO =
  'text-[17px] font-light leading-7 text-estrelinha-ink-soft md:text-[19px] md:leading-[34px]'

/**
 * Uma seção da política: um `<h2>` e o texto dela.
 *
 * Os parágrafos entram como `<p>` puros e herdam a escala do invólucro — a página fica legível como
 * documento, e a tipografia continua com um dono só.
 */
export const PolicySection = ({
  titulo,
  children,
}: {
  titulo: string
  children: ReactNode
}) => {
  const id = policySectionId(titulo)
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 md:gap-[22px]">
      <h2
        id={id}
        className="font-display text-[24px] leading-[34px] tracking-[-0.02em] text-estrelinha-ink md:text-[30px] md:leading-[44px]"
      >
        {titulo}
      </h2>
      {/* A escala desce por herança para os `<p>` filhos; `strong` sobe para `ink` sem virar
          negrito pesado, porque ênfase aqui é de leitura, não de venda. */}
      <div
        className={`flex flex-col gap-4 md:gap-[22px] ${CORPO} [&_strong]:font-medium [&_strong]:text-estrelinha-ink`}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * Uma pergunta dentro de uma seção — um `<h3>`.
 *
 * Existe por causa de **duas** perguntas do texto da dona ("Posso desistir da compra?" e "Posso
 * trocar… porque mudei de ideia?"), que só fazem sentido sob "Semijoias e joias de prata não
 * personalizadas": lidas soltas, a leitora com uma joia afetiva na mão responderia a si mesma com a
 * regra errada. Promovê-las a `<h2>` mudaria o documento; escrever o `<h3>` à mão nas duas criaria
 * dois donos da mesma escala na mesma página.
 */
export const PolicySubsection = ({
  titulo,
  children,
}: {
  titulo: string
  children: ReactNode
}) => {
  const id = policySectionId(titulo)
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 md:gap-4">
      <h3
        id={id}
        className="font-display text-[19px] leading-7 text-estrelinha-ink md:text-[22px] md:leading-8"
      >
        {titulo}
      </h3>
      <div className={`flex flex-col gap-4 md:gap-[22px] ${CORPO}`}>{children}</div>
    </section>
  )
}

/**
 * A lista de itens de uma seção — o "Evite:", o "Informe:", os direitos da LGPD.
 *
 * O marcador é um **fio ouro**, não um bullet tipográfico: `accent` é preenchimento, fio, moldura e
 * ícone, e nunca texto sobre claro (2,66:1). Um `list-disc` em ouro seria texto ouro com outro nome.
 */
export const PolicyList = ({ itens }: { itens: readonly string[] }) => (
  <ul className="flex list-none flex-col gap-3 p-0 md:gap-3.5">
    {itens.map((item) => (
      <li key={item} className="flex items-start gap-3 md:gap-3.5">
        <span
          aria-hidden
          className="mt-3 h-px w-3.5 shrink-0 bg-estrelinha-accent md:mt-[17px] md:w-[18px]"
        />
        <span className={CORPO}>{item}</span>
      </li>
    ))}
  </ul>
)

/**
 * O aviso destacado — `POL-08`.
 *
 * Existe para **uma** frase por documento: a instrução que custa caro se passar despercebida ("Não
 * envie a peça sem antes entrar em contato conosco"). Parágrafo em fluxo, no meio de dez seções, é
 * onde essa frase morre.
 *
 * `ground-deep` com fio `accent` à esquerda. O ouro é o **traço**; o texto é `ink`, 12,73:1.
 */
export const PolicyNote = ({ children }: { children: ReactNode }) => (
  // `data-testid` porque a alternativa não discrimina: uma asserção que suba do parágrafo até o
  // `div` mais próximo e procure um fio ouro encontra o marcador de um `PolicyList` vizinho, e
  // **passa com o aviso rebaixado a `<p>` comum** — mutante que sobreviveu na verificação desta
  // feature. O destaque é a razão de este componente existir; ele precisa de um nome próprio.
  <div
    data-testid="policy-note"
    className="flex items-stretch gap-4 rounded-lg bg-estrelinha-ground-deep p-5 md:gap-5 md:p-6"
  >
    <span aria-hidden className="w-0.5 shrink-0 rounded-full bg-estrelinha-accent" />
    <p className="text-[17px] font-medium leading-7 text-estrelinha-ink md:text-[19px] md:leading-8">
      {children}
    </p>
  </div>
)

/**
 * O documento inteiro: trilha, título, abertura e as seções.
 *
 * **A abertura é prop e não `children`** porque ela é tipograficamente diferente do corpo — é o
 * parágrafo de entrada, em `ink`, antes do primeiro `<h2>`. Misturá-la às seções obrigaria cada
 * página a lembrar de aplicar a classe certa, que é o começo de duas escalas.
 */
const PolicyDocument = ({
  titulo,
  paginaAtual,
  abertura,
  children,
}: {
  /** O `<h1>`. */
  titulo: string
  /** O último degrau da trilha — curto, porque é navegação e não título. */
  paginaAtual: string
  /** Os parágrafos antes da primeira seção. */
  abertura?: ReactNode
  children: ReactNode
}) => (
  <article className="flex flex-col">
    <Trilha paginaAtual={paginaAtual} />

    <header className="bg-estrelinha-ground-deep pb-10 pt-9 md:pb-16 md:pt-14">
      <div className={COLUNA_DE_LEITURA}>
        <h1 className="font-display text-[30px] leading-[40px] tracking-[-0.02em] text-estrelinha-ink md:text-[44px] md:leading-[58px]">
          {titulo}
        </h1>
      </div>
    </header>

    <div className="bg-estrelinha-ground pb-14 pt-10 md:pb-24 md:pt-16">
      <div className={`${COLUNA_DE_LEITURA} flex flex-col gap-9 md:gap-14`}>
        {abertura && (
          <div className="flex flex-col gap-4 text-[17px] font-light leading-7 text-estrelinha-ink md:gap-[22px] md:text-[19px] md:leading-[34px]">
            {abertura}
          </div>
        )}
        {children}
      </div>
    </div>
  </article>
)

export default PolicyDocument
