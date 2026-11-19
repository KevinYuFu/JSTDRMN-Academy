import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STATIC_ASSET_CACHE_CONTROL, STATIC_ASSET_HEADER_SOURCE } from "../next.config";

const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match") as {
  getPathMatch: (path: string, options?: { strict?: boolean }) => (pathname: string) => false | Record<string, string>;
};
const { getImgProps } = require("next/dist/shared/lib/get-img-props") as {
  getImgProps: (
    props: Record<string, unknown>,
    options: { defaultLoader: (args: { src: string; width: number; quality?: number }) => string; imgConf: Record<string, unknown> },
  ) => { props: { loading?: string; fetchPriority?: string; src: string; srcSet?: string; sizes?: string; width?: number; height?: number } };
};
const { imageConfigDefault, prepareImageConfig } = require("next/dist/shared/lib/image-config") as {
  imageConfigDefault: Record<string, unknown>;
  prepareImageConfig: (config: Record<string, unknown>) => Record<string, unknown>;
};

function loader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}

function imgProps(props: Record<string, unknown>) {
  return getImgProps(props, {
    defaultLoader: loader,
    imgConf: prepareImageConfig({
      ...imageConfigDefault,
      localPatterns: undefined,
    }),
  }).props;
}

const matchAsset = getPathMatch(STATIC_ASSET_HEADER_SOURCE, { strict: true });

describe("static public cache headers", () => {
  it("caches image and icon files and skips pages, API routes, and Next internals", () => {
    assert.equal(STATIC_ASSET_CACHE_CONTROL, "public, max-age=86400, stale-while-revalidate=604800");
    for (const path of [
      "/logo.png",
      "/favicon.ico",
      "/mentor-draft-portraits/yuzu.jpg",
      "/mentor-draft-portraits/odin.jpeg",
      "/icons/mark.svg",
      "/apple-touch-icon.png",
    ]) {
      assert.ok(matchAsset(path), path);
    }
    for (const path of [
      "/",
      "/programs",
      "/programs/dj-bootcamp",
      "/private-sessions",
      "/mentor-drafts",
      "/api/discord/connect",
      "/api/slides/lesson-1",
      "/_next/image",
      "/_next/static/media/welcome.hash.png",
      "/_next/static/chunks/main.js",
      "/teacher",
    ]) {
      assert.equal(matchAsset(path), false, path);
    }
  });
});

describe("image loading", () => {
  const photo = readFileSync("components/academy-home/photo.tsx", "utf8");
  const photos = readFileSync("components/academy-home/photos.ts", "utf8");
  const header = readFileSync("components/app-header.tsx", "utf8");
  const face = readFileSync("components/mentor-card-face.tsx", "utf8");
  const review = readFileSync("components/mentor-draft-review.tsx", "utf8");
  const roster = readFileSync("components/mentor-roster.tsx", "utf8");
  const video = readFileSync("components/video-player.tsx", "utf8");
  const slides = readFileSync("components/slides-card.tsx", "utf8");
  const config = readFileSync("next.config.ts", "utf8");

  it("optimizes home photos and keeps eager loading", () => {
    assert.equal(photo.includes("unoptimized"), false);
    assert.match(photo, /priority \? \{\} : \{ loading: "eager" as const, fetchPriority: "low" as const \}/);
    assert.equal(photo.includes('fetchPriority="high"'), false);
    assert.equal(photo.includes('fetchPriority: "high"'), false);
    assert.equal(photo.includes('loading="lazy"'), false);
    assert.match(photos, /sizes: "\(max-width: 800px\) calc\(100vw - 64px\), 560px"/);
    assert.match(photos, /sizes: "\(max-width: 800px\) calc\(100vw - 32px\), 1000px"/);
    assert.match(photos, /sizes: "\(max-width: 800px\) min\(520px, calc\(100vw - 32px\)\), 300px"/);
    assert.match(photos, /sizes: "\(max-width: 800px\) min\(520px, calc\(100vw - 32px\)\), 640px"/);

    const above = imgProps({
      src: "/media/welcome.jpg",
      alt: "Studio",
      width: 1000,
      height: 669,
      sizes: "(max-width: 800px) calc(100vw - 64px), 560px",
      priority: true,
    });
    assert.equal(above.loading, undefined);
    assert.equal(above.fetchPriority, undefined);
    assert.equal(above.loading === "lazy", false);
    assert.match(above.src, /^\/_next\/image\?/);

    const below = imgProps({
      src: "/media/group.jpg",
      alt: "Group",
      width: 1000,
      height: 669,
      sizes: "(max-width: 800px) calc(100vw - 32px), 1000px",
      priority: false,
      loading: "eager",
      fetchPriority: "low",
    });
    assert.equal(below.loading, "eager");
    assert.equal(below.fetchPriority, "low");
  });

  it("serves the logo and the first draft portraits at high priority", () => {
    assert.match(header, /width=\{256\}/);
    assert.match(header, /priority/);
    assert.equal(header.includes("loading="), false);
    assert.equal(header.includes("fetchPriority"), false);
    assert.match(face, /width=\{96\}/);
    assert.match(face, /height=\{96\}/);
    assert.match(face, /photoPriority \? \{\} : \{ loading: "eager" as const, fetchPriority: "low" as const \}/);
    assert.equal(face.includes('fetchPriority="high"'), false);
    assert.equal(face.includes('fetchPriority: "high"'), false);
    assert.match(face, /<img className=\{styles\.photo\}/);
    assert.match(review, /photoPriority=\{index < 2\}/);
    assert.match(roster, /backgroundImage: `url\(\$\{mentor\.photoUrl\}\)`/);
    assert.equal(roster.includes("next/image"), false);
    assert.equal(config.includes("remotePatterns"), false);

    const portrait = imgProps({
      src: "/mentor-draft-portraits/yuzu.jpg",
      alt: "Yuzu",
      width: 96,
      height: 96,
      priority: false,
      loading: "eager",
      fetchPriority: "low",
    });
    assert.equal(portrait.width, 96);
    assert.equal(portrait.height, 96);
    assert.equal(portrait.loading, "eager");
    assert.equal(portrait.fetchPriority, "low");
    assert.equal(
      portrait.srcSet,
      "/_next/image?url=%2Fmentor-draft-portraits%2Fyuzu.jpg&w=96&q=75 1x, /_next/image?url=%2Fmentor-draft-portraits%2Fyuzu.jpg&w=256&q=75 2x",
    );
  });

  it("does not preload the skill tree monospace font", () => {
    const shell = readFileSync("components/skill-tree/shell.tsx", "utf8");
    assert.match(shell, /const mono = Space_Mono\(\{[\s\S]*preload: false/);
  });

  it("does not lazy-load images or video embeds", () => {
    for (const source of [photo, header, face, video, slides]) {
      assert.equal(source.includes('loading="lazy"'), false);
      assert.equal(source.includes("loading='lazy'"), false);
    }
    assert.match(video, /<iframe /);
    assert.match(video, /<video /);
    assert.match(slides, /<iframe /);
  });
});
