const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

export function browserApiUrl(
  configuredUrl: string,
  frontendUrl: string,
): string {
  const frontend = new URL(frontendUrl);
  const api = new URL(configuredUrl, frontend.origin);

  // Keep loopback aliases consistent so local development does not cross sites.
  // An explicitly configured remote API keeps its own hostname.
  if (localHosts.has(api.hostname) && localHosts.has(frontend.hostname)) {
    api.hostname = frontend.hostname;
  }
  return api.toString().replace(/\/$/, "");
}
