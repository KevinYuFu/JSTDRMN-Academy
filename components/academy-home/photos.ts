import djLandscapeImage from "./media/dj-landscape-1000.jpg";
import djPortraitImage from "./media/dj-portrait-1000.jpg";
import groupSessionImage from "./media/group-session-1000.jpg";
import welcomeStudioImage from "./media/welcome-studio-1000.jpg";
import type { StaticImageData } from "next/image";

/**
 * Approved photos from www.jstdrmn.com (/hubfs/). Shown in full. No names and no photographer credit.
 * Welcome: jstdrmn.com/prod DSC05565.jpg, 1000×669. No watermark on this file.
 * Group: jstdrmn.com/prod DSC09472.jpg, 1000×669. No watermark on this file.
 * Portrait DJ: jstdrmn.com/bootcamp DSC07637-Enhanced-NR.jpg, 1000×1497. Watermark in the lower right.
 * Landscape DJ: jstdrmn.com/dj DSC06959-Enhanced-NR.jpg, 1000×667. Watermark in the lower right.
 * The rejected three-person class portrait is not included.
 */

export type AcademyPhoto = {
  image: StaticImageData;
  sizes: string;
  alt: string;
  caption: string;
};

export const welcomeStudio: AcademyPhoto = {
  image: welcomeStudioImage,
  sizes: "(max-width: 800px) calc(100vw - 64px), 560px",
  alt: "A person wearing headphones works on a laptop in a studio, with speakers beside the desk.",
  caption: "JSTDRMN production",
};

export const groupSession: AcademyPhoto = {
  image: groupSessionImage,
  sizes: "(max-width: 800px) calc(100vw - 32px), 1000px",
  alt: "A group gathered with laptops and music equipment, learning together.",
  caption: "JSTDRMN group session",
};

export const djPortrait: AcademyPhoto = {
  image: djPortraitImage,
  sizes: "(max-width: 800px) min(280px, calc(100vw - 32px)), 280px",
  alt: "A DJ at the decks on a lit stage, with a crowd in front. The JSTDRMN watermark is in the lower right.",
  caption: "JSTDRMN bootcamp",
};

export const djLandscape: AcademyPhoto = {
  image: djLandscapeImage,
  sizes: "(max-width: 800px) calc(100vw - 32px), 640px",
  alt: "A DJ at the decks under warm stage lights. The JSTDRMN watermark is in the lower right.",
  caption: "JSTDRMN DJ",
};
