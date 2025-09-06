"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="hidden md:block">
        <SidebarTrigger/>
      </div>
      <div className="flex w-full items-center justify-end gap-4">
        {/* User menu removed */}
      </div>
    </header>
  );
}
