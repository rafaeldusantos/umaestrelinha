## TC-CFR-001: Com Black Friday salvo, a primeira pintura já é preto e ouro mesmo em rede lenta, sem passar pela ardósia

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-02, RN-04
**Autor:** dev
**Persona:** PER-05 Marta
**Jornada:** J-03, ramo J-03b
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** build servido + documento com `data-perfil` por `route.fulfill` + Slow 4G/CPU 4× por CDP; driver `cli`

### Objetivo

A página "piscar" de ardósia para preto em rede lenta é a troca de cor diante da cliente que RN-04 proíbe.

### Pré-condições

- Conta: `anonima`
- Massa: S1; o build servido (`vite preview`) com o documento da Home e de um produto devolvidos com
  `data-perfil="black-friday"` no `<html>`
- Estado de partida: navegador novo, cache vazio

### Condições reais

| Dimensão | Valor                    |
| -------- | ------------------------ |
| Rede     | Slow 4G, CPU 4×          |

### Categoria

Performance percebida (e paridade com produção: o documento interceptado faz o papel da função `api/page`).

### Metas

| Observável                                            | Alvo                      | Aceitável |
| ----------------------------------------------------- | ------------------------- | --------- |
| cor do cabeçalho em todo quadro desde o primeiro      | só `#0D0C0B`              | —         |
| FCP da Home                                           | < 2 s                     | < 4 s     |
| CLS da Home com `black-friday` × com `padrao`         | igual                     | +0,01     |

### Passos

1. Abre a Home com rede lenta e grava a cor do cabeçalho e do botão primário a cada quadro
   - **Esperado:** nunca `#283A4A`/`#34495E`
2. Repete num produto
   - **Esperado:** o mesmo
3. Mede FCP e CLS
   - **Esperado:** dentro das metas

### Esperado e fonte

O primeiro HTML servido já traz o perfil e nenhuma pintura sai com a paleta Padrão antes — fonte: PRD CA-02, RN-04.

### Variações

| Variação                                   | Ação                                | Esperado                                         |
| ------------------------------------------ | ----------------------------------- | ------------------------------------------------ |
| documento em `padrao`, salvo Black Friday  | carga e depois troca de página      | carga toda em ardósia; após a troca, preto sem salto de layout |
