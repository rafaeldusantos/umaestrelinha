## TC-FUNC-001: A dona monta três avisos de texto e um de imagem, liga a faixa, salva, e a tela volta igual depois de recarregar

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-03, CA-01
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 2–7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** é o passo que cria a massa de todo o resto do plano; fluxo P0 determinístico, pedido de automação E2E

### Objetivo

A Adri quer pôr a campanha no ar sem deploy. Se a gravação falhar em silêncio, a loja fica sem aviso e ela não sabe.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa nunca configurada (nasce desligada, sem avisos); as artes de `Uploads` (Ambiente da execução); dois caminhos de categoria reais da loja local (C1, C2), anotados no log
- Estado de partida: logada no painel, em `/admin/faixa-de-avisos` (pelo grupo **Loja › Faixa de avisos** da navegação)

### Condições reais

as da persona (computador 1440 × 900, mouse e teclado)

### Passos

1. Abre a tela pela navegação: **Loja › Faixa de avisos**
   - **Esperado:** título "Faixa de avisos"; interruptor "Faixa ligada" desligado; prévia dizendo "A faixa está desligada: a loja abre sem ela."; contador "0 de 5"
2. Usa "+ Adicionar aviso" e preenche o A1 do manifesto (tipo Texto)
   - Entrada: destaque `Black Friday` · texto `novembro inteiro com joias em oferta` · rótulo `Ver ofertas` · destino C1
   - **Esperado:** o aviso aparece aberto, com os contadores dos campos; nenhuma recusa
3. Acrescenta A2 e A3 do manifesto (Texto) e A4 (Imagem, com as duas artes e o texto alternativo)
   - **Esperado:** contador "4 de 5"; um aviso aberto por vez; a linha-resumo de cada um diz "Texto · <destino>", "Texto · sem link" (A3) ou "Imagem · <destino>"
4. Liga "Faixa ligada"
   - **Esperado:** ao lado do interruptor, a ajuda fixa sobre o atraso de até uma hora
5. Salva
   - **Esperado:** "Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja."
6. Recarrega a página (F5)
   - **Esperado:** os quatro avisos na mesma ordem e com os mesmos textos, a arte do A4 nas miniaturas, interruptor ligado
7. Abre a loja (`http://localhost:8082/`) numa aba nova
   - **Esperado:** a faixa ouro acima do cabeçalho com o A1

### Esperado e fonte

A configuração gravada pela tela é a que a tela relê e a que a loja mostra — fonte: PRD UC-03 e CA-01; spec H-14 (frase do salvar), H-19 (validade)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| duplo clique no Salvar | clica duas vezes seguidas | uma gravação só; a frase do salvo aparece uma vez; nada duplicado na lista depois do F5 |
| sair sem salvar | edita o texto do A1 e tenta ir para outra tela do painel | o painel avisa que há alteração não salva (molde `SettingsSaveButton`, spec H-23) |
