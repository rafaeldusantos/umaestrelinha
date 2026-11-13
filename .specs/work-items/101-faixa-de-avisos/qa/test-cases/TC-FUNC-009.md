## TC-FUNC-009: Desligada, a faixa some das páginas da loja e o cabeçalho volta para o topo; religada, volta com os mesmos avisos

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-04, CA-05
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-05, passos 1–4 e 6
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** em dev a loja decide pela configuração (sem `data-faixa`); determinístico

### Objetivo

A campanha acabou. A Adri desliga e confere que a loja voltou ao normal — e não quer remontar tudo na próxima campanha.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa do manifesto, ligada
- Estado de partida: em `/admin/faixa-de-avisos`; a loja aberta numa segunda aba na Home

### Condições reais

as da persona

### Passos

1. Desliga "Faixa ligada" e salva
   - **Esperado:** a frase do salvo com o aviso de até uma hora; a prévia diz "A faixa está desligada: a loja abre sem ela."; a lista de avisos continua na tela
2. Na aba da loja, abre uma categoria (navegação interna) e depois recarrega a Home
   - **Esperado:** nenhuma faixa; o `<header>` encostado no topo da página (y = 0)
3. Abre um produto e rola a página para baixo e para cima
   - **Esperado:** sem faixa; o cabeçalho se recolhe e volta como antes da faixa existir
4. Volta ao painel, religa e salva
   - **Esperado:** os quatro avisos do manifesto, na mesma ordem
5. Recarrega a loja
   - **Esperado:** a faixa com o A1 de novo

### Esperado e fonte

Desligada: a faixa não existe e o cabeçalho volta para o topo — fonte: PRD UC-04, CA-05; Design (descrição do interruptor "Desligada, a faixa some e o cabeçalho volta para o topo."). Os avisos ficarem guardados com a faixa desligada vem da forma `{ enabled, items }` da configuração (spec PR-7)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| lista vazia com interruptor ligado | tira os quatro avisos (sem salvar) e olha a prévia | "A faixa está desligada: a loja abre sem ela." — UC-04; desfazer sem salvar |
| todos os avisos inválidos | não se alcança pela tela (o Salvar fica desabilitado) — pular |
