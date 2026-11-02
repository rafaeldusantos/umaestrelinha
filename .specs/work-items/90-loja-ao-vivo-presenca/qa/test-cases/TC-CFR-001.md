## TC-CFR-001: Com a fonte do celular grande, o cartão e a Loja ao vivo cabem na tela, sem rolar de lado e sem número sobreposto

**Tipo:** cfr
**Prioridade:** P1
**Origem:** LAV-63
**Autor:** dev
**Persona:** PER-02 Adri à noite, fonte 200 %
**Jornada:** J-01, J-02
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** a medida de layout é de navegador (jsdom mede zero); julgamento de sobreposição

### Objetivo

À noite, com a fonte no máximo, a Adri lê todos os números sem que um pinte por cima do outro.

### Pré-condições

- Conta: `admin-atelie`
- Massa: 3 clientes presentes em estados, origens e aparelhos diferentes; Acessos com números de 4 dígitos
- Estado de partida: Início

### Condições reais

| Dimensão    | Valor                            |
| ----------- | -------------------------------- |
| Dispositivo | celular 390 × 844 a 100/130/200 % de fonte; 320 × 568 |

### Passos

1. A 130 % e a 200 %, abre o Início e a Loja ao vivo inteira
   - **Esperado:** `scrollWidth` do documento igual à largura da tela em cada tela
2. Olha "De onde vieram" e Acessos a 200 %
   - **Esperado:** as grades de duas colunas caem para uma coluna; nenhum número cortado ou sobreposto
3. Olha o cartão do Início a 200 %
   - **Esperado:** número, "pessoas", linha do funil e mini gráfico legíveis, sem sobrepor

### Categoria

Compatibilidade (viewport e fonte) e Usabilidade.

### Metas

| Observável                          | Alvo                | Aceitável         |
| ----------------------------------- | ------------------- | ----------------- |
| rolagem horizontal do body           | nenhuma             | nenhuma           |
| grade com fonte grande               | uma coluna          | uma coluna        |
| texto sobreposto                     | nenhum              | nenhum            |

### Esperado e fonte

`auto-fit` com piso de 9 rem, grades caindo a uma coluna — fonte: PRD LAV-63; `CLAUDE.md` › Mobile é o caso principal

### Variações

| Variação | Ação          | Esperado                    |
| -------- | ------------- | --------------------------- |
| 1440      | abre a tela   | sem espaço quebrado; sem rolar de lado |
