## TC-UI-001: Tela "Registrar pagamento" no celular: sem rolagem lateral, alvos de 44 px, câmera e galeria

**Tipo:** ui
**Prioridade:** P1
**Origem:** RNF-04
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, passos 2–4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** a Validation deixou RNF-04 para o QA (jsdom não mede layout); medição no browser

### Objetivo

A dona consegue registrar com uma mão, no celular, sem rolar de lado nem errar o toque.

### Pré-condições

- Conta: `admin`
- Massa: M6; três comprovantes anexados no meio do caso (nomes longos)
- Estado de partida: `/admin/pedidos/:id/pagamento`

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular 390 × 844 e 320 × 568; 1440 no fim       |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | toque                                            |

### Protótipo e tela

Sem protótipo (decisão do humano). Régua: molde dos formulários do painel (`FormCard`, `FieldGroup`, `ActionButton`, `RecordPageHeader`) e a regra de mobile do `CLAUDE.md`.

### Propriedades a comparar

- `scrollWidth` do documento igual à largura da viewport, com três comprovantes de nome longo anexados e com o portão aberto
- Altura de cada controle tocável (meio, data/hora, anexar, remover anexo, confirmar, voltar) ≥ 44 px
- O campo de arquivo aceita imagem e PDF e oferece câmera e galeria (atributo `accept` com os cinco tipos; o seletor do sistema mostra as duas fontes)
- O botão de confirmar alcançável com o teclado virtual aberto na observação
- Nomes de arquivo longos quebram ou abreviam dentro da linha, sem estourar

### Passos

1. Mede a tela vazia em 390 e em 320
   - **Esperado:** sem rolagem lateral; alvos ≥ 44 px
2. Anexa três comprovantes de nome longo e escreve uma observação longa
   - **Esperado:** sem rolagem lateral; remover de cada anexo com alvo ≥ 44 px
3. Abre o portão e a recusa de um arquivo
   - **Esperado:** cabem em 390, sem cobrir o botão de sair
4. Repete em 1440
   - **Esperado:** sem campo esticado de ponta a ponta nem botão perdido

### Esperado e fonte

Envio em 390, câmera e galeria, 44 px, sem rolagem lateral — fonte: PRD RNF-04; `CLAUDE.md` › Mobile é o caso principal.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Paisagem | girar para 844 × 390 | o formulário e o botão alcançáveis |
