import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function SidebarGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 p-4 border-b">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <div className="flex-1 overflow-auto p-4">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
