/**
 * A borda de um campo da montagem em erro (o CEP não achado, o cupom recusado): o `alert` no lugar do
 * `field` de `CAMPO`, juntado por `cn` para a cor de borda de `CAMPO` sair. `shared/ui/campo.ts` é de
 * todo o app e não muda; o estado de erro é da montagem.
 */
export const BORDA_DE_ERRO = 'border-estrelinha-alert'
