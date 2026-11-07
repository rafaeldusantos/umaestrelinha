// `PED-30` — a folha de separação é um **documento próprio**, não `window.print()` na página.
//
// ---------------------------------------------------------------------------------------------
// O QUE ISTO SUBSTITUI
// ---------------------------------------------------------------------------------------------
// `window.print()` imprimia a tela inteira: sidebar, filtros, paginação e o cabeçalho do navegador.
// O que vai para a bancada precisa de outra coisa — o que separar (com a foto da peça), o que
// gravar, por qual frete e para onde mandar. Nada disso cabe num print de listagem, e metade nem estava na tela.
//
// ---------------------------------------------------------------------------------------------
// POR QUE UMA JANELA E NÃO UMA ROTA
// ---------------------------------------------------------------------------------------------
// A folha não é navegação: ninguém quer o histórico do painel entupido de folhas, nem voltar para
// ela com o botão de voltar. Ela é um artefato descartável que sai da impressora. Uma janela com
// documento próprio também garante que **nenhum CSS do painel** entre junto — a folha é preto no
// branco porque vai para papel, e o token `--estrelinha-admin-violet` numa impressora a laser é
// cinza claro.
//
// Lote gera **uma folha por pedido no mesmo documento**, separadas por quebra de página.

import { formatOrderNumber, shippingMethodLabel } from '@estrelinha/core/orders'
import { formatStoreDate } from '@estrelinha/core/time'
import type { PickSlipItem, PickSlipOrder } from '@/entities/order'

// Os tipos moram em `entities/order` (o carregador da folha os devolve); a folha os reexporta.
export type { PickSlipItem, PickSlipOrder }

const escapar = (valor: unknown): string =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const endereco = (o: PickSlipOrder): string => {
  const linha1 = [o.address_street, o.address_number].filter(Boolean).join(', ')
  const linha2 = [o.address_neighborhood, o.address_city, o.address_state].filter(Boolean).join(' · ')
  const partes = [linha1, o.address_complement, linha2, o.address_zip].filter(Boolean)
  return partes.length > 0 ? partes.map(escapar).join('<br>') : '—'
}

const fotoHtml = (item: PickSlipItem): string =>
  // A moldura existe MESMO sem foto: a linha sem foto fica alinhada com a que tem.
  item.image
    ? `<div class="foto"><img src="${escapar(item.image)}" alt="${escapar(item.product_name)}"></div>`
    : '<div class="foto"></div>'

/** O frete escolhido, em negrito, acima do endereço; sem frete gravado, nenhuma linha. */
const frete = (o: PickSlipOrder): string => {
  const rotulo = shippingMethodLabel(o)
  return rotulo ? `<p class="frete">${escapar(rotulo)}</p>` : ''
}

const itemHtml = (item: PickSlipItem): string => `
  <tr>
    <td class="qtd">${escapar(item.quantity)}×</td>
    <td class="celula-foto">${fotoHtml(item)}</td>
    <td>
      <strong>${escapar(item.product_name)}</strong>
      ${item.variant_label ? `<div class="sub">${escapar(item.variant_label)}</div>` : ''}
      ${
        // A gravação vai em destaque: é o que não dá para desfazer depois de gravada.
        item.engraving_text
          ? `<div class="gravacao">Gravação: “${escapar(item.engraving_text)}”</div>`
          : ''
      }
      ${
        item.material_kinds && item.material_kinds.length > 0
          ? `<div class="sub">Material: ${item.material_kinds.map(escapar).join(', ')}</div>`
          : ''
      }
    </td>
  </tr>`

const folha = (o: PickSlipOrder): string => `
  <section class="folha">
    <header>
      <h1>Pedido ${escapar(formatOrderNumber(o.order_number))} · ${escapar(formatStoreDate(o.created_at))}</h1>
      <p class="cliente">${escapar(o.customer_name)}</p>
    </header>

    <div class="bloco">
      <h2>O que separar</h2>
      <table>
        ${(o.items ?? []).map(itemHtml).join('') || '<tr><td colspan="3" class="sub">Sem itens carregados</td></tr>'}
      </table>
    </div>

    <div class="bloco">
      <h2>Entrega</h2>
      ${frete(o)}
      <p>${endereco(o)}</p>
    </div>

    ${
      // O recado da cliente entra na folha porque é o que ela pediu, e a bancada é onde isso importa.
      o.notes
        ? `<div class="bloco recado"><h2>Recado da cliente</h2><p>${escapar(o.notes)}</p></div>`
        : ''
    }

    ${
      // A observação de quem administra vai junto do Recado: é instrução para a bancada.
      o.admin_note && o.admin_note.trim() !== ''
        ? `<div class="bloco recado"><h2>Observação</h2><p>${escapar(o.admin_note.trim())}</p></div>`
        : ''
    }

    <footer class="sub">Uma Estrelinha · folha de separação</footer>
  </section>`

/** O documento inteiro — exportado separado do `window.open` para ser testável sem navegador. */
export const buildPickSlipHtml = (orders: PickSlipOrder[]): string => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Folhas de separação (${orders.length})</title>
<style>
  /* Preto no branco: a folha vai para papel, e token de painel numa laser vira cinza ilegível. */
  * { box-sizing: border-box; }
  body { font: 13px/1.5 system-ui, sans-serif; color: #111; margin: 0; }
  .folha { padding: 24mm 18mm; page-break-after: always; }
  .folha:last-child { page-break-after: auto; }
  h1 { font-size: 20px; margin: 0; }
  .cliente { font-size: 17px; font-weight: 700; margin: 4px 0 0; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #555; margin: 0 0 6px; }
  header { border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
  .bloco { margin-bottom: 16px; }
  .sub { color: #555; font-size: 12px; }
  .gravacao { border-left: 3px solid #111; padding-left: 8px; margin-top: 4px; font-weight: 600; }
  .recado { border: 1px solid #111; padding: 10px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; vertical-align: top; border-bottom: 1px solid #ddd; }
  .qtd { width: 48px; font-size: 18px; font-weight: 700; }
  .celula-foto { width: 68px; }
  .foto { width: 56px; height: 56px; border: 1px solid #999; overflow: hidden; }
  .foto img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .frete { font-weight: 700; margin: 0 0 2px; }
  footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { margin: 0; } }
</style></head>
<body>${orders.map(folha).join('')}</body></html>`

/** O que a janela mostra enquanto a leitura dos pedidos não volta. */
export const PICK_SLIP_PREPARING = 'Preparando a folha…'

/** O aviso de quem chamou quando o navegador recusa a janela (`bloqueada`). */
export const PICK_SLIP_BLOCKED =
  'O navegador bloqueou a janela da folha de separação. Libere as janelas deste site e tente de novo.'

/** Quanto a impressão espera pelas fotos antes de sair mesmo assim. */
export const PICK_SLIP_IMAGE_WAIT_MS = 8000

/**
 * O desfecho, para quem chamou avisar: `aberta` (impressão disparada), `bloqueada` (o navegador
 * recusou o popup), `falhou` (a leitura lançou; a janela foi fechada) e `vazia` (nada a imprimir).
 */
export type PickSlipOpenResult = 'aberta' | 'bloqueada' | 'falhou' | 'vazia'

export interface OpenPickSlipsOptions {
  /** Abre a janela. Padrão: `window.open('', '_blank')`. Injetável para teste sem navegador. */
  abrir?: () => Window | null
  /** Teto de espera pelas fotos antes de imprimir. Padrão: `PICK_SLIP_IMAGE_WAIT_MS`. */
  esperaMaxMs?: number
}

const PREPARANDO_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${PICK_SLIP_PREPARING}</title></head>
<body style="font: 14px system-ui, sans-serif; color: #111; padding: 24px">${PICK_SLIP_PREPARING}</body></html>`

/** Espera o `load` (ou `error`) de cada imagem ainda não carregada, com teto. */
const esperarImagens = (doc: Document, tetoMs: number): Promise<void> => {
  const pendentes = Array.from(doc.images ?? []).filter(img => !img.complete)
  if (pendentes.length === 0) return Promise.resolve()
  const todas = Promise.all(
    pendentes.map(
      img =>
        new Promise<void>(resolve => {
          img.addEventListener('load', () => resolve())
          img.addEventListener('error', () => resolve())
        }),
    ),
  ).then(() => undefined)
  const teto = new Promise<void>(resolve => setTimeout(resolve, tetoMs))
  return Promise.race([todas, teto])
}

/**
 * Abre a folha numa janela e dispara a impressão.
 *
 * `fonte` é a lista pronta ou a leitura assíncrona (`() => fetchPickSlipOrders(ids)`). A janela abre
 * **antes do primeiro `await`**, ainda dentro do gesto do clique — aberta depois da leitura, o
 * navegador a bloquearia como popup — e mostra `PICK_SLIP_PREPARING` até os pedidos chegarem. O
 * `print()` só sai depois do `load` das fotos do documento (com teto: uma foto que não responde não
 * trava a impressão). Falhar em silêncio faria a Adri clicar de novo achando que o botão não pegou:
 * por isso o desfecho volta para quem chamou avisar.
 */
export async function openPickSlips(
  fonte: PickSlipOrder[] | (() => Promise<PickSlipOrder[]>),
  opcoes: OpenPickSlipsOptions = {},
): Promise<PickSlipOpenResult> {
  if (Array.isArray(fonte) && fonte.length === 0) return 'vazia'

  const abrir = opcoes.abrir ?? (() => window.open('', '_blank'))
  const janela = abrir()
  if (!janela) return 'bloqueada'

  janela.document.write(PREPARANDO_HTML)
  janela.document.close()

  let pedidos: PickSlipOrder[]
  try {
    pedidos = Array.isArray(fonte) ? fonte : await fonte()
  } catch {
    janela.close()
    return 'falhou'
  }
  if (pedidos.length === 0) {
    janela.close()
    return 'vazia'
  }

  janela.document.open()
  janela.document.write(buildPickSlipHtml(pedidos))
  janela.document.close()
  await esperarImagens(janela.document, opcoes.esperaMaxMs ?? PICK_SLIP_IMAGE_WAIT_MS)
  janela.focus()
  janela.print()
  return 'aberta'
}
