// A folha (`ui/InstagramInviteSheet`) fica FORA do barrel de propósito: ela é carregada sob demanda
// pelo próprio `InstagramInvite`, e reexportá-la aqui a traria de volta ao chunk de quem importa o
// barrel.
export { default as InstagramInvite } from './ui/InstagramInvite'
