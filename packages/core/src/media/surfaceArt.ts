// "A arte desta superfície, com recuo para a da outra" — **o dono único** (`AD-030`).
//
// A regra nasceu na feature 39, dentro de `core/menu/banners.ts`, e já custou uma divergência
// silenciosa antes de sair de lá: o painel recalculava o predicado por truthiness da string crua
// enquanto `core` apara espaço, então um `image_mobile: "   "` fazia a loja reaproveitar a arte do
// computador **com a tela dizendo que estava tudo certo**. É o "defeito 01" no tamanho de um `||`.
//
// A feature 41 levou os consumidores de dois para quatro (banner do menu × 2, carrossel da Home × 2),
// e a regra do repositório é a mesma desde sempre: dois consumidores da mesma regra ⇒ `packages/core`.
//
// **Este arquivo não importa nada, e é de propósito.** `core/media/index.ts` importa
// `@estrelinha/supabase/types`, e o Deno morre nesse `import type` antes da primeira linha rodar —
// então quem precisa deste módulo fora do Vite (a edge function do sitemap alcança `core/menu`, que
// alcança este) o importa por caminho relativo com extensão explícita, nunca pelo barrel.

/**
 * O dispositivo cuja arte se quer.
 *
 * Declarado aqui, e **não** importado de `core/menu`: `menu` passa a depender de `media`, e importar
 * o tipo de volta fecharia um ciclo. `MenuSurface` é estruturalmente idêntico, então os dois se
 * atribuem sem conversão.
 */
export type DeviceSurface = 'desktop' | 'mobile'

/**
 * Uma string que vale como arte — ou `null`.
 *
 * **Apara espaço, e é essa a diferença que importa.** Uma arte gravada como `"   "` — chegada por
 * SQL, por importação, ou de um campo que alguém limpou com a barra de espaço — **não é arte**.
 * Tratá-la como arte faz a loja desenhar `<img src="   ">` e o painel dizer que está tudo certo.
 */
const arte = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null

/**
 * A arte **gravada** para esta superfície — `null` quando não há.
 *
 * Sem recuo: responde "esta superfície tem arte própria?", que é a pergunta que a tela faz para
 * escrever "arte do celular · falta".
 */
export const surfaceImage = (
  desktop: unknown,
  mobile: unknown,
  surface: DeviceSurface,
): string | null => arte(surface === 'desktop' ? desktop : mobile)

/** A arte escolhida, e se ela veio da outra superfície. */
export interface SurfaceArt {
  image: string | null
  /**
   * A arte veio da **outra** superfície.
   *
   * Quem desenha não faz nada com isto — desenha a arte que veio. Quem lê é o painel, que precisa
   * avisar "está reaproveitando a arte do computador" em vez de deixar a dona achar que enviou as
   * duas. Sem o campo, a tela teria de reconstruir a decisão, e é assim que a segunda escrita nasce.
   */
  imageReused: boolean
}

/**
 * A arte desta superfície, com recuo para a da outra.
 *
 * O recuo é regra de produto, não conveniência: banner configurado sem a arte do dispositivo
 * renderiza com a que existe, porque a alternativa — o banner sumir de uma das superfícies — é a
 * dona publicando um anúncio que metade das clientes não vê, sem nada em tela dizendo por quê. E
 * ~90% dos acessos vêm de celular, que é justamente a arte que costuma faltar.
 */
export const surfaceArt = (
  desktop: unknown,
  mobile: unknown,
  surface: DeviceSurface,
): SurfaceArt => {
  const propria = surfaceImage(desktop, mobile, surface)
  if (propria) return { image: propria, imageReused: false }

  const outra = surfaceImage(desktop, mobile, surface === 'desktop' ? 'mobile' : 'desktop')
  return { image: outra, imageReused: outra !== null }
}
