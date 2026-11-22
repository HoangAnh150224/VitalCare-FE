export type Identity = unknown;
export type TokenPair = { accessToken: string; refreshToken: string };
export const state = { saved: null as unknown, cleared: 0, authoritiesOk: true, access: null as string | null, refresh: null as string | null };
export function saveSession(t: unknown) { state.saved = t; }
export function clearSession() { state.cleared++; state.access = null; state.refresh = null; }
export async function loadAuthorities(_url: string) { return state.authoritiesOk; }
export function getAccessToken() { return state.access; }
export function getRefreshToken() { return state.refresh; }
export function getIdentity() { return null; }
export function getAuthorities() { return null; }
export async function refreshSession() { return false; }
export async function revalidateAuthorities() { return false; }
