## TC-SEC-001: A cliente que recusou cookies de estatística não aparece em número nenhum

**Tipo:** security
**Prioridade:** P0
**Origem:** §10.3, R-01
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, passos 1, 3, 4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** P0 de privacidade; oráculo é a Loja ao vivo noutro contexto, e "não mudou" exige esperar o atraso de 75 s

### Objetivo

Helena recusou ser medida; aparecer em "Agora na loja" seria a loja descumprir o que ela escolheu.

### Pré-condições

- Conta: `anonima`; a Adri (`admin-atelie`) com `/ao-vivo` aberta noutro contexto
- Massa: ambiente do CH-01; uma cliente de controle (estatística aceita) presente, para provar que a contagem funciona
- Estado de partida: navegador novo, sem escolha de cookies

### Condições reais

as da persona

### Passos

1. Abre a loja, abre as preferências de cookies
   - **Esperado:** a categoria "Estatísticas" presente
2. Recusa "Estatísticas"
   - **Esperado:** a loja segue normal
3. Olha duas joias, põe uma na sacola, vai ao checkout; fica 3 min
   - **Esperado:** na Loja ao vivo, o total, o funil, a lista de joias, a origem e o aparelho continuam como estavam (só a cliente de controle)
4. Sai da loja e a Adri olha "Com sacola" de hoje em Acessos
   - **Esperado:** não subiu por causa de Helena

### Esperado e fonte

Sem consentimento de estatística, nenhum aviso de presença e nenhum número — fonte: PRD §7, §10.3; spec D-01

### Variações

| Variação                         | Ação                                     | Esperado                          |
| -------------------------------- | ---------------------------------------- | --------------------------------- |
| fecha a folha sem escolher        | ignora o aviso de cookies e navega        | não aparece                       |
| aceita só depois                  | aceita estatística no meio da navegação   | passa a aparecer em até 75 s      |
