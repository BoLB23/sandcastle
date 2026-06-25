import { afterEach, describe, expect, it, vi } from "vitest";

const envKeys = ["NEXT_PUBLIC_API_BASE", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_REALTIME_URL"] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof envKeys)[number],
  string | undefined
>;

async function loadApiModule() {
  vi.resetModules();
  return import("./api");
}

function restoreEnv() {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreEnv();
});

describe("api runtime resolution", () => {
  it("uses localhost defaults when running on the server", async () => {
    const { REALTIME_URL } = await loadApiModule();
    const { apiFetch } = await loadApiModule();

    expect(REALTIME_URL).toBe("ws://localhost:4001/ws");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/health",
      expect.objectContaining({
        credentials: "include",
        headers: {
          "content-type": "application/json"
        }
      })
    );
  });

  it("resolves browser URLs from the current location", async () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "app.example.com",
        host: "app.example.com:3000",
        protocol: "https:"
      }
    });

    const { REALTIME_URL, apiFetch } = await loadApiModule();

    expect(REALTIME_URL).toBe("wss://app.example.com:3000/ws");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        credentials: "include",
        headers: {
          "content-type": "application/json"
        }
      })
    );
  });
});

describe("api error handling", () => {
  it("throws ApiError with the backend message when a request fails", async () => {
    process.env.NEXT_PUBLIC_API_BASE = "https://api.example.com";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 418,
      json: vi.fn().mockResolvedValue({ error: "teapot" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ApiError, apiFetch } = await loadApiModule();

    await expect(apiFetch("/brew")).rejects.toMatchObject({
      message: "teapot",
      status: 418
    });
    await expect(apiFetch("/brew")).rejects.toBeInstanceOf(ApiError);
  });
});
