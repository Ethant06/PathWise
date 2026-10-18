import { getToken } from "../../session";

/** API implementations need the saved login token. Mocks never call this. */
export async function requireToken(action: string): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error(`Log in to ${action}.`);
  return token;
}
