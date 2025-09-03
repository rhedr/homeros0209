

"use client";

import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ChatMessages } from "@/components/thread/chat-messages";
import { MessageComposer } from "@/components/thread/message-composer";
import { InsightsPanel } from "@/components/thread/insights-panel";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { summarizeThreadForTitle } from '@/ai/flows/summarize-thread';
import { conversationalChat } from '@/ai/flows/conversational-chat';
import { generateSearchQuery } from '@/ai/flows/generate-search-query';
import { generateThreadAbstract } from '@/ai/flows/generate-thread-abstract';
import type { GenerateThreadAbstractOutput, Reference as AbstractReference } from '@/ai/flows/types/thread-abstract-types';
import { Badge } from '@/components/ui/badge';
import { Hash, PlusCircle, MoreHorizontal, Archive, Trash2, Highlighter, BookCopy, Search, ChevronDown, ChevronUp, Sparkles, X, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { escapeRegExp } from '@/lib/utils';
import type { GenerateSearchQueryOutput } from '@/ai/flows/types/search-query-types';
import type { ConversationalChatInput, ConversationalChatOutput } from '@/ai/flows/types/conversational-chat-types';
import { v4 as uuidv4 } from 'uuid';

type Message = {
  role: 'user' | 'ai';
  text: string;
  id: string;
  timestamp: string;
};

export type Highlight = {
    id: string;
    messageId: string;
    text: string;
    start: number;
    end: number;
    color?: string;
    groupId?: string;
};

type Reference = {
    text: string;
    messageId: string;
};

type ThreadData = {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  category: string;
  tags: string[];
  messages: Message[];
  highlights: Highlight[];
  references: Reference[];
  colorDescriptions?: Record<string, string>;
};

export type CreateHighlightData = Omit<Highlight, 'id' | 'groupId'>;

export type SearchMatch = {
  messageId: string;
  startIndex: number;
  endIndex: number;
};

export type ActiveReference = {
    messageId: string;
    text: string;
} | null;

export type ActiveHighlight = {
    messageId: string;
    text: string;
} | null;

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const { toast } = useToast();
  const threadId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("Conversation");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isInsightsPanelCollapsed, setIsInsightsPanelCollapsed] = useState(false);
  
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false);
  const [activeReference, setActiveReference] = useState<ActiveReference>(null);
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight>(null);


  const smartSearchMutation = useMutation({
    mutationFn: generateSearchQuery,
    onSuccess: (data: GenerateSearchQueryOutput) => {
        if (data.searchQueries && data.searchQueries.length > 0) {
            const combinedQuery = data.searchQueries.map(q => escapeRegExp(q)).join('|');
            setThreadSearchQuery(combinedQuery);
            setIsSearchVisible(true);
            setIsSmartSearchOpen(false);
            toast({ title: "Smart Search Complete", description: `Found ${data.searchQueries.length} relevant passages.` });
        } else {
            toast({ title: "Smart Search", description: "No relevant passages found for your query." });
        }
    },
    onError: (error) => {
        toast({ variant: 'destructive', title: "Smart Search Failed", description: error.message });
    },
  });

  const handleSmartSearch = () => {
    if (!smartSearchQuery.trim() || !threadData) return;
    const threadText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
    smartSearchMutation.mutate({ userQuery: smartSearchQuery, threadText });
  };
  
  const chatMutation = useMutation({
    mutationFn: conversationalChat,
    onSuccess: async (response, variables) => {
        const aiMessage: Message = { role: 'ai', text: response.message, id: `ai-${Date.now()}`, timestamp: new Date().toISOString()};
        
        setMessages(currentMessages => {
            const updatedMessages = currentMessages.map(m => m.id === 'thinking' ? aiMessage : m);
            
            setThreadData(prevData => {
              if (!prevData) return null;

              const updatedData = { ...prevData, messages: updatedMessages };
              updateThreadInStorage(threadId, { messages: updatedMessages });
              return updatedData;
            });

            return updatedMessages;
        });

        const isNewThread = threadId.startsWith('new-');
        if (isNewThread && messages.length <= 2) {
             const threadText = `User: ${variables.message}\nAI: ${response.message}`;
             const summary = await summarizeThreadForTitle({ threadText });
             if (summary) {
                 const updated = updateThreadInStorage(threadId, { title: summary.title, snippet: summary.snippet });
                 if (updated) {
                     setThreadData(updated);
                     setTitle(updated.title);
                 }
             }
        }
    },
    onError: (error) => {
        toast({ variant: 'destructive', title: "Error", description: "The AI could not be reached. Please try again." });
         setMessages(currentMessages => currentMessages.filter(m => m.id !== 'thinking'));
    },
  });

  const handleSendMessage = useCallback((messageText: string) => {
    const userMessage: Message = { role: 'user', text: messageText, id: `user-${Date.now()}`, timestamp: new Date().toISOString()};
    
    setMessages(currentMessages => {
      const thinkingMessage: Message = { role: 'ai', text: '...', id: 'thinking', timestamp: new Date().toISOString() };
      const currentHistory = [...currentMessages, userMessage];
      const newMessages = [...currentHistory, thinkingMessage];

      chatMutation.mutate({
        history: currentHistory.map(h => ({role: h.role as 'user' | 'ai', text: h.text})),
        message: messageText,
      });
      
      return newMessages;
    });

  }, [chatMutation]);

    useEffect(() => {
        // This effect loads data from localStorage or initializes a new thread.
        // It runs only once when the component mounts for a given threadId.
        const isNewThread = threadId.startsWith('new-');
        const initialQuery = searchParams.get('q');

        let storedData: ThreadData | null = null;
        if (typeof window !== 'undefined' && window.localStorage) {
            const item = localStorage.getItem(`thread-${threadId}`);
            if (item) {
                try {
                    storedData = JSON.parse(item);
                } catch (e) {
                    console.error("Failed to parse thread data from localStorage", e);
                }
            }
        }

        if (storedData) {
            // Loading an existing thread
            setThreadData(storedData);
            setTitle(storedData.title);
            setMessages(storedData.messages || []);
            setHighlights(storedData.highlights || []);
        } else if (isNewThread && initialQuery) {
            // Creating a new thread
            const newThreadData: ThreadData = {
                id: threadId,
                title: initialQuery,
                snippet: '...',
                updatedAt: new Date().toISOString(),
                category: 'Unsorted',
                tags: ['new'],
                messages: [],
                highlights: [],
                references: [],
            };
            try {
                localStorage.setItem(`thread-${threadId}`, JSON.stringify(newThreadData));
                setThreadData(newThreadData);
                setTitle(newThreadData.title);
                setMessages([]); // Start with empty messages
            } catch (error) {
                console.error("Could not save new thread to localStorage", error);
                toast({
                  variant: 'destructive',
                  title: 'Failed to create thread',
                  description: 'Could not save the new thread locally.'
                });
            }
        }

        // Load all tags and categories for the dropdowns
        if (typeof window !== 'undefined' && window.localStorage) {
            let loadedThreads: ThreadData[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('thread-')) {
                    try {
                        const thread = JSON.parse(localStorage.getItem(key) || '');
                        loadedThreads.push(thread);
                    } catch (e) { /* ignore corrupt data */ }
                }
            }
            setAllTags([...new Set(loadedThreads.flatMap(t => t.tags))]);
            setAllCategories([...new Set(loadedThreads.map(t => t.category))]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);


    useEffect(() => {
        // This effect is specifically for sending the *first* message in a new thread.
        // It runs only when threadData is first set for a new thread with no messages.
        const isNewThread = threadId.startsWith('new-');
        const initialQuery = searchParams.get('q');

        if (isNewThread && initialQuery && threadData && threadData.messages.length === 0) {
            handleSendMessage(initialQuery);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadData]);


  const updateThreadInStorage = (threadId: string, updatedFields: Partial<ThreadData>) => {
      const currentThreadStr = localStorage.getItem(`thread-${threadId}`);
      if (!currentThreadStr) return null;
      try {
        const currentThread = JSON.parse(currentThreadStr);
        const newThreadData = { ...currentThread, ...updatedFields, updatedAt: new Date().toISOString() };
        localStorage.setItem(`thread-${threadId}`, JSON.stringify(newThreadData));
        queryClient.invalidateQueries({ queryKey: ['threads'] });
        return newThreadData;
      } catch (e) {
          console.error("Failed to update thread in localStorage", e);
          return null;
      }
  };

  const handleAddTag = () => {
    if (!newTagName.trim() || !threadData) return;
    const tagName = newTagName.trim();

    if (threadData.tags.includes(tagName)) {
        toast({ variant: 'destructive', title: "Tag already exists" });
        return;
    }
    
    const updatedTags = [...threadData.tags, tagName];
    const updatedThread = updateThreadInStorage(threadId, { tags: updatedTags });

    if (updatedThread) {
        setThreadData(updatedThread);
        setAllTags(prev => [...new Set([...prev, tagName])]);
        setNewTagName('');
        setIsAddingTag(false);
        toast({ title: "Tag added", description: `"${tagName}" was added.` });
    }
  };
  
  const handleChangeCategory = (newCategory: string) => {
      if (!threadData) return;
      const updatedThread = updateThreadInStorage(threadId, { category: newCategory });
      if (updatedThread) {
          setThreadData(updatedThread);
          toast({ title: "Category Changed", description: `Thread moved to "${newCategory}".` });
      }
  };

  const handleAddNewCategory = () => {
      if (!newCategoryName.trim()) return;
      const categoryName = newCategoryName.trim();
      handleChangeCategory(categoryName);
      setAllCategories(prev => [...new Set([...prev, categoryName])]);
      setNewCategoryName('');
      setIsAddingCategory(false);
  };


  const handleArchive = () => {
    console.log(`Archiving thread: ${threadId}`);
    toast({ title: "Thread Archived", description: "The thread has been moved to the archive." });
  };

  const handleDelete = () => {
    console.log(`Deleting thread: ${threadId}`);
    try {
      localStorage.removeItem(`thread-${threadId}`);
      toast({ variant: 'destructive', title: "Thread Deleted", description: "The thread has been permanently deleted." });
      router.push('/app/threads');
    } catch (error) {
        console.error("Could not remove thread from localStorage", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not delete thread." });
    }
  };

  const handleHighlightCreate = (highlightData: CreateHighlightData) => {
    console.log('handleHighlightCreate called with:', highlightData);
    const newHighlight: Highlight = {
        ...highlightData,
        id: uuidv4(),
    };
    console.log('New highlight created:', newHighlight);
    const updatedHighlights = [...highlights, newHighlight];
    console.log('Updated highlights array:', updatedHighlights);
    setHighlights(updatedHighlights);
    updateThreadInStorage(threadId, { highlights: updatedHighlights });
    toast({ title: "Highlight created!"});
  }

  const handleDeleteHighlight = (highlightId: string) => {
      const updatedHighlights = highlights.filter(h => h.id !== highlightId);
      setHighlights(updatedHighlights);
      updateThreadInStorage(threadId, { highlights: updatedHighlights });
      toast({ variant: 'destructive', title: "Highlight removed"});
  };

  const handleSetColorDescription = (color: string, description: string) => {
    if (!threadData) return;
    const updatedDescriptions = { ...threadData.colorDescriptions, [color]: description };
    const updatedThread = updateThreadInStorage(threadId, { colorDescriptions: updatedDescriptions });
    if (updatedThread) {
      setThreadData(updatedThread);
    }
  };

  const handleReferenceClick = (ref: AbstractReference) => {
    setActiveReference({ messageId: ref.messageId, text: ref.text });
    setTimeout(() => setActiveReference(null), 3000);
  };

  const handleHighlightClick = (highlight: Highlight) => {
    setActiveHighlight({ messageId: highlight.messageId, text: highlight.text });
    setTimeout(() => setActiveHighlight(null), 3000);
  };

  useEffect(() => {
    if (!threadSearchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const allMatches: SearchMatch[] = [];
    const searchTerms = threadSearchQuery.split('|');

    messages.forEach(message => {
        let textToSearch = message.text;
        
        searchTerms.forEach(term => {
            if (term.trim() === '') return;
            try {
                // Ensure term is a valid regex and doesn't end with a lone backslash
                if (term.endsWith('\\') && !term.endsWith('\\\\')) {
                    console.warn(`Skipping invalid regex term: ${term}`);
                    return;
                }
                const regex = new RegExp(term, 'gi');
                let match;
                while ((match = regex.exec(textToSearch)) !== null) {
                    if (match[0].trim() !== '') {
                         allMatches.push({
                            messageId: message.id,
                            startIndex: match.index,
                            endIndex: regex.lastIndex,
                        });
                    }
                }
            } catch (e) {
                console.error("Invalid regex term:", term, e);
            }
        });
    });

    if (allMatches.length === 0) {
        setSearchMatches([]);
        setCurrentMatchIndex(0);
        return;
    }

    allMatches.sort((a, b) => {
        const msgIndexA = messages.findIndex(m => m.id === a.messageId);
        const msgIndexB = messages.findIndex(m => m.id === b.messageId);
        if (msgIndexA !== msgIndexB) return msgIndexA - msgIndexB;
        return a.startIndex - b.startIndex;
    });

    setSearchMatches(allMatches);
    setCurrentMatchIndex(0);
  }, [threadSearchQuery, messages]);

  const threadTitle = title;

  const handleSearchNav = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      nextIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }
    setCurrentMatchIndex(nextIndex);
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchNav('next');
    }
  };

  const handleCloseSearch = () => {
    setIsSearchVisible(false);
    setThreadSearchQuery('');
  };

  const { data: abstractData, isLoading: isLoadingAbstract } = useQuery({
    queryKey: ['threadAbstract', threadId, messages.map(m => m.id).join('-')],
    queryFn: async () => {
      if (messages.length < 2) return null;
      const result = await generateThreadAbstract({ messages: messages.map(m => ({...m, text: m.text || ''})) });
      return result;
    },
    enabled: messages.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div 
        className={cn("grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 p-4 md:p-6 transition-all duration-300")}
        data-thread-id={threadId}
    >
      <main className="flex flex-col bg-card rounded-xl border shadow-sm min-w-0 h-[calc(100vh_-_theme(spacing.24))]">
        <div className="p-4 border-b space-y-2 sticky top-0 bg-card z-10">
            <div className="flex justify-between items-start">
              <h1 className="text-xl font-bold font-headline flex-grow">{threadTitle}</h1>
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                     <MoreHorizontal className="h-5 w-5" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={handleArchive}>
                     <Archive className="mr-2 h-4 w-4" />
                     <span>Archive</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                     <Trash2 className="mr-2 h-4 w-4" />
                     <span>Delete</span>
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            </div>

            {threadData?.snippet && <p className="text-sm text-muted-foreground">{threadData.snippet.substring(0, 80)}</p>}
            
            <div className="flex justify-between items-center gap-4 pt-2">
                {threadData?.category && (
                    <DropdownMenu onOpenChange={(open) => !open && setIsAddingCategory(false)}>
                    <DropdownMenuTrigger asChild>
                        <Badge variant="outline" className="cursor-pointer hover:bg-accent">{threadData.category}</Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" onFocusOutside={(e) => e.preventDefault()}>
                        <div className="flex justify-between items-center pr-2">
                            <DropdownMenuLabel>Move to...</DropdownMenuLabel>
                            <PlusCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setIsAddingCategory(true)} />
                        </div>
                        {isAddingCategory ? (
                            <div className="px-2 pb-2 space-y-2">
                            <Input
                                placeholder="New category name..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddNewCategory()
                                e.stopPropagation()
                                }}
                                className="h-8"
                            />
                            <Button onClick={handleAddNewCategory} size="sm" className="w-full h-8">Add & Move</Button>
                            </div>
                        ) : (
                            <>
                            <div className="px-2 pb-2">
                                <Input
                                placeholder="Search categories..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-8"
                                />
                            </div>
                            <DropdownMenuSeparator />
                            <div className="max-h-40 overflow-y-auto">
                                {allCategories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
                                    <DropdownMenuCheckboxItem
                                        key={cat}
                                        checked={threadData.category === cat}
                                        onSelect={(e) => { e.preventDefault(); handleChangeCategory(cat); }}
                                    >
                                        {cat}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </div>
                            </>
                        )}
                    </DropdownMenuContent>
                    </DropdownMenu>
                )}
                
                <div className="relative flex-grow min-w-[200px] flex items-center justify-end h-8">
                    <div className={cn(
                        "flex items-center gap-1 absolute right-0 transition-all duration-300",
                         isSearchVisible ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
                    )}>
                        <Popover open={isSmartSearchOpen} onOpenChange={setIsSmartSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                >
                                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Smart Search</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Describe what you're looking for in more detail.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="smart-search-input">Query</Label>
                                        <Textarea 
                                            id="smart-search-input" 
                                            placeholder="Describe what you are looking for" 
                                            value={smartSearchQuery}
                                            onChange={(e) => setSmartSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSmartSearch();
                                                }
                                            }}
                                        />
                                    </div>
                                    <Button onClick={handleSmartSearch} disabled={smartSearchMutation.isPending}>
                                        {smartSearchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Search
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsSearchVisible(true)} 
                            className="h-8 w-8"
                        >
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>

                    <div className={cn(
                        "w-full relative flex items-center transition-all duration-300",
                        isSearchVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input 
                            placeholder="Search in thread..."
                            className="pl-10 h-8 pr-24"
                            value={threadSearchQuery}
                            onChange={(e) => setThreadSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            autoFocus={isSearchVisible}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {threadSearchQuery && searchMatches.length > 0 ? (
                                <div className="flex items-center gap-1 rounded-full bg-background p-0.5">
                                    <span className="text-sm font-medium text-muted-foreground tabular-nums px-1">
                                        {currentMatchIndex + 1} of {searchMatches.length}
                                    </span>
                                    <Button variant="ghost" size="icon" onClick={() => handleSearchNav('prev')} className="h-6 w-6 rounded-full">
                                        <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleSearchNav('next')} className="h-6 w-6 rounded-full">
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-14" /> 
                            )}
                            <Button variant="ghost" size="icon" onClick={handleCloseSearch} className="h-6 w-6 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu onOpenChange={(open) => !open && setIsAddingTag(false)}>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-primary/20 hover:text-foreground">
                        <Hash className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" onFocusOutside={(e) => e.preventDefault()}>
                    <div className="flex justify-between items-center pr-2">
                        <DropdownMenuLabel>Tags</DropdownMenuLabel>
                        <PlusCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setIsAddingTag(true)} />
                    </div>
                    {isAddingTag ? (
                        <div className="px-2 pb-2 space-y-2">
                        <Input
                            placeholder="New tag name..."
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTag()
                                e.stopPropagation()
                            }}
                            className="h-8"
                        />
                        <Button onClick={handleAddTag} size="sm" className="w-full h-8">Add Tag</Button>
                        </div>
                    ) : (
                        <>
                        <div className="px-2 pb-2">
                            <Input
                            placeholder="Search tags..."
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-8"
                            />
                        </div>
                        <DropdownMenuSeparator />
                        <div className="max-h-40 overflow-y-auto">
                            {allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                            <DropdownMenuItem key={tag} onSelect={() => console.log(`Selected tag: ${tag}`)}>
                                {tag}
                            </DropdownMenuItem>
                            ))}
                        </div>
                        </>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {threadData?.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
            </div>
        </div>
        <ChatMessages 
            messages={messages} 
            onHighlightCreate={handleHighlightCreate}
            highlights={highlights}
            searchQuery={threadSearchQuery}
            activeMatch={searchMatches.length > 0 ? searchMatches[currentMatchIndex] : undefined}
            activeReference={activeReference}
            activeHighlight={activeHighlight}
            threadId={threadId}
        />
        <MessageComposer onSend={handleSendMessage} isLoading={chatMutation.isPending} />
      </main>
      <aside className={cn(
          "hidden lg:block transition-all duration-300",
          isInsightsPanelCollapsed ? "w-12" : "w-80"
      )}>
        <div className={cn("sticky top-20 h-[calc(100vh_-_theme(spacing.24))]")}>
            <InsightsPanel 
              highlights={highlights} 
              messages={messages}
              abstractData={abstractData}
              isLoadingAbstract={isLoadingAbstract}
              isCollapsed={isInsightsPanelCollapsed}
              onToggleCollapse={() => setIsInsightsPanelCollapsed(!isInsightsPanelCollapsed)}
              onDeleteHighlight={handleDeleteHighlight}
              colorDescriptions={threadData?.colorDescriptions || {}}
              onSetColorDescription={handleSetColorDescription}
              onActionItemClick={handleSendMessage}
              onReferenceClick={handleReferenceClick}
              onHighlightClick={handleHighlightClick}
            />
        </div>
      </aside>
    </div>
  );
}

    
