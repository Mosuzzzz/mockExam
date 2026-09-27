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

  const authorizedParties = getAuthorizedParties();
  if (!authorizedParties.length) return null;

  const state = await clerk.authenticateRequest(request, { authorizedParties });
  if (!state.isAuthenticated) return null;
  return state.toAuth().userId ?? null;
}

function getAuthorizedParties() {
  const configuredParties = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  if (configuredParties) {
    return configuredParties
      .split(",")
      .map((party) => party.trim())
      .filter(Boolean);
  }

  return [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter((host): host is string => Boolean(host?.trim()))
    .map((host) => (host.startsWith("http://") || host.startsWith("https://") ? host : `https://${host}`));
}

export function authIsConfigured() {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.CLERK_PUBLISHABLE_KEY &&
      getAuthorizedParties().length,
  );
}
