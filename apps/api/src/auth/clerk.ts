import { createClerkClient } from "@clerk/backend";

let client: ReturnType<typeof createClerkClient> | undefined;

function getClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) return null;
  client ??= createClerkClient({ secretKey, publishableKey });
  return client;
}

export async function authenticateRequest(request: Request): Promise<string | null> {
  const clerk = getClient();
  if (!clerk) return null;

  const configuredParties = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  const authorizedParties = (configuredParties || process.env.RENDER_EXTERNAL_URL || "")
    .split(",")
    .map((party) => party.trim())
    .filter(Boolean);
  if (!authorizedParties.length) return null;

  const state = await clerk.authenticateRequest(request, { authorizedParties });
  if (!state.isAuthenticated) return null;
  return state.toAuth().userId ?? null;
}

export function authIsConfigured() {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.CLERK_PUBLISHABLE_KEY &&
      (process.env.CLERK_AUTHORIZED_PARTIES?.trim() || process.env.RENDER_EXTERNAL_URL),
  );
}
