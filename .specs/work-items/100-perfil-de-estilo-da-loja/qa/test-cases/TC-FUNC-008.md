## TC-FUNC-008: Ao trocar de página, a loja aberta passa ao perfil salvo e não volta ao anterior

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-04, UC-01 (segundo item)
**Autor:** dev
**Persona:** PER-03 Rodrigo
**Jornada:** J-03, ramo J-03a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** exige o documento interceptado (ver Ambiente)

### Objetivo

Quem estava com a loja aberta precisa chegar ao perfil novo sem recarregar — e de uma vez, sem a loja alternar entre os
dois.

### Pré-condições

- Conta: `anonima`
- Massa: perfil salvo = Black Friday; documento interceptado com `data-perfil="padrao"`
- Estado de partida: Home carregada em Padrão (TC-FUNC-007)

### Condições reais

As da persona.

### Passos

1. Toca no menu e entra numa categoria
   - **Esperado:** atributo `black-friday`; cabeçalho `#0D0C0B`
2. Abre um produto
   - **Esperado:** `black-friday`
3. Volta com o botão do navegador até a Home (a página da carga)
   - **Esperado:** continua `black-friday` — voltar não devolve o perfil do HTML

### Esperado e fonte

A partir da troca de página vale o perfil salvo; voltar à entrada da carga não devolve a decisão ao atributo — fonte:
PRD RN-04, UC-01; spec R2.

### Variações

| Variação                     | Ação                                          | Esperado                                       |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| troca só de query            | `/busca?q=pingente` → `/busca?q=anel`         | registre o que acontece (a fonte fala de "troca de página"; query é borda — 🟡 do plano) |
| recarregar a página da carga | F5 com a rota do documento ativa              | `padrao` de novo (é uma carga nova, não achado) |
