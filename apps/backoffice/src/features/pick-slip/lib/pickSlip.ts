// `PED-30` — a folha de separação é um **documento próprio**, não `window.print()` na página.
//
// ---------------------------------------------------------------------------------------------
// O QUE ISTO SUBSTITUI
// ---------------------------------------------------------------------------------------------
// `window.print()` imprimia a tela inteira: sidebar, filtros, paginação e o cabeçalho do navegador.
// O que vai para a bancada precisa de outra coisa — o que separar, o que gravar, **qual material
// esperar** e para onde mandar. Nada disso cabe num print de listagem, e metade nem estava na tela.
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

import type { AdminOrderRow } from '@/entities/order/api/orderQuery'
import { MATERIAL_STATUS_LABELS, toMaterialStatus } from '@estrelinha/core/material'

export interface PickSlipItem {
  product_name: string
  quantity: number
  variant_label?: string | null
  engraving_text?: string | null
  material_kinds?: string[]
}

export interface PickSlipOrder extends AdminOrderRow {
  items?: PickSlipItem[]
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
}

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

const itemHtml = (item: PickSlipItem): string => `
  <tr>
    <td class="qtd">${escapar(item.quantity)}×</td>
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
      <h1>Pedido #${escapar(o.order_number)}</h1>
      <p class="sub">${escapar(o.customer_name)} · ${new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
    </header>

    <div class="bloco">
      <h2>O que separar</h2>
      <table>
        ${(o.items ?? []).map(itemHtml).join('') || '<tr><td colspan="2" class="sub">Sem itens carregados</td></tr>'}
      </table>
    </div>

    <div class="bloco">
      <h2>Material esperado</h2>
      <p>${escapar(MATERIAL_STATUS_LABELS[toMaterialStatus(o.material_status)] ?? '—')}${
        o.material_tracking_code ? ` · envelope ${escapar(o.material_tracking_code)}` : ''
      }</p>
    </div>

    <div class="bloco">
      <h2>Entrega</h2>
      <p>${endereco(o)}</p>
    </div>

    ${
      // O recado da cliente entra na folha porque é o que ela pediu, e a bancada é onde isso importa.
      o.notes
        ? `<div class="bloco recado"><h2>Recado da cliente</h2><p>${escapar(o.notes)}</p></div>`
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
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #555; margin: 0 0 6px; }
  header { border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
  .bloco { margin-bottom: 16px; }
  .sub { color: #555; font-size: 12px; }
  .gravacao { border-left: 3px solid #111; padding-left: 8px; margin-top: 4px; font-weight: 600; }
  .recado { border: 1px solid #111; padding: 10px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; vertical-align: top; border-bottom: 1px solid #ddd; }
  .qtd { width: 40px; font-weight: 600; }
  footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 6px; }
  @media print { body { margin: 0; } }
</style></head>
<body>${orders.map(folha).join('')}</body></html>`

/**
 * Abre a folha numa janela e dispara a impressão.
 *
 * Se o navegador bloquear o popup, devolve `false` — quem chama avisa. Falhar em silêncio faria a
 * Adri clicar de novo achando que o botão não pegou.
 */
export const openPickSlips = (orders: PickSlipOrder[]): boolean => {
  if (orders.length === 0) return false

  const janela = window.open('', '_blank')
  if (!janela) return false

  janela.document.write(buildPickSlipHtml(orders))
  janela.document.close()
  janela.focus()
  janela.print()
  return true
}
