import { lookup } from "node:dns/promises";
import net from "node:net";

import { normalizeApiBaseUrl } from "@/lib/auth";

const METADATA_IPV4 = "169.254.169.254";

const isPrivateIPv4 = (address: string) => {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a >= 224 && a <= 239) ||
    address === METADATA_IPV4
  );
};

const isPrivateIPv6 = (address: string) => {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.")
  );
};

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalized === "localhost" ||
    normalized === "metadata.google.internal" ||
    normalized.endsWith(".localhost")
  );
};

const isPrivateAddress = (address: string) => {
  const family = net.isIP(address);
  if (family === 4) {
    return isPrivateIPv4(address);
  }
  if (family === 6) {
    return isPrivateIPv6(address);
  }
  return true;
};

export const allowPrivateApiUrls = () =>
  /^(1|true|yes|on)$/i.test(process.env.NODERAX_ALLOW_PRIVATE_API_URLS ?? "");

export const validateServerApiBaseUrl = async (
  value?: string | null,
  options?: { allowPrivate?: boolean },
): Promise<{ apiUrl: string | null; error?: string }> => {
  const apiUrl = normalizeApiBaseUrl(value);
  if (!apiUrl) {
    return { apiUrl: null, error: "Enter a valid http:// or https:// API URL." };
  }

  const parsed = new URL(apiUrl);
  const allowPrivate = options?.allowPrivate === true;
  if (allowPrivate) {
    return { apiUrl };
  }

  if (isBlockedHostname(parsed.hostname)) {
    return { apiUrl: null, error: "Private, loopback, and metadata API URLs are blocked." };
  }

  if (net.isIP(parsed.hostname)) {
    return isPrivateAddress(parsed.hostname)
      ? { apiUrl: null, error: "Private, loopback, and metadata API URLs are blocked." }
      : { apiUrl };
  }

  const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    return { apiUrl: null, error: "API URL resolves to a private, loopback, or metadata address." };
  }

  return { apiUrl };
};

export const isSafeProxyPath = (segments: string[]) => {
  const joined = `/${segments.join("/")}`;
  let decoded: string;
  try {
    decoded = decodeURIComponent(joined);
  } catch {
    return false;
  }
  return (
    !/^[\s/]*[a-z][a-z\d+\-.]*:\/\//i.test(decoded) &&
    !decoded.includes("://")
  );
};
