"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Paperclip, Mic, Plus, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const suggestions = ["Q3 Marketing", "Roadmap Planning", "User Feedback", "SEO Keywords", "Mobile Redesign"];
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const newThreadId = `new-${Date.now()}`;
      router.push(`/app/threads/${newThreadId}?q=${encodeURIComponent(query)}`);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    const newThreadId = `new-${Date.now()}`;
    router.push(`/app/threads/${newThreadId}?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 animate-fade-in">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-5xl font-bold font-headline text-foreground tracking-tighter mb-4">
          Homeros
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">Your personal knowledge assistant. Start a conversation or explore your threads.</p>

        <form onSubmit={handleSearch} className="relative">
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything to start a new thread..."
            className="pl-12 pr-32 h-14 text-lg rounded-full bg-card border-2 border-border focus-visible:ring-ring"
            aria-label="Search input"
          />
           <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
                <Mic className="h-5 w-5 text-muted-foreground" />
            </Button>
             <Button type="submit" variant="ghost" size="icon" className="rounded-full" disabled={!query.trim()}>
                <SendHorizonal className="h-5 w-5 text-muted-foreground" />
            </Button>
        </div>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {suggestions.map(suggestion => (
                 <Badge key={suggestion} variant="outline" className="cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}
