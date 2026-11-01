export async function login(usuario: string, token: string) {
  console.log("login", usuario, token);
  return { ok: true };
}
