import { createHash } from "crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bunnyToken, drivePreviewUrl, resolveVideo, youtubeId } from "./video";

describe("resolveVideo", () => {
  it("turns YouTube and Vimeo links into embeds and leaves mock and file sources alone", () => {
    assert.equal(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.deepEqual(resolveVideo("youtube", "https://youtu.be/dQw4w9WgXcQ"), {
      type: "iframe",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    assert.deepEqual(resolveVideo("vimeo", "https://vimeo.com/123456789"), {
      type: "iframe",
      src: "https://player.vimeo.com/video/123456789",
    });
    assert.deepEqual(resolveVideo("mock", "mock://les_beat"), { type: "mock", src: "mock://les_beat" });
    assert.deepEqual(resolveVideo("file", "https://cdn.example/lesson.mp4"), {
      type: "file",
      src: "https://cdn.example/lesson.mp4",
    });
    assert.equal(resolveVideo("youtube", "not a url").type, "mock");
    assert.deepEqual(resolveVideo("vimeo_private", "https://vimeo.com/123456789"), {
      type: "iframe",
      src: "https://player.vimeo.com/video/123456789",
    });
  });

  it("embeds Google Drive files through the preview URL", () => {
    const id = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
    const preview = drivePreviewUrl(id);
    assert.equal(preview, `https://drive.google.com/file/d/${id}/preview`);
    assert.deepEqual(resolveVideo("drive", `https://drive.google.com/file/d/${id}/view?usp=sharing`), {
      type: "iframe",
      src: preview,
    });
    assert.deepEqual(resolveVideo("drive", preview), { type: "iframe", src: preview });
    assert.deepEqual(resolveVideo("drive", `https://drive.google.com/open?id=${id}`), {
      type: "iframe",
      src: preview,
    });
    assert.deepEqual(resolveVideo("drive", id), { type: "iframe", src: preview });
    assert.equal(resolveVideo("drive", "not a drive file").type, "mock");
  });

  it("signs Bunny Stream embeds when the token key is set and leaves them unsigned otherwise", () => {
    const expires = 1_700_000_000;
    assert.equal(
      bunnyToken("secret", "abcd-1234", expires),
      createHash("sha256").update(`secretabcd-1234${expires}`).digest("hex"),
    );
    const previousLibrary = process.env.BUNNY_STREAM_LIBRARY_ID;
    const previousKey = process.env.BUNNY_STREAM_TOKEN_KEY;
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    delete process.env.BUNNY_STREAM_TOKEN_KEY;
    assert.deepEqual(resolveVideo("bunny", "abcd-1234"), {
      type: "iframe",
      src: "https://iframe.mediadelivery.net/embed/library/abcd-1234",
    });
    process.env.BUNNY_STREAM_LIBRARY_ID = "999";
    process.env.BUNNY_STREAM_TOKEN_KEY = "secret";
    const signed = resolveVideo("bunny", "abcd-1234", (expires - 3600) * 1000);
    assert.equal(signed.type, "iframe");
    assert.equal(
      signed.src,
      `https://iframe.mediadelivery.net/embed/999/abcd-1234?token=${bunnyToken("secret", "abcd-1234", expires)}&expires=${expires}`,
    );
    if (previousLibrary === undefined) delete process.env.BUNNY_STREAM_LIBRARY_ID;
    else process.env.BUNNY_STREAM_LIBRARY_ID = previousLibrary;
    if (previousKey === undefined) delete process.env.BUNNY_STREAM_TOKEN_KEY;
    else process.env.BUNNY_STREAM_TOKEN_KEY = previousKey;
  });
});
