import { afterEach, describe, expect, it } from "vitest";

import { getApiRequestUrls } from "../lib/auth";

describe("auth API URL resolution", () => {
  const originalApiUrl = process.env.NODERAX_API_URL;
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_NODERAX_API_URL;

  afterEach(() => {
    process.env.NODERAX_API_URL = originalApiUrl;
    process.env.NEXT_PUBLIC_NODERAX_API_URL = originalPublicApiUrl;
  });

  it("prefers unprefixed public health routes for installer-managed control planes", () => {
    const urls = getApiRequestUrls("/health/ready", "http://nginx/api/v1");

    expect(urls.map((url) => url.toString())).toEqual([
      "http://nginx/health/ready",
      "http://nginx/api/v1/health/ready",
    ]);
  });

  it("keeps runtime metrics queries on the prefixed REST path", () => {
    const urls = getApiRequestUrls("/metrics", "http://nginx/api/v1");

    expect(urls.map((url) => url.toString())).toEqual([
      "http://nginx/api/v1/platform-metrics",
    ]);
  });
});
