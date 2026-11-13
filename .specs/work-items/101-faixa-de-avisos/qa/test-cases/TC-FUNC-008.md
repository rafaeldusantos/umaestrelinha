## TC-FUNC-008: O texto do aviso tem contador por campo e é recusado acima de 90 caracteres no total

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-01, UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** valor limite determinístico; a medida de layout correspondente é TC-UI-001

### Objetivo

A Adri cola um texto longo do Instagram. O painel tem de dizer antes de salvar que ele não cabe em duas linhas no celular, em vez de a cliente ver um aviso cortado.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa do manifesto (o A2 tem exatamente 90 caracteres somados); **não salvar** nada nesta sessão
- Estado de partida: em `/admin/faixa-de-avisos`, com o A2 aberto

### Condições reais

as da persona

### Passos

1. Confere o A2 do manifesto (26 + 52 + 12 = 90)
   - **Esperado:** sem recusa
2. Acrescenta um caractere ao texto do A2 (91 no total)
   - **Esperado:** recusado: "<ordinal> aviso: juntos, o trecho em destaque, o texto e o rótulo do link passam de 90 caracteres — no celular, o aviso não cabe em duas linhas."; Salvar desabilitado
3. Cola no destaque um texto de 41 caracteres
   - Entrada: `Black Friday de novembro na Uma Estrelinh`
   - **Esperado:** o contador do campo passa de 40 e o campo mostra a recusa do teto do destaque
4. Desfaz (volta o A2 do manifesto)
   - **Esperado:** as recusas somem

### Esperado e fonte

Tetos 40 / 60 / 20 por campo e 90 somados — fonte: PRD UC-01 ("o painel recusa o que passar disso"); spec H-05, I-05 (sem `maxLength`, contador e recusa ao passar)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| colar com quebra de linha | cola no texto `em anéis` + quebra de linha + `e colares` | ou a quebra vira espaço, ou é recusada — nunca a faixa da prévia ganha uma terceira linha; registrar |
| emoji | acrescenta "✨" ao destaque | contado e aceito dentro do teto, ou recusado com motivo — registrar como conta |
| rótulo de 21 | `Ver as peças da coleção` no rótulo | recusa do teto do rótulo |
