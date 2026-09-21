import { getApiBaseUrl } from "@/lib/config";

export type HealthStatus = {
  status: string;
  service: string;
  environment: string;
};

export type HealthCheckResult =
  | { ok: true; data: HealthStatus }
  | { ok: false; error: string };

export async function fetchBackendHealth(): Promise<HealthCheckResult> {
  const url = `${getApiBaseUrl()}/health`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as HealthStatus;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: "Backend unreachable. Is the API running on the configured base URL?",
    };
  }
}
