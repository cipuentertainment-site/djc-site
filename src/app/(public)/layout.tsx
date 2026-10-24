import { VisitorTracker } from "@/components/public/visitor-tracker";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <VisitorTracker />
      {children}
    </>
  );
}
