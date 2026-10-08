import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveVideo, youtubeId } from "./video";

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
  });
});
