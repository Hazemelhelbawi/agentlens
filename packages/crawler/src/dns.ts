import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { SsrfError } from "./errors.js";
import { assertPublicUrl, isBlockedHostname, isPrivateIp } from "./ssrf.js";

export async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  if (isBlockedHostname(hostname)) {
    throw new SsrfError(`Blocked hostname: ${hostname}`);
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SsrfError(`Private or reserved IP address is not allowed: ${hostname}`);
    }
    return [hostname];
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new SsrfError(`Unable to resolve hostname: ${hostname}`);
  }

  if (records.length === 0) {
    throw new SsrfError(`Unable to resolve hostname: ${hostname}`);
  }

  const addresses = records.map((r) => r.address);
  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new SsrfError(
        `Hostname ${hostname} resolves to a private or reserved address (${address})`,
      );
    }
  }

  return addresses;
}

export async function assertSafeDestination(raw: string): Promise<URL> {
  const url = assertPublicUrl(raw);
  await resolvePublicAddresses(url.hostname);
  return url;
}
