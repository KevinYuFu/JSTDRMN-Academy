import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderFrame, MenuButton } from "./header-frame";
import { HeaderSession, HeaderSessionFallback } from "./header-session";

export function AppHeader() {
  return (
    <HeaderFrame>
      <Link href="/" className="brand">
        <Image src="/logo.png" alt="JSTDRMN" width={256} height={57} priority className="logo" />
        <span className="tag">Academy</span>
      </Link>
      <Suspense fallback={<HeaderSessionFallback />}>
        <HeaderSession />
      </Suspense>
      <MenuButton />
    </HeaderFrame>
  );
}
