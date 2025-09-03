
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Share2, Tag, LayoutGrid, BotMessageSquare, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation } from '@tanstack/react-query';
import { generateKnowledgeGraph } from '@/ai/flows/generate-knowledge-graph';
import type { GenerateKnowledgeGraphOutput } from '@/ai/flows/types/knowledge-graph-types';
import { KnowledgeGraph } from '@/components/map/knowledge-graph';
import { useToast } from '@/hooks/use-toast';
import type { MockThread } from '@/lib/mock-data';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

export default function MapPage() {
    const { toast } = useToast();
    const [threads, setThreads] = useState<MockThread[]>([]);
    const [activeTab, setActiveTab] = useState<'thread' | 'tag' | 'category'>('thread');
    const [selectedThread, setSelectedThread] = useState<string>('');
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [graphData, setGraphData] = useState<GenerateKnowledgeGraphOutput | null>(null);

    useEffect(() => {
        const loadedThreads: MockThread[] = [];
        if (typeof window !== 'undefined' && window.localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('thread-')) {
                    try {
                        const threadData = JSON.parse(localStorage.getItem(key) || '');
                        loadedThreads.push(threadData);
                    } catch (e) {
                        console.error('Failed to parse thread from local storage', e);
                    }
                }
            }
        }
        setThreads(loadedThreads);
    }, []);

    const tags = [...new Set(threads.flatMap(t => t.tags))];
    const categories = [...new Set(threads.map(t => t.category))];

    const mutation = useMutation({
        mutationFn: generateKnowledgeGraph,
        onSuccess: (data) => {
            setGraphData(data);
        },
        onError: (error) => {
            toast({
                variant: 'destructive',
                title: 'Error generating map',
                description: error.message,
            });
        },
    });

    const handleGenerateMap = () => {
        let text = '';
        let sourceType: 'thread' | 'tag' | 'category' = activeTab;

        if (activeTab === 'thread' && selectedThread) {
            const thread = threads.find(t => t.id === selectedThread);
            text = `${thread?.title} ${thread?.snippet}`;
        } else if (activeTab === 'tag' && selectedTag) {
            const relatedThreads = threads.filter(t => t.tags.includes(selectedTag));
            text = `Threads tagged with "${selectedTag}":\n` + relatedThreads.map(t => `${t.title}: ${t.snippet}`).join('\n');
        } else if (activeTab === 'category' && selectedCategory) {
             const relatedThreads = threads.filter(t => t.category === selectedCategory);
            text = `Threads in category "${selectedCategory}":\n` + relatedThreads.map(t => `${t.title}: ${t.snippet}`).join('\n');
        }

        if (!text) {
             toast({
                variant: 'destructive',
                title: 'Please make a selection',
                description: 'You must select an item to generate a map.',
            });
            return;
        }

        mutation.mutate({ text, sourceType });
    };

    return (
        <div className="container mx-auto h-full flex flex-col p-4 md:p-6 lg:p-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Knowledge Map</h1>
                <p className="text-muted-foreground">
                    Visualize the connections between your ideas and insights.
                </p>
            </div>
            <div className="mt-8">
                <Tabs defaultValue="thread" onValueChange={(value) => setActiveTab(value as any)}>
                    <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
                        <TabsTrigger value="thread"><BotMessageSquare className="mr-2"/>From Thread</TabsTrigger>
                        <TabsTrigger value="tag"><Tag className="mr-2"/>From Tag</TabsTrigger>
                        <TabsTrigger value="category"><LayoutGrid className="mr-2"/>From Category</TabsTrigger>
                    </TabsList>
                    <TabsContent value="thread">
                        <Card className="mt-4">
                            <CardContent className="p-6">
                                <p className="text-sm text-muted-foreground mb-4">Select a thread to generate a knowledge map from its content.</p>
                                <div className="flex gap-2">
                                     <Select onValueChange={setSelectedThread} value={selectedThread}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a thread..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {threads.map(thread => (
                                                <SelectItem key={thread.id} value={thread.id}>{thread.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleGenerateMap} disabled={mutation.isPending}>
                                        {mutation.isPending && activeTab === 'thread' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Generate Map
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="tag">
                        <Card className="mt-4">
                             <CardContent className="p-6">
                                <p className="text-sm text-muted-foreground mb-4">Select a tag to generate a map of connected insights and threads.</p>
                                 <div className="flex gap-2">
                                     <Select onValueChange={setSelectedTag} value={selectedTag}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a tag..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tags.map(tag => (
                                                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleGenerateMap} disabled={mutation.isPending}>
                                        {mutation.isPending && activeTab === 'tag' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Generate Map
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="category">
                         <Card className="mt-4">
                             <CardContent className="p-6">
                                <p className="text-sm text-muted-foreground mb-4">Select a category to see an overview of its knowledge landscape.</p>
                                <div className="flex gap-2">
                                     <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(category => (
                                                <SelectItem key={category} value={category}>{category}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     <Button onClick={handleGenerateMap} disabled={mutation.isPending}>
                                        {mutation.isPending && activeTab === 'category' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Generate Map
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Card className="mt-8 flex-grow">
                <CardContent className="p-2 h-full">
                    {mutation.isPending ? (
                        <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center flex-col gap-4 border-2 border-dashed">
                             <Loader2 className="h-16 w-16 text-primary animate-spin" />
                             <p className="text-muted-foreground text-center">
                                Generating your knowledge map...
                             </p>
                        </div>
                    ) : graphData ? (
                        <KnowledgeGraph data={graphData} />
                    ) : (
                        <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center flex-col gap-4 border-2 border-dashed">
                             <Share2 className="h-16 w-16 text-muted-foreground/50" />
                             <p className="text-muted-foreground text-center">
                                Your knowledge map will be generated here.
                             </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
