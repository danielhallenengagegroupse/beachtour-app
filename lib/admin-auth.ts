export const ADMIN_SESSION_COOKIE = "beachtour_admin_session";

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? "admin";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "1967";
}

export function getAdminSessionToken() {
  return process.env.ADMIN_SESSION_TOKEN ?? "beachtour-admin-session";
}

export function isValidAdminCredentials(username: string, password: string) {
  return username === getAdminUsername() && password === getAdminPassword();
}
