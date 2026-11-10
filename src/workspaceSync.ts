// Keeps a durable copy of the Rules & alerts workspace in the local server database.
export type ServerWorkspace = {
  enabled: boolean;
  revision: number;
  store: unknown | null;
};
export async function fetchWorkspace(): Promise<ServerWorkspace | null> {
  try {
    const r = await fetch("/api/workspace");
    if (!r.ok) return null;
    return (await r.json()) as ServerWorkspace;
  } catch {
    return null;
  }
}
export async function pushWorkspace(
  revision: number,
  store: unknown,
): Promise<"ok" | "off" | "conflict" | "failed"> {
  try {
    const r = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, store }),
    });
    if (r.status === 409) return "conflict";
    if (!r.ok) return "failed";
    const body = (await r.json()) as { enabled?: boolean };
    return body.enabled === false ? "off" : "ok";
  } catch {
    return "failed";
  }
}
