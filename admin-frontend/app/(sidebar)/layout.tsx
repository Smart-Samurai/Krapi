import { SidebarLayout } from "@/components/layouts/SidebarLayout";

export default function SidebarGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}