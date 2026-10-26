// Feature `76` · T15 — as seis listas de colunas são as chaves que o probe 01 mediu no banco, escritas
// aqui POR EXTENSO (derivá-las do módulo provaria que ele é igual a si mesmo), e nenhuma carrega o que
// o app não desenha (`MAC-29`). `orders_open` é a 19ª coluna da migration da `76`, provada pelo probe 02.
import { describe, expect, it } from 'vitest'

import {
  COLUNAS_DA_CIDADE,
  COLUNAS_DA_FICHA,
  COLUNAS_DA_LISTA,
  COLUNAS_DO_ACHADO,
  COLUNAS_DO_PEDIDO,
  COLUNAS_DOS_ITENS,
} from '../linha'

const chaves = (lista: string) => lista.split(',').map((c) => c.trim())

describe('as colunas são as chaves medidas no banco (AD-012)', () => {
  it('COLUNAS_DA_LISTA (customer_list)', () =>
    expect(chaves(COLUNAS_DA_LISTA)).toEqual([
      'id', 'name', 'email', 'phone', 'created_at', 'orders_paid', 'total_spent', 'last_order_at', 'last_activity_at', 'orders_open',
    ]))
  it('COLUNAS_DA_FICHA (customer_list)', () =>
    expect(chaves(COLUNAS_DA_FICHA)).toEqual([
      'id', 'name', 'email', 'phone', 'created_at', 'orders_paid', 'orders_total', 'total_spent', 'avg_ticket', 'orders_open',
    ]))
  it('COLUNAS_DO_PEDIDO (order_list)', () =>
    expect(chaves(COLUNAS_DO_PEDIDO)).toEqual([
      'id', 'order_number', 'status', 'payment_status', 'shipping_service_id', 'material_status', 'total', 'created_at',
    ]))
  it('COLUNAS_DOS_ITENS (order_items)', () => expect(chaves(COLUNAS_DOS_ITENS)).toEqual(['order_id', 'product_name']))
  it('COLUNAS_DA_CIDADE (order_list)', () => expect(chaves(COLUNAS_DA_CIDADE)).toEqual(['address_city', 'address_state']))
  it('COLUNAS_DO_ACHADO (customer_directory)', () => expect(chaves(COLUNAS_DO_ACHADO)).toEqual(['id']))
})

describe('nenhuma lista carrega o que a tela não desenha (MAC-29)', () => {
  const TODAS = { COLUNAS_DA_LISTA, COLUNAS_DA_FICHA, COLUNAS_DO_PEDIDO, COLUNAS_DOS_ITENS, COLUNAS_DA_CIDADE, COLUNAS_DO_ACHADO }
  const PROIBIDAS = [
    'cpf', 'material_kinds', 'orders_with_material', 'same_email_count', 'customer_document', 'customer_phone',
    'address_street', 'address_number', 'address_complement', 'address_neighborhood', 'address_zip', 'notes', 'nuvemshop_', 'user_id', 'has_account',
  ]

  it('âncora: seis listas', () => expect(Object.keys(TODAS)).toHaveLength(6))

  const acusadas = (lista: string) => [...PROIBIDAS, '*'].filter((p) => lista.includes(p))

  it.each(Object.entries(TODAS))('%s', (_nome, lista) => expect(acusadas(lista)).toEqual([]))

  it('sensor: a MESMA régua acusa uma lista com `cpf`, `material_kinds` ou `*`', () => {
    expect(acusadas(`${COLUNAS_DA_LISTA}, cpf`)).toEqual(['cpf'])
    expect(acusadas(`${COLUNAS_DA_FICHA}, material_kinds`)).toEqual(['material_kinds'])
    expect(acusadas('*')).toEqual(['*'])
  })

  it('a única exceção de `address_*` é a cidade e o estado, na leitura da cidade', () => {
    expect(chaves(COLUNAS_DA_CIDADE).every((c) => c === 'address_city' || c === 'address_state')).toBe(true)
  })
})
