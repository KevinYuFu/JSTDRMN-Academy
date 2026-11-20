import Image from "next/image";
import type { AcademyPhoto } from "./photos";
import styles from "./home.module.css";

export function AcademyFigure({ photo, preload = false }: { photo: AcademyPhoto; preload?: boolean }) {
  return (
    <figure className={styles.figure}>
      <Image
        src={photo.image}
        alt={photo.alt}
        sizes={photo.sizes}
        preload={preload}
        {...(preload ? {} : { loading: "eager" as const, fetchPriority: "low" as const })}
        style={{ width: "100%", height: "auto" }}
      />
      <figcaption>{photo.caption}</figcaption>
    </figure>
  );
}
