import { apiFetch, apiUpload, TOKEN_KEY } from "@/lib/api";

describe("api wrapper auth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("attaches Authorization header on apiFetch", async () => {
    localStorage.setItem(TOKEN_KEY, "token-123");

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiFetch<{ ok: boolean }>("/jobs");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("attaches Authorization header on apiUpload", async () => {
    localStorage.setItem(TOKEN_KEY, "token-xyz");

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ uploaded: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const formData = new FormData();
    formData.append("files", new File(["hello"], "hello.pdf", { type: "application/pdf" }));

    await apiUpload<{ uploaded: boolean }>("/jobs/1/upload", formData);

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-xyz");
  });
});
