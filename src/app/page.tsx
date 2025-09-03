"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BookOpen } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app");
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-8">
      <BookOpen className="h-16 w-16 text-primary animate-pulse" />
      <h1 className="mt-4 text-2xl font-bold font-headline text-foreground">Homeros</h1>
      <p className="text-muted-foreground">Loading your workspace...</p>
    </div>
  );
}
