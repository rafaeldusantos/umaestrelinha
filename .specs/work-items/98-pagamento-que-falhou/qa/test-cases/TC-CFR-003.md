## TC-CFR-003: Formulário e bloco Pagamento se sustentam com a fonte a 130/200 % e em 1440

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — compatibilidade de viewport e fonte (RNF-04 estendido ao bloco Pagamento)
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01 e J-02
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medição de layout no browser

### Objetivo

Com a fonte do celular grande, a dona ainda registra e confere o pagamento.

### Pré-condições

- Conta: `admin`
- Massa: M6, M7 (registro com três comprovantes e observação longa), M11 (selos)
- Estado de partida: `/admin/pedidos/<M7>`

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | 390 × 844 a 100/130/200 %; 1440                   |
| Modalidade  | toque                                            |

### Categoria

Compatibilidade.

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| Rolagem lateral do documento | nenhuma em 390 a 100/130/200 % | — |
| Bloco Pagamento | meio, data, autor, observação, comprovantes, selos e ações sem sobreposição nem corte | — |
| Ações do bloco (Desfazer, Gerar link, Registrar) | alvo ≥ 44 px, texto inteiro | — |
| 1440 | nada esticado nem perdido | — |

### Passos

1. Mede o bloco de M7 e de M11 nas três escalas
   - **Esperado:** dentro das metas
2. Mede a tela de registrar nas três escalas
   - **Esperado:** dentro das metas
3. Repete em 1440
   - **Esperado:** dentro das metas

### Esperado e fonte

Mobile primeiro, 100–200 % — fonte: PRD RNF-04; `CLAUDE.md`; costura › Obrigações transversais.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
