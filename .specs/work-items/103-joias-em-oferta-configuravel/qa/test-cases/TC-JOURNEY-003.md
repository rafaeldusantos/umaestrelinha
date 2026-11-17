## TC-JOURNEY-003: O bloco preparado para uma campanha agendada aparece sozinho na Home no início e sai no fim

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-02.2, RNF-03
**Autor:** dev
**Persona:** PER-01 Adri (prepara) · a loja vista sem login
**Jornada:** J-03, passo 7
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** na sessão é real (espera a virada pelo relógio do banco); a automação deve controlar as datas da campanha em vez de esperar

### Objetivo

A dona prepara o bloco antes e não precisa voltar ao painel no minuto em que a campanha começa nem quando ela
acaba — a cliente vê o bloco exatamente durante a vigência, qualquer que seja o fuso do aparelho dela.

### Pré-condições

- Conta: `admin-loja` no painel; a loja **sem login**
- Massa: "Dia das Mães" desligada (passo 1 do CH-06); C-VIR "QA103 Virada" criada ligada, de T0 a T0 + 10 min; B-3 com C-VIR, título "Virada QA", ligado
- Estado de partida: antes de T0; aba da loja em 390 × 844

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844) na loja                      |
| Rede        | rápida                                           |
| Locale      | pt-BR; fuso do browser emulado adiantado (ex.: `Asia/Tokyo`) nas variações |
| Modalidade  | toque                                            |

### Entrada

`http://localhost:8082/` recarregada em três momentos: antes de T0, em T0 + 1 min, em T0 + 11 min.

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | antes de T0, recarrega a Home | nenhum bloco de ofertas (nem B-1, desligada, nem B-3, agendada); nenhum espaço reservado | 4 s |
| 2 | antes de T0, com o fuso emulado adiantado, recarrega | o mesmo | 4 s |
| 3 | em T0 + 1 min, recarrega | B-3 aparece: "Virada QA" e os cartões de 10 % de "QA103 Virada" | 4 s |
| 4 | em T0 + 1 min, olha a linha de B-3 no painel | em vigência | 4 s |
| 5 | em T0 + 11 min, recarrega | B-3 não aparece mais | 4 s |

### Objetivo e efeitos

O bloco existiu na Home só entre T0 e T0 + 10 min, sem nenhuma ação no painel nesse intervalo. A linha de B-3
acompanha (agendada → em vigência → encerrada).

### Caminho de abandono

A campanha é desligada durante a vigência — TC-FUNC-021.

### Esperado e fonte

Durante a vigência da campanha escolhida, o bloco aparece com os percentuais dela; antes do início e depois do fim,
não; a loja decide pelo que o banco entrega como vigente, nunca pelo relógio do aparelho — fonte: PRD CA-02.2,
RNF-03; cenário "Campanha agendada escolhida: nada na loja antes do início, e o bloco aparece sozinho no início"

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| fuso atrasado | no passo 3, emular `America/Manaus` | B-3 aparece igual |
| Home aberta antes de T0 | deixar uma aba aberta desde antes de T0 e olhar depois sem recarregar | anotar o que vê, sem julgar (🟡 do plano) |
