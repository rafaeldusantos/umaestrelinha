## TC-UI-004: As telas de campanhas do painel não rolam de lado no celular

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-15
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida de layout em navegador real

### Objetivo

A dona consegue conferir e ajustar a campanha pelo celular, fora do ateliê, sem a tela fugir para o lado.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência; "Natal" agendada
- Estado de partida: `/admin/campanhas`

### Condições reais

| Dimensão    | Valor |
| ----------- | ----- |
| Dispositivo | celular (390 × 844) |
| Modalidade  | toque |

### Passos

1. Abre a lista
   - **Esperado:** cartões (nome + estado; "{vigência} · {n} peças"; selo + pílulas); sem rolagem horizontal
2. Abre "Nova campanha" (sem salvar)
   - **Esperado:** uma coluna; a prévia abaixo; os seletores de cor e os campos de data e hora cabem; alvos ≥ 44 px; sem rolagem horizontal
3. Abre a edição da Black Friday
   - **Esperado:** as pílulas de percentual com o uso e "Tirar {p}%" cabem; sem rolagem horizontal
4. Abre a aba Preço e estoque de M-A
   - **Esperado:** o cartão da campanha com os botões de percentual (≥ 44 px), a tabela sem a coluna Preço; sem rolagem horizontal

### Esperado e fonte

A tela de campanhas do painel em 390 sem rolagem lateral — fonte: PRD CA-15, RN-15; `spec.md` › Painel · Campanhas
(celular: cartões; abaixo de 1024 px, uma coluna).

### Protótipo e tela

`Painel - Campanhas, faixa e perfil.html` › Campanhas · lista e Campanha · nova, no frame do celular

### Propriedades a comparar

`scrollWidth` do corpo × largura da tela; altura dos alvos de toque

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recusa longa | provoca a recusa de vigência cruzada em 390 | o texto embrulha, sem rolagem horizontal |
| fonte a 200 % | dobra a fonte na lista | sem rolagem horizontal |
