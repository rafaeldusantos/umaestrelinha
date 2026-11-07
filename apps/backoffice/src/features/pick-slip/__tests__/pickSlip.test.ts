import { describe, expect, it } from 'vitest'
import { buildPickSlipHtml, type PickSlipOrder } from '../lib/pickSlip'

/**
 * `PED-30` — a folha de separação como documento próprio.
 *
 * O conteúdo é testado separado do `window.open` de propósito: o que precisa estar certo é **o que
 * vai para o papel**, e isso é uma string.
 */
const pedido = (over: Partial<PickSlipOrder> = {}): PickSlipOrder =>
  ({
    id: 'o1',
    order_number: '1042',
    customer_name: 'Luciana Prado',
    customer_email: 'lu@example.com',
    status: 'paid',
    payment_status: 'approved',
    payment_method: 'pix',
    total: 389,
    tracking_code: null,
    material_tracking_code: 'BR44 9182 3',
    material_status: 'material_recebido',
    material_received_at: null,
    created_at: '2026-08-20T14:32:00Z',
    notes: null,
    customer_id: 'c1',
    address_street: 'Rua Marcelo Gama',
    address_number: '1120',
    address_complement: 'apto 302',
    address_neighborhood: 'São João',
    address_city: 'Porto Alegre',
    address_state: 'RS',
    address_zip: '90540-041',
    items: [
      {
        product_name: 'Pingente Gota',
        quantity: 1,
        variant_label: 'Prata 925 · 18mm',
        engraving_text: 'Sempre comigo, pai.',
        material_kinds: ['cinzas'],
      },
    ],
    ...over,
  }) as PickSlipOrder

describe('a folha carrega o que a bancada precisa', () => {
  const html = buildPickSlipHtml([pedido()])

  it('o número do pedido, os itens e a gravação', () => {
    expect(html).toContain('Pedido #1042')
    expect(html).toContain('Pingente Gota')
    // A gravação é o que não dá para desfazer depois de gravado.
    expect(html).toContain('Gravação: “Sempre comigo, pai.”')
  })

  it('não tem o bloco "Material esperado" nem o código do envelope', () => {
    expect(html).not.toContain('Material esperado')
    expect(html).not.toContain('BR44 9182 3')
    expect(html).not.toContain('envelope')
    // A linha "Material: …" do item continua.
    expect(html).toContain('Material: cinzas')
  })

  it('o endereço de entrega', () => {
    expect(html).toContain('Rua Marcelo Gama, 1120')
    expect(html).toContain('90540-041')
  })

  it('o recado da cliente entra na folha — a bancada é onde ele importa', () => {
    const comRecado = buildPickSlipHtml([pedido({ notes: 'Embale com cuidado' })])
    expect(comRecado).toContain('Recado da cliente')
    expect(comRecado).toContain('Embale com cuidado')
  })

  it('sem recado, o bloco não aparece vazio', () => {
    expect(html).not.toContain('Recado da cliente')
  })
})

describe('o documento é próprio, e não um print da tela', () => {
  const html = buildPickSlipHtml([pedido()])

  it('não carrega nada do painel — nem sidebar, nem filtros, nem token', () => {
    // `window.print()` imprimia a tela inteira. E um token `--estrelinha-admin-violet` numa laser
    // vira cinza claro, então a folha é preto no branco de propósito.
    expect(html).not.toContain('estrelinha-admin')
    expect(html).not.toContain('Dashboard')
    expect(html).toContain('color: #111')
  })

  it('é um HTML completo, com título e charset', () => {
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('lang="pt-BR"')
  })
})

describe('lote gera uma folha por pedido, no mesmo documento', () => {
  it('duas folhas, separadas por quebra de página', () => {
    const html = buildPickSlipHtml([
      pedido({ order_number: '1042' }),
      pedido({ order_number: '1041' }),
    ])

    expect(html).toContain('Pedido #1042')
    expect(html).toContain('Pedido #1041')
    expect(html.match(/class="folha"/g)).toHaveLength(2)
    expect(html).toContain('page-break-after: always')
  })
})

describe('o conteúdo é escapado — o nome vem do que a cliente digitou', () => {
  it('HTML no nome não vira marcação', () => {
    const html = buildPickSlipHtml([pedido({ customer_name: '<script>alert(1)</script>' })])

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('aspas e & no recado também', () => {
    const html = buildPickSlipHtml([pedido({ notes: 'Cuidado & "frágil"' })])
    expect(html).toContain('Cuidado &amp; &quot;frágil&quot;')
  })
})

describe('degradação sem dado', () => {
  it('pedido sem itens carregados diz isso, e não uma tabela vazia', () => {
    const html = buildPickSlipHtml([pedido({ items: [] })])
    expect(html).toContain('Sem itens carregados')
  })

  it('pedido sem endereço não imprime linhas vazias', () => {
    const html = buildPickSlipHtml([
      pedido({
        address_street: null, address_number: null, address_neighborhood: null,
        address_city: null, address_state: null, address_zip: null, address_complement: null,
      }),
    ])
    expect(html).toContain('<p>—</p>')
  })
})

describe('a observação do pedido (só quem administra vê) sai na folha', () => {
  it('impressa ao lado do Recado da cliente, escapada', () => {
    const html = buildPickSlipHtml([
      pedido({ notes: 'Embale com cuidado', admin_note: 'Gravar <b>"Ana"</b> & conferir o fecho' }),
    ])
    expect(html).toContain('<h2>Observação</h2>')
    expect(html).toContain('Gravar &lt;b&gt;&quot;Ana&quot;&lt;/b&gt; &amp; conferir o fecho')
    expect(html).not.toContain('<b>"Ana"</b>')
    // Ao lado do Recado: logo depois dele, antes do rodapé.
    const recado = html.indexOf('Recado da cliente')
    const observacao = html.indexOf('<h2>Observação</h2>')
    expect(recado).toBeGreaterThan(-1)
    expect(observacao).toBeGreaterThan(recado)
    expect(html.indexOf('folha de separação</footer>')).toBeGreaterThan(observacao)
  })

  it('sai também sem Recado', () => {
    const html = buildPickSlipHtml([pedido({ admin_note: 'Ligar antes de postar' })])
    expect(html).toContain('<h2>Observação</h2>')
    expect(html).toContain('Ligar antes de postar')
  })

  it('sem observação (ausente, nula ou só espaço), nenhum bloco', () => {
    for (const admin_note of [undefined, null, '   ']) {
      expect(buildPickSlipHtml([pedido({ admin_note })])).not.toContain('<h2>Observação</h2>')
    }
  })
})

/** O trecho de UMA folha (uma `<section class="folha">`), pelo índice. */
const folhas = (html: string): string[] => html.split('<section class="folha">').slice(1)

describe('o cabeçalho: número com a data, e a cliente em destaque', () => {
  it('o <h1> traz a data do pedido ao lado do número, no fuso da loja', () => {
    const html = buildPickSlipHtml([pedido({ created_at: '2026-11-07T14:32:00Z' })])
    expect(html).toContain('<h1>Pedido #1042 · 07/11/2026</h1>')
  })

  it('a data é a de Brasília: meia-noite UTC ainda é o dia anterior', () => {
    const html = buildPickSlipHtml([pedido({ created_at: '2027-01-01T00:00:00Z' })])
    expect(html).toContain('<h1>Pedido #1042 · 31/12/2026</h1>')
  })

  it('o nome da cliente em linha própria, em destaque, fora do subtítulo cinza', () => {
    const [folha] = folhas(buildPickSlipHtml([pedido()]))
    const cabecalho = folha.slice(folha.indexOf('<header>'), folha.indexOf('</header>'))
    expect(cabecalho).toContain('<p class="cliente">Luciana Prado</p>')
    expect(cabecalho).not.toMatch(/class="sub"[^<]*Luciana/)
    const html = buildPickSlipHtml([pedido()])
    expect(html).toMatch(/\.cliente \{[^}]*font-size: 1[6-8]px[^}]*font-weight: 700/)
  })
})

describe('cada item: quantidade em destaque e foto na moldura', () => {
  it('a quantidade sai em destaque (corpo maior, negrito)', () => {
    const html = buildPickSlipHtml([pedido({ items: [{ product_name: 'Anel', quantity: 2 }] })])
    expect(html).toContain('<td class="qtd">2×</td>')
    expect(html).toMatch(/\.qtd \{[^}]*font-size: 18px[^}]*font-weight: 700/)
  })

  it('item com foto imprime <img> com a URL dada e o alt escapado', () => {
    const html = buildPickSlipHtml([
      pedido({ items: [{ product_name: 'Anel <Raiz> "P"', quantity: 1, image: 'https://cdn.exemplo.invalid/a.jpg?x=1&y=2' }] }),
    ])
    expect(html).toContain('<img src="https://cdn.exemplo.invalid/a.jpg?x=1&amp;y=2" alt="Anel &lt;Raiz&gt; &quot;P&quot;">')
    expect(html).toMatch(/\.foto \{[^}]*width: 56px[^}]*height: 56px/)
    expect(html).toMatch(/\.foto img \{[^}]*object-fit: cover/)
  })

  it('item sem foto imprime a moldura vazia, sem <img> e sem "undefined"', () => {
    for (const image of [undefined, null, '']) {
      const html = buildPickSlipHtml([pedido({ items: [{ product_name: 'Anel', quantity: 1, image }] })])
      expect(html).toContain('<div class="foto"></div>')
      expect(html).not.toContain('<img')
      expect(html).not.toContain('undefined')
    }
  })

  it('a linha do item é quantidade | foto | nome, nessa ordem', () => {
    const html = buildPickSlipHtml([pedido({ items: [{ product_name: 'Anel', quantity: 3, image: 'https://x.invalid/a.jpg' }] })])
    const qtd = html.indexOf('<td class="qtd">3×</td>')
    const foto = html.indexOf('<div class="foto"><img')
    const nome = html.indexOf('<strong>Anel</strong>')
    expect(qtd).toBeGreaterThan(-1)
    expect(foto).toBeGreaterThan(qtd)
    expect(nome).toBeGreaterThan(foto)
  })
})

describe('Entrega: o frete acima do endereço', () => {
  it.each([
    [{ shipping_method: 'PAC', shipping_service_id: '1' }, 'PAC'],
    [{ shipping_method: ' SEDEX ', shipping_service_id: '2' }, 'SEDEX'],
    [{ shipping_method: 'Qualquer', shipping_service_id: 'retirada' }, 'Retirada no escritório'],
  ])('%o ⇒ "%s" antes do endereço', (frete, rotulo) => {
    const [folha] = folhas(buildPickSlipHtml([pedido(frete)]))
    const linha = `<p class="frete">${rotulo}</p>`
    expect(folha).toContain(linha)
    expect(folha.indexOf(linha)).toBeGreaterThan(folha.indexOf('<h2>Entrega</h2>'))
    expect(folha.indexOf('Rua Marcelo Gama')).toBeGreaterThan(folha.indexOf(linha))
  })

  it('sem frete gravado, nenhuma linha (nem vazia)', () => {
    for (const shipping_method of [null, undefined, '   ']) {
      const html = buildPickSlipHtml([pedido({ shipping_method, shipping_service_id: null })])
      expect(html).not.toContain('class="frete"')
      expect(html).toContain('Rua Marcelo Gama, 1120')
    }
  })
})

describe('lote: cada folha com o que é do seu pedido', () => {
  it('itens, endereço, frete, recado e observação não se misturam', () => {
    const html = buildPickSlipHtml([
      pedido({
        order_number: '1042', customer_name: 'Luciana Prado', notes: 'Recado da Luciana', admin_note: 'Obs da Luciana',
        shipping_method: 'PAC', address_street: 'Rua Um',
        items: [{ product_name: 'Pingente Gota', quantity: 1 }],
      }),
      pedido({
        order_number: '1041', customer_name: 'Marta Souza', notes: 'Recado da Marta', admin_note: 'Obs da Marta',
        shipping_method: null, shipping_service_id: 'retirada', address_street: 'Rua Dois',
        items: [{ product_name: 'Anel Raiz', quantity: 2 }],
      }),
    ])
    const [a, b] = folhas(html)
    expect(a).toContain('Pedido #1042')
    expect(a).toContain('Luciana Prado')
    expect(a).toContain('Pingente Gota')
    expect(a).toContain('Rua Um')
    expect(a).toContain('<p class="frete">PAC</p>')
    expect(a).toContain('Recado da Luciana')
    expect(a).toContain('Obs da Luciana')
    for (const alheio of ['Marta', 'Anel Raiz', 'Rua Dois', 'Retirada no escritório', '1041']) expect(a).not.toContain(alheio)

    expect(b).toContain('Pedido #1041')
    expect(b).toContain('Anel Raiz')
    expect(b).toContain('Rua Dois')
    expect(b).toContain('<p class="frete">Retirada no escritório</p>')
    expect(b).toContain('Recado da Marta')
    expect(b).toContain('Obs da Marta')
    for (const alheio of ['Luciana', 'Pingente Gota', 'Rua Um', '>PAC<', '1042']) expect(b).not.toContain(alheio)
  })
})
