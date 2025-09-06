
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotMessageSquare, Share2, PlusCircle, User, Settings, LogOut, Sparkles, Upload } from "lucide-react";
import { SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { href: "/app/threads", label: "Threads", icon: BotMessageSquare },
  { href: "/app/map", label: "Knowledge Map", icon: Share2 },
];

const bottomNavItems = [
    { href: "#", label: "Account", icon: User },
    { href: "#", label: "Settings", icon: Settings },
    { href: "#", label: "Logout", icon: LogOut },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/app" className="flex items-center gap-2" aria-label="Dashboard">
           <Sparkles className="h-8 w-8 text-foreground" />
          <span className="text-xl font-headline font-bold whitespace-nowrap group-data-[collapsible=icon]:hidden">Homeros</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={{children: "New Thread", side: "right", align: "center", sideOffset: 10}}>
                  <Link href="/app">
                    <PlusCircle />
                    <span>New Thread</span>
                  </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="my-2" />
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={item.href === '/app' ? pathname === item.href : pathname.startsWith(item.href)}
                tooltip={{children: item.label, side: "right", align: "center", sideOffset: 10}}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter className="p-2">
           <Separator className="my-2" />
           <SidebarMenu>
                {bottomNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                        asChild
                        tooltip={{children: item.label, side: "right", align: "center", sideOffset: 10}}
                    >
                        <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
           </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
