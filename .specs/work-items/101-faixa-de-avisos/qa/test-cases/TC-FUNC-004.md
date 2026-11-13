## TC-FUNC-004: Rótulo do link sem destino é recusado, com o motivo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04, UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** regra pura com mensagem; determinístico

### Objetivo

A Adri escreve "Ver ofertas" e esquece o destino. Um "Ver ofertas" que não leva a lugar nenhum é promessa quebrada na frente da cliente.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa do manifesto; **não salvar** nada nesta sessão
- Estado de partida: em `/admin/faixa-de-avisos`, com o A3 (sem destino) aberto

### Condições reais

as da persona

### Passos

1. No A3, escreve um rótulo de link, sem destino
   - Entrada: rótulo `Como funciona`
   - **Esperado:** recusado com "Sem destino, o rótulo do link não aparece." (precedido do número do aviso); o Salvar fica desabilitado
2. Apaga o rótulo
   - **Esperado:** a recusa some; a dica do destino diz "Sem destino, o aviso é só texto."; a linha-resumo diz "Texto · sem link"
3. Num aviso com destino (A1), apaga só o rótulo
   - **Esperado:** aceito — destino sem rótulo vale (o aviso inteiro é o link)

### Esperado e fonte

Rótulo só com destino; destino sem rótulo vale; sem destino o aviso é texto — fonte: PRD CA-04; spec H-19, Design (dica do Destino)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| rótulo só com espaços | três espaços no rótulo, sem destino | tratado como vazio: sem recusa |
| aviso vazio | apaga destaque e texto do A1 | recusado: o aviso vazio não aparece na loja |
