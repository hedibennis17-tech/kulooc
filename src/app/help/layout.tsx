import { AppHeader } from '@/components/kulooc/header';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="bg-white border-r p-0 shadow-lg z-10" />
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-background font-sans">
            <AppHeader />
            <main className="flex-1">
                {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
