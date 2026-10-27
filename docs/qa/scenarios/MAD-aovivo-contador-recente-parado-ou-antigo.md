---
id: MAD-aovivo-contador-recente-parado-ou-antigo
area: MAD
title: Notas do contador: começo recente, teto, contador parado, visitas sem hora e banco sem acessos
persona: Adri no celular
journey: J-ver-a-loja-ao-vivo
expected: Contando desde {dd/mm} às {HHhMM} quando o período começa antes da contagem; a linha do teto no dia do teto; a linha do contador parado sem contagem; {n} visitas deste dia foram contadas antes da contagem por horário com sem_hora > 0; resposta sem a chave acessos mostra os números sem variação e a frase estática do gráfico, sem botão
entry_points: /ao-vivo
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-27-mobile-adm-loja-ao-vivo.md
overlaps: 
---

Feature `83` (`LAV-53`, `LAV-54`, `LAV-55` último item, `LAV-75`). Não provado em navegador na T13 (a fixtura não tinha teto nem linha sem hora): montar fixtura própria em begin…rollback ou interceptar a resposta. Faixa anterior ao início da contagem é trilho vazio, nunca 0.
