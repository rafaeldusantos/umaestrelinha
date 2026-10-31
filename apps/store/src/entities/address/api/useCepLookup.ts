// Resolução de CEP no ViaCEP (SHP-03, ADR-01).
//
// O dono é `@estrelinha/core/hooks/useCepLookup` desde a feature 89 (`MON-04`): o painel completa o
// endereço da proposta pelo mesmo serviço, e dois apps ⇒ `packages/core`. Este arquivo só reexporta,
// POR REFERÊNCIA — `useCepLookupNoCore.test.ts` confere com `toBe`, e uma cópia com o mesmo
// comportamento reprova. Os consumidores da loja (`features/checkout`, `features/edit-address`) e os
// dublês dos testes deles seguem importando deste endereço. Nenhuma lógica pode voltar a morar aqui.
export {
  useCepLookup,
  CEP_LOOKUP_KEY,
  type CepLookupResult,
} from '@estrelinha/core/hooks/useCepLookup'
