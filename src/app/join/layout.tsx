export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No sidebar for public pages
  return children;
}
