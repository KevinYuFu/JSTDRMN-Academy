/** Staff frame only. The staff check stays on the page: this layout does not re-run on navigation. */
export const instant = false;

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <main className="shell">{children}</main>;
}
