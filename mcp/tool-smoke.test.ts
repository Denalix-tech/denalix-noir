import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

/**
 * End-to-end smoke test of the real `generate_cover_image` tool.
 *
 * Everything between the JSON-RPC call and the response is production code: the
 * registered handler, scope gating, `resolveCover`, the real sharp encode. Only
 * the two edges are replaced —
 *
 *   * the image provider, so no paid request is made;
 *   * `uploadCover`, so no object is written to the real storage bucket, which
 *     is never auto-cleaned.
 *
 * Module mocking needs `--experimental-test-module-mocks`; see the `test:cover`
 * script. Mocks are installed before `./tools` is imported, because an ESM
 * binding captured at import time cannot be replaced afterwards.
 */

const UPLOADED_URL =
  "https://vuqxdkbktdimzpyfiict.supabase.co/storage/v1/object/public/blog-images/covers/smoke-abc.webp";

/** Deterministic PNG large enough to clear the provider's minimum-size guard. */
async function fakeProviderPng(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const width = 256;
  const height = 192;
  const pixels = Buffer.allocUnsafe(width * height * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 2654435761) % 251;
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe("generate_cover_image over a real MCP session", () => {
  it("reports generated-image and returns a url and alt for create_draft", async () => {
    const png = await fakeProviderPng();
    let uploadedBytes = 0;

    mock.module("./adapters/supabase.ts", {
      namedExports: {
        uploadCover: async (_site: unknown, image: Buffer) => {
          uploadedBytes = image.length;
          return { url: UPLOADED_URL };
        },
      },
    });

    mock.module("./image-generate.ts", {
      namedExports: {
        ImageGenerateError: class ImageGenerateError extends Error {},
        generateCoverArtwork: async () => ({ bytes: png, model: "gpt-image-2" }),
        isImageGenerationConfigured: () => true,
        configuredImageModel: () => "gpt-image-2",
        buildImagePrompt: () => "stubbed",
      },
    });

    const [{ McpServer }, { Client }, { InMemoryTransport }, { registerBlogTools }] =
      await Promise.all([
        import("@modelcontextprotocol/sdk/server/mcp.js"),
        import("@modelcontextprotocol/sdk/client/index.js"),
        import("@modelcontextprotocol/sdk/inMemory.js"),
        import("./tools"),
      ]);

    const server = new McpServer({ name: "denalix-blog", version: "2.0.0" });
    registerBlogTools(server, { grantedScopes: ["blog:read", "blog:draft"] });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "smoke", version: "0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const response = await client.callTool({
      name: "generate_cover_image",
      arguments: {
        site: "denalixtech",
        title: "Scheduling that survives a busy Monday",
        slug: "scheduling-that-survives-a-busy-monday",
        eyebrow: "Workflow Automation",
        imagePrompt: "a dispatcher reviewing a wall-mounted job board",
      },
    });

    const content = response.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0].text);

    assert.equal(payload.source, "generated-image");
    assert.equal(payload.fellBackToBrandCover, false);
    assert.equal(payload.model, "gpt-image-2");
    assert.equal(payload.url, UPLOADED_URL);
    assert.equal(payload.width, 1200);
    assert.equal(payload.height, 630);
    assert.equal(payload.format, "webp");
    assert.match(payload.alt, /Editorial illustration representing/);
    assert.ok(uploadedBytes > 0, "something was handed to uploadCover");

    // Printed so the run itself evidences the source, not just a green tick.
    console.log(
      `    → source=${payload.source} model=${payload.model} ` +
        `${payload.width}x${payload.height} ${payload.format} ${payload.bytes}B`,
    );

    await client.close();
    await server.close();
  });
});
