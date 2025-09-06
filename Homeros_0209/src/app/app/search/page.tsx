
"use client";

import { useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon } from "lucide-react";
import React from 'react';

const SearchPlaceholder = () => (
    <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center flex-col gap-4 border-2 border-dashed border-border/60 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 text-primary/80"
            >
                <path d="M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M10 13a4 4 0 0 0 3.46-2" />
            </svg>
        </div>
        <div className="space-y-1">
            <p className="font-semibold text-foreground">
                { "Search everything" }
            </p>
            <p className="text-muted-foreground text-sm max-w-sm">
                Find threads, insights, and concepts across your entire workspace using semantic search.
            </p>
        </div>
    </div>
);

const SearchResults = ({ query }: { query: string }) => (
     <div className="w-full h-full flex items-center justify-center text-center">
        <p className="text-muted-foreground">
            Search results for "{query}" will appear here.
        </p>
    </div>
);

export default function SearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [inputValue, setInputValue] = React.useState(query || '');

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Semantic Search</h1>
                <p className="text-muted-foreground">
                    Find information across all your threads, highlights, and insights.
                </p>
            </div>

            <form className="mt-8 flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    name="q"
                    placeholder="Search for concepts, questions, or keywords..."
                    className="flex-1 text-base h-12"
                    aria-label="Search input"
                />
                <Button type="submit" size="lg" className="h-12">
                    <SearchIcon className="mr-2 h-5 w-5" />
                    Search
                </Button>
            </form>
            
            <Card className="mt-8 min-h-[50vh]">
                <CardContent className="p-4 h-full">
                    {query ? <SearchResults query={query} /> : <SearchPlaceholder />}
                </CardContent>
            </Card>
        </div>
    );
}
