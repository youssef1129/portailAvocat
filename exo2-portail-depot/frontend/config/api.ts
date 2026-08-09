import {
  Configuration,
  AuthApi,
  RequestsApi,
  PublicApi,
  AppApi,
} from "../src/api/generated";

const isServer = typeof window === "undefined";

const rawBaseUrl = isServer
  ? process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:21501"
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:21501";

const basePath = rawBaseUrl.replace(/\/+$|\/$/g, '');

const createApiConfig = (accessToken?: string) =>
  new Configuration({
    basePath,
    accessToken: accessToken ? async () => accessToken : undefined,
  });

export const authApi = new AuthApi(createApiConfig());
export const requestsApi = new RequestsApi(createApiConfig());
export const publicApi = new PublicApi(createApiConfig());
export const appApi = new AppApi(createApiConfig());
export const createAuthApi = (accessToken?: string) =>
  new AuthApi(createApiConfig(accessToken));
export const createRequestsApi = (accessToken?: string) =>
  new RequestsApi(createApiConfig(accessToken));
export const createPublicApi = (accessToken?: string) =>
  new PublicApi(createApiConfig(accessToken));

export default createApiConfig();
