// Feature 55 — o par entre "quais seções existem" e "o que cada uma desenha".
//
// São dois arquivos por necessidade de camada (ver o cabeçalho de `panels.tsx`), e dois arquivos é
// uma divergência esperando acontecer. Este guarda é o que impede a divergência de ser silenciosa —
// e ele é **bidirecional**, no molde de `menuIconCatalog.test.ts`:
//
// - seção sem painel ⇒ a Adri clica no rail e o painel abre em branco;
// - painel sem seção ⇒ um componente que ninguém alcança fica no bundle para sempre.
//
// O `tsc` já pega o primeiro sentido (`Record<SettingsSectionSlug, …>` exige a chave). Ele **não**
// pega o segundo: uma chave a mais num `Record` é erro de tipo, mas um componente exportado e nunca
// referenciado não é erro de nada.

import { describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS } from '@/shared/lib/settingsSections'
import { SETTINGS_PANELS } from '../panels'

const chavesDoMapa = Object.keys(SETTINGS_PANELS)
const slugsDoRegistro = SETTINGS_SECTIONS.map(s => s.slug)

describe('SETTINGS_PANELS — âncora', () => {
  it('o registro e o mapa não estão vazios', () => {
    // Sem isto, dois objetos vazios satisfariam todas as asserções abaixo — a falha mais silenciosa
    // que um guarda bidirecional pode ter.
    expect(slugsDoRegistro.length).toBeGreaterThan(0)
    expect(chavesDoMapa.length).toBe(slugsDoRegistro.length)
  })
})

describe('SETTINGS_PANELS — bidirecional (registro ↔ painéis)', () => {
  it('toda seção do registro tem painel', () => {
    for (const slug of slugsDoRegistro) {
      expect(chavesDoMapa, `seção ${slug} sem painel`).toContain(slug)
    }
  })

  it('todo painel do mapa é uma seção do registro', () => {
    // O sentido que o `tsc` NÃO pega sozinho, e o que evita componente órfão no bundle.
    for (const chave of chavesDoMapa) {
      expect(slugsDoRegistro, `painel ${chave} sem seção`).toContain(chave)
    }
  })

  it('cada painel é um componente renderizável', () => {
    for (const slug of slugsDoRegistro) {
      const Painel = SETTINGS_PANELS[slug]
      // Componente de função é `function`; um embrulhado em `memo`/`forwardRef` é `object`. O que
      // importa é ser um tipo que o React aceita montar. Mesma régua de `navItems.test.ts`.
      expect(['function', 'object'], `painel de ${slug}`).toContain(typeof Painel)
      expect(Painel).not.toBeNull()
      expect(Painel).not.toBeUndefined()
    }
  })

  it('nenhuma seção compartilha o painel de outra', () => {
    // Duas seções apontando para o mesmo componente seriam duas entradas no rail abrindo a mesma
    // tela — e o erro passaria por completude: as duas chaves existem, as duas têm painel.
    const paineis = slugsDoRegistro.map(slug => SETTINGS_PANELS[slug])
    expect(new Set(paineis).size).toBe(paineis.length)
  })

  it('SENSOR: o guarda reprova nos DOIS sentidos', () => {
    // A régua não pode ser aplicada ao objeto real (mutá-lo vazaria para os outros casos), então ela
    // é extraída e chamada com fixtures — e é a MESMA comparação das asserções acima.
    const divergem = (slugs: string[], chaves: string[]) =>
      slugs.some(s => !chaves.includes(s)) || chaves.some(c => !slugs.includes(c))

    // Estado bom.
    expect(divergem(slugsDoRegistro, chavesDoMapa)).toBe(false)
    // Seção sem painel.
    expect(divergem([...slugsDoRegistro, 'marketing'], chavesDoMapa)).toBe(true)
    // Painel sem seção.
    expect(divergem(slugsDoRegistro, [...chavesDoMapa, 'marketing'])).toBe(true)
  })
})
