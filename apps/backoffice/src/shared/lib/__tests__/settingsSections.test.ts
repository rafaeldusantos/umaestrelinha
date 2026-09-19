// Feature 55 — o registro das seções de Configurações.
//
// O que se prova aqui é o **contrato**: quantas seções existem, em que ordem, com que endereço, e
// que o recorte do slug inválido (`CFG-18`) mora num lugar só. O molde é `navItems.test.ts`, que
// guarda a mesma classe de coisa para a sidebar.

import { describe, expect, it } from 'vitest'
import {
  SETTINGS_ROOT,
  SETTINGS_SECTIONS,
  findSettingsSection,
  settingsSectionPath,
} from '../settingsSections'

describe('SETTINGS_SECTIONS — as quatro seções (CFG-01)', () => {
  it('são quatro, nesta ordem', () => {
    // A lista é escrita por extenso, e não derivada, porque **é a asserção**: a ordem do registro é
    // a ordem do rail, da lista do celular e do painel na rota-mãe. Derivá-la daqui provaria que a
    // constante é igual a si mesma.
    expect(SETTINGS_SECTIONS.map(s => s.slug)).toEqual([
      'dados-da-loja',
      'vendas',
      'frete-e-material',
      'notificacoes',
    ])
  })

  it('os rótulos são os da sidebar, não um vocabulário novo', () => {
    expect(SETTINGS_SECTIONS.map(s => s.label)).toEqual([
      'Dados da loja',
      'Vendas',
      'Frete e Material',
      'Notificações',
    ])
  })

  it('`Dados da loja` é a primeira — é ela que a rota-mãe mostra (CFG-02)', () => {
    expect(SETTINGS_SECTIONS[0].slug).toBe('dados-da-loja')
  })

  it('todo item tem rótulo, descrição e ícone renderizável', () => {
    // Âncora: sem o `toBeGreaterThan`, um registro vazio passaria neste laço sem executar um caso.
    expect(SETTINGS_SECTIONS.length).toBeGreaterThan(0)

    for (const section of SETTINGS_SECTIONS) {
      expect(section.label.trim()).not.toBe('')
      expect(section.description.trim()).not.toBe('')
      // Ícone do lucide é um `forwardRef` — objeto, não função. O que importa é ser um tipo que o
      // React aceita renderizar. Mesma régua de `navItems.test.ts`.
      expect(['function', 'object']).toContain(typeof section.icon)
      expect(section.icon).not.toBeNull()
    }
  })

  it('nenhum slug, rótulo ou descrição se repete', () => {
    const slugs = SETTINGS_SECTIONS.map(s => s.slug)
    const labels = SETTINGS_SECTIONS.map(s => s.label)
    const descriptions = SETTINGS_SECTIONS.map(s => s.description)

    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(labels).size).toBe(labels.length)
    // Duas descrições iguais tornariam duas linhas do rail visualmente indistinguíveis abaixo do
    // rótulo — que é justamente o que a descrição existe para evitar.
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('todo slug é kebab-case — ele vai para a URL', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(section.slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
    }
  })
})

describe('settingsSectionPath — o endereço de cada seção (CFG-15)', () => {
  it('toda seção mora sob a rota-mãe', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(settingsSectionPath(section.slug)).toBe(`${SETTINGS_ROOT}/${section.slug}`)
    }
  })

  it('a rota-mãe é a que vive em `footerNavItems`', () => {
    // Se este endereço mudasse, o item do rodapé da sidebar apontaria para lugar nenhum — e a
    // tela continuaria funcionando por link direto, o que esconderia o defeito.
    expect(SETTINGS_ROOT).toBe('/admin/configuracoes')
  })

  it('nenhum caminho tem barra final nem segmento vazio', () => {
    for (const section of SETTINGS_SECTIONS) {
      const path = settingsSectionPath(section.slug)
      expect(path.endsWith('/')).toBe(false)
      expect(path).not.toContain('//')
    }
  })
})

describe('findSettingsSection — o recorte do slug inválido (CFG-18)', () => {
  it('acha a seção pelo slug', () => {
    expect(findSettingsSection('vendas')?.label).toBe('Vendas')
    expect(findSettingsSection('frete-e-material')?.label).toBe('Frete e Material')
  })

  it('slug inexistente devolve `null`', () => {
    expect(findSettingsSection('xpto')).toBeNull()
  })

  it('`undefined` devolve `null` — é a rota-mãe, onde não há parâmetro', () => {
    expect(findSettingsSection(undefined)).toBeNull()
  })

  it('string vazia devolve `null`', () => {
    // `/admin/configuracoes/` com barra final entrega `''` ao `useParams`.
    expect(findSettingsSection('')).toBeNull()
  })

  it('não casa por prefixo nem ignora caixa — o slug é exato', () => {
    // Um `startsWith` faria `/admin/configuracoes/vendas-antigas` abrir Vendas, e a Adri veria a
    // seção errada achando que digitou o endereço certo.
    expect(findSettingsSection('vendas-antigas')).toBeNull()
    expect(findSettingsSection('venda')).toBeNull()
    expect(findSettingsSection('Vendas')).toBeNull()
  })

  it('o que ele devolve é a MESMA referência do registro', () => {
    // Uma cópia aqui seria um segundo dono do rótulo: mudar o registro deixaria de mudar a tela.
    expect(findSettingsSection('notificacoes')).toBe(SETTINGS_SECTIONS[3])
  })
})
