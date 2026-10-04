// O dono da consulta de CEP é `entities/address` desde a feature 59 (`AD-033`: dois consumidores no
// mesmo app). Este arquivo só reexporta — o bloco Entrega importa daqui, e os testes do checkout
// dublam este endereço. Nenhuma lógica pode voltar a morar aqui.
export { useCepLookup, CEP_LOOKUP_KEY, type CepLookupResult } from '@/entities/address/api/useCepLookup'
