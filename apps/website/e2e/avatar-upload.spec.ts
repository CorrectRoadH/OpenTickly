import { deflateSync } from "node:zlib";

import { expect, test } from "@playwright/test";

import { registerE2eUser } from "./fixtures/e2e-auth.ts";

test.describe("Story: upload and remove profile avatar", () => {
  test("Given a registered user on the profile page, when they upload an avatar image, then the server accepts the file and the avatar displays", async ({
    page,
  }) => {
    const email = `avatar-upload-${test.info().workerIndex}-${Date.now()}@example.com`;
    await registerE2eUser(page, test.info(), {
      email,
      fullName: "Avatar Test User",
      password: "secret-pass",
    });

    await page.goto(new URL("/profile", page.url()).toString());
    await expect(page.getByTestId("profile-page")).toBeVisible();

    // Intercept the avatar upload request to verify it succeeds
    const avatarResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/v9/avatars") && resp.request().method() === "POST",
    );

    // Use a ~30KB image to exceed the audit-log body capture limit (8KB)
    // and verify multipart streaming works end-to-end.
    const fileInput = page.locator('input[type="file"][accept="image/png,image/jpeg,image/gif"]');
    await fileInput.setInputFiles({
      name: "test-avatar.png",
      mimeType: "image/png",
      buffer: createTestPng(100, 100),
    });

    const avatarResponse = await avatarResponsePromise;
    expect(avatarResponse.status()).toBe(200);

    // Verify success toast appears
    await expect(page.getByText("Avatar uploaded")).toBeVisible({ timeout: 5_000 });
  });
});

/** Creates a valid PNG of the given dimensions with random pixel data. */
function createTestPng(width: number, height: number): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  const ihdr = createPngChunk("IHDR", ihdrData);

  // Raw image data: each row has a filter byte (0) + RGB pixels
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: none
    for (let x = 0; x < width * 3; x++) {
      raw[y * rowSize + 1 + x] = Math.floor(Math.random() * 256);
    }
  }
  const idat = createPngChunk("IDAT", deflateSync(raw));
  const iend = createPngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0);
  return Buffer.concat([len, typeBuffer, data, crcBuffer]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
