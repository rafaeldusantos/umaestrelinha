// O contador de caracteres do painel — feature 56 (`LEG-14`, `LEG-19`).
//
// Ele existia **cinco vezes**, escrito à mão dentro do `EventCard`
// (`` `${(v ?? '').length}/${limit}` ``, num `<p>` abaixo do campo), e **não existia** nos quatro
// campos de Configurações que têm limite — lá o número ia embutido no RÓTULO
// ("Título padrão (até 60 caracteres)"), o que diz o teto e nunca diz onde a dona está em relação a
// ele.
//
// Duas escritas do mesmo número são o "defeito 01" no tamanho de um `<p>`: elas divergem — um lê
// `COPY_LIMITS`, o outro tem o número cravado na frase — e as duas renderizam. Aqui ele tem um dono,
// e `contadorComDonoUnico.test.ts` recusa a sexta escrita.
//
// **O lugar dele é a linha do rótulo**, à direita — é o que o artboard desenha e é onde ele não
// compete com a dica (`hint`) pelo mesmo espaço abaixo do campo. Quem o coloca lá é o prop
// `counter` do `FieldGroup`.

interface Props {
  /** O valor atual do campo. `undefined` conta como vazio — campo ainda não tocado é `0/limite`. */
  value: string | undefined
  /** O teto. Vem de `COPY_LIMITS` (`core`) nos e-mails e do `maxLength` do campo nas outras seções. */
  limit: number
  'data-testid'?: string
}

export const CharCounter = ({ value, limit, 'data-testid': testId }: Props) => (
  <span
    data-testid={testId}
    /* `tabular-nums` para o número não dançar a cada tecla: sem ele, o `1` é mais estreito que o `0`
       e o contador se mexe horizontalmente enquanto a dona digita. */
    className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
  >
    {/* A forma é direta — o comprimento colado na barra — e não passa por variável intermediária.
        Não é estilo: `contadorComDonoUnico.test.ts` ancora a própria régua NESTA linha, e um
        `const usado = …` antes do JSX a deixaria sem nada para encontrar no dono. Um guarda cuja
        âncora não casa varre o escopo, acha zero e aprova em silêncio. */}
    {(value ?? '').length}/{limit}
  </span>
)

export default CharCounter
