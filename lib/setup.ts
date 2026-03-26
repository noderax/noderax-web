import {
  getApiRequestUrls,
  resolveApiBaseUrl,
  type ApiBaseUrlSource,
} from "@/lib/auth";

export type SetupApiConfig = {
  apiUrl: string | null;
  source: ApiBaseUrlSource;
};

export const getSetupApiConfig = (override?: string | null): SetupApiConfig =>
  resolveApiBaseUrl(override);

export const getSetupApiUrl = (path: string, override?: string | null) => {
  const [candidate] = getApiRequestUrls(path, override);
  return candidate ?? null;
};

export const fetchSetupApi = async (
  path: string,
  init?: RequestInit,
  override?: string | null,
) => {
  const url = getSetupApiUrl(path, override);

  if (!url) {
    throw new Error("Missing NODERAX_API_URL configuration.");
  }

  return fetch(url, init);
};
