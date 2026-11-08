// O rascunho da montagem não leva nada da cliente nem o motivo do desconto — a metade por EXECUÇÃO da
// régua de `shared/lib/__tests__/semDadoDeClienteNoAparelho.test.ts` (que a ancora; a outra metade, a
// por termo sobre o código do dono, mora lá). Uma montagem com tudo preenchido por sentinelas únicas
// passa pelo dono (`rascunhoDaMontagem`, `guardarRascunho`, `lerRascunho`), e nenhuma sentinela pode
// chegar ao armazenamento do aparelho. Os sensores provam que nome, e-mail, telefone, documento,
// endereço ou o motivo no rascunho reprovam na mesma régua.
import { describe, expect, it } from 'vitest'

import type { ClienteDaMontagem } from '@/entities/customer'

import { montagemVazia, type EstadoDaMontagem } from '../montagem'
import { RASCUNHO_KEY, apagarRascunho, guardarRascunho, lerRascunho, rascunhoDaMontagem, type Rascunho } from '../rascunho'

describe('o rascunho da montagem — nada da cliente nele, por execução', () => {
  /** Uma montagem com tudo preenchido: cada dado da cliente e o motivo são sentinelas únicas. */
  const SENTINELAS = {
    nome: 'SENTINELA-NOME-Marina',
    email: 'sentinela-email@exemplo.invalid',
    telefone: '51900001111',
    documento: '98765432100',
    rua: 'SENTINELA-RUA-dos-Andradas',
    cep: '91999000',
    motivo: 'SENTINELA-MOTIVO-segunda-peca',
    observacao: 'SENTINELA-OBSERVACAO-embrulhar',
    idDaCliente: 'eeeeeeee-0000-4000-8000-00000000000e',
  }
  const montagemCheia = (): EstadoDaMontagem => {
    const cliente: ClienteDaMontagem = {
      id: SENTINELAS.idDaCliente,
      name: SENTINELAS.nome,
      email: SENTINELAS.email,
      phone: SENTINELAS.telefone,
      fichaId: SENTINELAS.idDaCliente,
      pedidos: 3,
    }
    return {
      ...montagemVazia(),
      cliente,
      entrega: 'outro',
      contato: { nome: SENTINELAS.nome, email: SENTINELAS.email, whatsapp: SENTINELAS.telefone, documento: SENTINELAS.documento },
      endereco: { cep: SENTINELAS.cep, rua: SENTINELAS.rua, numero: '12', complemento: '', bairro: 'Centro', cidade: 'Porto Alegre', uf: 'RS' },
      pecas: [
        {
          chave: 'linha-1',
          pecaId: 'bbbbbbbb-0000-4000-8000-000000000001',
          variacaoId: null,
          quantidade: 2,
          gravacao: 'Vó Lia',
          nome: 'Colar Estrela',
          rotulo: null,
          foto: null,
          preco: 120,
          pedeMaterial: false,
          medidas: null,
        },
      ],
      cupom: { codigo: 'SAUDADE10', tipo: 'percent', valor: 10, primeiraCompra: false },
      combinado: { ligado: true, tipo: 'amount', valor: '20', motivo: SENTINELAS.motivo },
      observacao: SENTINELAS.observacao,
    }
  }
  /** A régua por EXECUÇÃO: as sentinelas que aparecem no texto gravado. */
  const vazamentos = (gravado: string): string[] =>
    Object.entries(SENTINELAS)
      .filter(([, v]) => gravado.includes(v))
      .map(([k]) => k)

  const gravadoDe = (r: Rascunho | null): string => {
    apagarRascunho()
    guardarRascunho(r)
    const cru = localStorage.getItem(RASCUNHO_KEY) ?? ''
    apagarRascunho()
    return cru
  }

  it('âncora: o rascunho de uma montagem cheia é gravado, com as peças e os descontos', () => {
    const cru = gravadoDe(rascunhoDaMontagem(montagemCheia(), 'conta-a'))
    expect(cru).toContain('bbbbbbbb-0000-4000-8000-000000000001')
    expect(cru).toContain('SAUDADE10')
    expect(cru).toContain('"valor":"20"')
  })

  it('o rascunho gravado de uma montagem cheia não leva nada da cliente nem o motivo', () => {
    expect(vazamentos(gravadoDe(rascunhoDaMontagem(montagemCheia(), 'conta-a')))).toEqual([])
  })

  it('o rascunho LIDO de volta descarta o campo a mais que alguém tenha gravado à mão', () => {
    const r = rascunhoDaMontagem(montagemCheia(), 'conta-a')!
    localStorage.setItem(RASCUNHO_KEY, JSON.stringify({ ...r, nome: SENTINELAS.nome, combinado: { ...r.combinado, motivo: SENTINELAS.motivo } }))
    const lido = lerRascunho('conta-a')
    apagarRascunho()
    expect(lido).not.toBeNull()
    expect(vazamentos(JSON.stringify(lido))).toEqual([])
  })

  it.each([
    ['nome', { nome: SENTINELAS.nome }],
    ['e-mail', { email: SENTINELAS.email }],
    ['telefone', { telefone: SENTINELAS.telefone }],
    ['documento (CPF)', { documento: SENTINELAS.documento }],
    ['endereço', { endereco: { rua: SENTINELAS.rua, cep: SENTINELAS.cep } }],
    ['o motivo do desconto', { motivo: SENTINELAS.motivo }],
  ])('sensor por execução: %s no rascunho reprova', (_, extra) => {
    const r = rascunhoDaMontagem(montagemCheia(), 'conta-a')!
    expect(vazamentos(JSON.stringify({ ...r, ...extra })).length).toBeGreaterThan(0)
  })

  it('sensor por execução: o rascunho com um campo a mais NÃO vai ao aparelho (a forma gravada é a do dono)', () => {
    const r = rascunhoDaMontagem(montagemCheia(), 'conta-a')!
    const comCarona = { ...r, nome: SENTINELAS.nome, combinado: { ...r.combinado, motivo: SENTINELAS.motivo } } as Rascunho
    expect(vazamentos(gravadoDe(comCarona))).toEqual([])
  })
})
