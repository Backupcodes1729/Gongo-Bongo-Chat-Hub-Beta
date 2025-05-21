import { AppSidebar } from "@/components/layout/AppSidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Adjust height based on AppHeader height */}
      <AppSidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
