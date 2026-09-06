import { describe, expect, it } from 'vitest'
import { navGroups } from './navItems'
import {
  STORAGE_KEY,
  collapsibleLabels,
  groupHasActive,
  isCollapsed,
  readCollapsed,
  toggleCollapsed,
} from './navCollapse'

/**
 * O colapso dos grupos da sidebar.
 *
 * O que este arquivo trava não é a animação nem a seta — é a **direção do default** e a
 * **preservação da intenção**. As duas erram sem quebrar nada:
 *
 * 1. Guardar o conjunto expandido em vez do colapsado inverte o significado do storage vazio, e a
 *    primeira visita ao painel passaria a mostrar quatro cabeçalhos e nenhum destino.
 * 2. Abrir o grupo ativo à força faz a preferência virar sugestão — e é a saída tentadora, porque
 *    resolve o sintoma ("não vejo onde estou") destruindo a causa da escolha.
 */

/** Um `Storage` de mentira, para não depender do `localStorage` do jsdom entre arquivos. */
const fakeStorage = (inicial: Record<string, string> = {}): Storage => {
  const dados = new Map(Object.entries(inicial))
  return {
    get length() {
      return dados.size
    },
    clear: () => dados.clear(),
    getItem: (key: string) => (dados.has(key) ? dados.get(key)! : null),
    key: (index: number) => [...dados.keys()][index] ?? null,
    removeItem: (key: string) => void dados.delete(key),
    setItem: (key: string, value: string) => void dados.set(key, value),
  }
}

describe('navCollapse — quais grupos colapsam', () => {
  it('colapsam os grupos COM cabeçalho, e só eles', () => {
    // O grupo sem rótulo é o Dashboard sozinho: sem cabeçalho não há onde clicar, e esconder o
    // ponto de partida não teria como se desfazer.
    expect(collapsibleLabels()).toEqual(['Vendas', 'Descontos', 'Catálogo', 'Loja'])
  })

  it('a lista sai de `navGroups`, não de uma segunda cópia dos rótulos', () => {
    // Um segundo dono dos rótulos é o "defeito 01" do projeto: renomear o grupo em `navItems.ts`
    // deixaria esta lista com um nome que não existe mais, e nada acusaria — o grupo renomeado
    // simplesmente pararia de colapsar.
    expect(collapsibleLabels()).toEqual(
      navGroups.filter(group => group.label !== null).map(group => group.label),
    )
  })
})

describe('navCollapse — a leitura da preferência', () => {
  it('storage vazio significa TUDO ABERTO', () => {
    // A direção do default é a decisão que importa. Se o que se guardasse fosse o expandido, esta
    // asserção pediria o contrário — e a primeira visita mostraria quatro cabeçalhos sem destino.
    expect(readCollapsed(fakeStorage())).toEqual([])
  })

  it('lê os rótulos colapsados que foram gravados', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(['Catálogo', 'Loja']) })
    expect(readCollapsed(storage)).toEqual(['Catálogo', 'Loja'])
  })

  it('descarta rótulo que não é mais grupo', () => {
    // Sem o descarte, um grupo renomeado deixaria a entrada velha guardada para sempre.
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(['Loja', 'Coleções', 'Mockups']) })
    expect(readCollapsed(storage)).toEqual(['Loja'])
  })

  it('JSON quebrado, tipo errado e item não-string caem no default, sem lançar', () => {
    expect(readCollapsed(fakeStorage({ [STORAGE_KEY]: '{' }))).toEqual([])
    expect(readCollapsed(fakeStorage({ [STORAGE_KEY]: '"Loja"' }))).toEqual([])
    expect(readCollapsed(fakeStorage({ [STORAGE_KEY]: '{"Loja":true}' }))).toEqual([])
    expect(readCollapsed(fakeStorage({ [STORAGE_KEY]: JSON.stringify([3, null, 'Loja']) }))).toEqual(['Loja'])
  })

  it('storage que LANÇA na leitura cai no default', () => {
    // Aba anônima com cookies bloqueados: o `getItem` estoura. Navegação não pode morrer por isso.
    const explosivo = { ...fakeStorage(), getItem: () => { throw new Error('bloqueado') } } as Storage
    expect(readCollapsed(explosivo)).toEqual([])
  })

  it('a chave mora sob o namespace do painel', () => {
    expect(STORAGE_KEY).toBe('estrelinha.admin.nav-collapsed')
    expect(STORAGE_KEY.startsWith('estrelinha.admin.')).toBe(true)
  })
})

describe('navCollapse — o alternador', () => {
  it('colapsa o que estava aberto e abre o que estava colapsado', () => {
    expect(toggleCollapsed([], 'Loja')).toEqual(['Loja'])
    expect(toggleCollapsed(['Loja'], 'Loja')).toEqual([])
  })

  it('não mexe nos outros grupos', () => {
    expect(toggleCollapsed(['Catálogo'], 'Loja')).toEqual(['Catálogo', 'Loja'])
    expect(toggleCollapsed(['Catálogo', 'Loja'], 'Catálogo')).toEqual(['Loja'])
  })

  it('não muta a lista recebida', () => {
    const antes = ['Catálogo']
    toggleCollapsed(antes, 'Loja')
    expect(antes).toEqual(['Catálogo'])
  })

  it('`isCollapsed` responde `false` para o grupo sem rótulo', () => {
    // O Dashboard não colapsa, e o `label: null` não pode casar com nada guardado.
    expect(isCollapsed(['Loja'], null)).toBe(false)
    expect(isCollapsed(['Loja'], 'Loja')).toBe(true)
    expect(isCollapsed(['Loja'], 'Catálogo')).toBe(false)
  })
})

describe('navCollapse — onde eu estou quando o grupo está fechado', () => {
  const grupo = (label: string) => navGroups.find(g => g.label === label)!

  it('o grupo reconhece a rota exata de um item seu', () => {
    expect(groupHasActive(grupo('Catálogo'), '/admin/produtos')).toBe(true)
    expect(groupHasActive(grupo('Loja'), '/admin/produtos')).toBe(false)
  })

  it('reconhece também a rota FILHA — editar produto ainda é Catálogo', () => {
    // É a mesma régua do item ativo (`isNavActive`), e ela tem de ser a mesma: um grupo que se
    // marcasse só na rota exata deixaria de avisar justamente nas telas de segundo nível, que são
    // as que se alcança de dentro de outra tela — o caso que motivou o aviso.
    expect(groupHasActive(grupo('Catálogo'), '/admin/produtos/abc/editar')).toBe(true)
    expect(groupHasActive(grupo('Vendas'), '/admin/pedidos/42')).toBe(true)
  })

  it('nenhum grupo reivindica o Dashboard', () => {
    // `/admin` é prefixo de todas as rotas do painel: um `startsWith` ingênuo faria os quatro
    // grupos se marcarem ao mesmo tempo na tela inicial.
    for (const label of collapsibleLabels()) {
      expect(groupHasActive(grupo(label), '/admin')).toBe(false)
    }
  })

  it('SENSOR: a marca do cabeçalho não substitui a marca do item', () => {
    // O aviso do cabeçalho só faz sentido para grupo FECHADO — aberto, quem responde "onde estou" é
    // o próprio item. Esta asserção existe para deixar registrado que `groupHasActive` **não**
    // depende do estado de colapso: quem cruza as duas coisas é a tela, e o teste dela mede isso.
    expect(groupHasActive(grupo('Loja'), '/admin/home')).toBe(true)
    expect(isCollapsed([], 'Loja')).toBe(false)
  })
})
