// Callback OIDC e logout no IdP.
export async function logout(session: { idToken: string }) {
  // TODO: chamar o end_session_endpoint do Azure AD
  return { status: 204 };
}
