import Image from "next/image";
import type { AcademyPhoto } from "./photos";
import styles from "./home.module.css";

export function AcademyFigure({ photo, priority = false }: { photo: AcademyPhoto; priority?: boolean }) {
  return (
    <figure className={styles.figure}>
      <Image
        src={photo.image}
        alt={photo.alt}
        sizes={photo.sizes}
        priority={priority}
        unoptimized
        style={{ width: "100%", height: "auto" }}
      />
      <figcaption>{photo.caption}</figcaption>
    </figure>
  );
}
