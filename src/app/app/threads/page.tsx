
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter, ChevronDown, MoreHorizontal, Archive, Trash2, Hash, Combine, Split, BookMarked, Upload, Search, Settings2, X, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

type Thread = {
  id: string;
  title: string;
  updatedAt: string;
  snippet: string;
  category: string;
  tags: string[];
  messages: Message[];
};

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const { toast } = useToast();
  const [tagSearch, setTagSearch] = useState('');
  const [isAddingTag, setIsAddingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [categorySearch, setCategorySearch] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState({
      thread: true,
      category: false,
      tag: false,
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortedCategories, setSortedCategories] = useState<string[]>([]);
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);


  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const loadThreads = React.useCallback(() => {
    const list: Thread[] = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('thread-')) {
          try {
            const threadData = JSON.parse(localStorage.getItem(key) || '');
            list.push(threadData);
          } catch (e) {
            console.error('Failed to parse thread from local storage', e);
          }
        }
      }
    }
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setThreads(list);
  }, []);

  useEffect(() => {
    loadThreads();
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('thread-')) {
        loadThreads();
      }
    };
    const handleThreadsUpdated = () => loadThreads();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('threads-updated', handleThreadsUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('threads-updated', handleThreadsUpdated as EventListener);
    };
  }, [loadThreads]);

  const categories = React.useMemo(() => [...new Set(threads.map(t => t.category))], [threads]);
  const allTags = React.useMemo(() => [...new Set(threads.flatMap(t => t.tags))], [threads]);

  const [selectedCategories, setSelectedCategories] = React.useState<Record<string, boolean>>({});
  const [selectedTags, setSelectedTags] = React.useState<Record<string, boolean>>({});
  const [filterLogic, setFilterLogic] = React.useState<'AND' | 'OR'>('OR');
  
  useEffect(() => {
    const next = Object.keys(threads.reduce((acc, thread) => {
      const { category } = thread;
      if (!acc[category]) acc[category] = [];
      acc[category].push(thread);
      return acc;
    }, {} as Record<string, Thread[]>)).sort((a, b) => {
      if (a === 'Unsorted') return -1;
      if (b === 'Unsorted') return 1;
      return a.localeCompare(b);
    });
    setSortedCategories(next);
  }, [threads]);

  const filteredThreads = React.useMemo(() => {
    const activeCategories = Object.keys(selectedCategories).filter(k => selectedCategories[k]);
    const activeTags = Object.keys(selectedTags).filter(k => selectedTags[k]);
    
    let threadsToFilter = threads;

    if (activeCategories.length > 0 || activeTags.length > 0) {
      threadsToFilter = threads.filter(thread => {
        const categoryMatch = activeCategories.length === 0 || activeCategories.includes(thread.category);
        const tagMatch = activeTags.length === 0 || (filterLogic === 'AND' ? activeTags.every(tag => thread.tags.includes(tag)) : activeTags.some(tag => thread.tags.includes(tag)));
        
        if (activeCategories.length > 0 && activeTags.length > 0) {
            if (filterLogic === 'AND') {
                return categoryMatch && tagMatch;
            } else { // OR
                return categoryMatch || tagMatch;
            }
        }
        if (activeCategories.length > 0) return categoryMatch;
        if (activeTags.length > 0) return tagMatch;
        return false;
      });
    }

    if (searchQuery.trim()) {
        threadsToFilter = threadsToFilter.filter(thread => {
            const query = searchQuery.toLowerCase();
            let match = false;
            if (searchScope.thread) {
                match = match || thread.title.toLowerCase().includes(query) || thread.snippet.toLowerCase().includes(query);
            }
             if (searchScope.category) {
                match = match || thread.category.toLowerCase().includes(query);
            }
            if (searchScope.tag) {
                match = match || thread.tags.some(t => t.toLowerCase().includes(query));
            }
            return match;
        });
    }
    
    return threadsToFilter;

  }, [threads, selectedCategories, selectedTags, filterLogic, searchQuery, searchScope]);

  const threadsByCategory = filteredThreads.reduce((acc, thread) => {
    const { category } = thread;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(thread);
    return acc;
  }, {} as Record<string, Thread[]>);
  
  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setIsDragging(true);
  };

  const handleDragEnter = (index: number) => {
    if (dragItem.current === null || dragItem.current === index) return;
    dragOverItem.current = index;
    const newSortedCategories = [...sortedCategories];
    const draggedItemContent = newSortedCategories.splice(dragItem.current, 1)[0];
    newSortedCategories.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = index;
    setSortedCategories(newSortedCategories);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  const updateThreadInStorage = (threadId: string, updatedThread: Partial<Thread>) => {
      const currentThreadStr = localStorage.getItem(`thread-${threadId}`);
      if (!currentThreadStr) return;
      try {
        const currentThread = JSON.parse(currentThreadStr);
        const newThreadData = { ...currentThread, ...updatedThread, updatedAt: new Date().toISOString() };
        localStorage.setItem(`thread-${threadId}`, JSON.stringify(newThreadData));
        // notify other pages/components in the same tab
        window.dispatchEvent(new Event('threads-updated'));
      } catch (e) {
          console.error("Failed to update thread in localStorage", e);
      }
  };


  const handleCategorySelect = (category: string) => {
    setSelectedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const handleClearFilters = () => {
    setSelectedCategories({});
    setSelectedTags({});
  };

  const areFiltersActive = Object.values(selectedCategories).some(v => v) || Object.values(selectedTags).some(v => v);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }

  const handleArchive = (threadId: string) => {
    console.log(`Archiving thread: ${threadId}`);
    toast({ title: "Thread Archived", description: "The thread has been moved to the archive." });
  };

  const handleDelete = (threadId: string) => {
    console.log(`Deleting thread: ${threadId}`);
    try {
      localStorage.removeItem(`thread-${threadId}`);
      setThreads(threads => threads.filter(t => t.id !== threadId));
      toast({ variant: 'destructive', title: "Thread Deleted", description: "The thread has been permanently deleted." });
    } catch (error) {
        console.error("Could not remove thread from localStorage", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not delete thread." });
    }
  };

  const handleAddTag = (threadId: string) => {
    if (!newTagName.trim()) return;
    const tagName = newTagName.trim();
    setThreads(threads => threads.map(t => {
      if (t.id === threadId && !t.tags.includes(tagName)) {
        const updatedTags = [...t.tags, tagName];
        updateThreadInStorage(threadId, { tags: updatedTags });
        return { ...t, tags: updatedTags };
      }
      return t;
    }));
    setNewTagName('');
    setIsAddingTag(null);
    toast({ title: "Tag added", description: `"${tagName}" was added.` });
  };

  const handleChangeCategory = (threadId: string, newCategory: string) => {
    setThreads(threads => threads.map(t => {
        if (t.id === threadId) {
            updateThreadInStorage(threadId, { category: newCategory });
            return { ...t, category: newCategory };
        }
        return t;
    }));
    toast({ title: "Category Changed", description: `Thread moved to "${newCategory}".` });
  };

    const handleAddNewCategory = (threadId: string) => {
        if (!newCategoryName.trim() || !threadId) return;
        const categoryName = newCategoryName.trim();
        handleChangeCategory(threadId, categoryName);
        setNewCategoryName('');
        setIsAddingCategory(null);
    };


  const getRelativeTime = (dateString: string) => {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
        return "a while ago";
    }
  }


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline">Threads</h1>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <div className="relative w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search threads..."
            className="pl-10 h-10 pr-10"
            aria-label="Search threads"
          />
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 transition-opacity", (isSearchFocused || searchQuery) ? 'opacity-100' : 'opacity-50' )}>
                      <Settings2 className="h-5 w-5" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuLabel>Search In</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                      checked={searchScope.thread}
                      onSelect={(e) => { e.preventDefault(); setSearchScope(s => ({ ...s, thread: !s.thread }))}}
                  >
                      Thread
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                      checked={searchScope.category}
                      onSelect={(e) => { e.preventDefault(); setSearchScope(s => ({ ...s, category: !s.category }))}}
                  >
                      Category
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                      checked={searchScope.tag}
                      onSelect={(e) => { e.preventDefault(); setSearchScope(s => ({ ...s, tag: !s.tag }))}}
                  >
                      Tag
                  </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
                <div className="p-2 flex items-center justify-between">
                    <DropdownMenuLabel className="p-0">Filter Logic</DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                        {areFiltersActive && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearFilters}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear filters</span>
                            </Button>
                        )}
                        <ToggleGroup 
                            type="single" 
                            defaultValue="OR" 
                            value={filterLogic}
                            onValueChange={(value: 'AND' | 'OR') => value && setFilterLogic(value)} 
                            aria-label="Filter Logic"
                        >
                            <ToggleGroupItem value="AND" aria-label="AND" className="p-1.5 h-auto">
                                <Combine className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="OR" aria-label="OR" className="p-1.5 h-auto">
                                <Split className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>
                <Separator />
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <div className="max-h-40 overflow-y-auto px-2">
                {categories.map(category => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategories[category]}
                    onSelect={(e) => { e.preventDefault(); handleCategorySelect(category); }}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
              <div className="max-h-40 overflow-y-auto px-2">
                {allTags.map(tag => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags[tag]}
                    onSelect={(e) => { e.preventDefault(); handleTagSelect(tag); }}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline">
            <Upload className="mr-2 h-5 w-5" />
            Import
          </Button>
          <Button asChild>
            <Link href="/app">
              <PlusCircle className="mr-2 h-5 w-5" />
              New Thread
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredThreads.length > 0 ? (
          sortedCategories.map((category, index) => (
            threadsByCategory[category] && threadsByCategory[category].length > 0 && 
            <div 
              key={category}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "group/category rounded-lg transition-all duration-500", 
                isDragging && 'cursor-grabbing',
                dragItem.current === index && isDragging && 'opacity-50 scale-105 shadow-lg'
              )}
            >
              {collapsedCategories[category] ? (
                 <Card 
                    className="p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleCategoryCollapse(category)}
                 >
                     <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground/50 transition-opacity opacity-0 group-hover/category:opacity-100 cursor-grab" />
                        <ChevronDown
                            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 -rotate-90`}
                        />
                        <h2 className="text-xl font-headline font-semibold">{category}</h2>
                        <Badge variant="secondary" className="text-xs">{threadsByCategory[category].length}</Badge>
                    </div>
                 </Card>
              ) : (
                <div>
                    <div
                        className="flex items-center gap-2 cursor-pointer mb-4"
                        onClick={() => toggleCategoryCollapse(category)}
                    >
                        <GripVertical className="h-5 w-5 text-muted-foreground/50 transition-opacity opacity-0 group-hover/category:opacity-100 cursor-grab" />
                        <ChevronDown
                            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 rotate-0`}
                        />
                        <h2 className="text-xl font-headline font-semibold">{category}</h2>
                        <Badge variant="secondary" className="text-xs">{threadsByCategory[category].length}</Badge>
                    </div>
                    <div className="border rounded-lg bg-card/50">
                    <ul className="divide-y divide-border">
                        {threadsByCategory[category].map((thread) => (
                        <li key={thread.id} className="group transition-colors duration-200">
                            <div className="relative p-4 hover:bg-muted/30 rounded-lg">
                            <Link href={`/app/threads/${thread.id}`} className="absolute inset-0 z-0" />
                            <div className="flex justify-between items-start">
                                <div className="pr-10 flex-grow">
                                <p className="text-md font-semibold text-primary">{thread.title}</p>
                                <p className="text-sm text-muted-foreground mt-1 truncate">{thread.snippet.substring(0, 80)}</p>
                                </div>
                                <div className="relative z-10 flex items-center -mr-2 -mt-2" onClick={handleMenuClick}>
                                <DropdownMenu onOpenChange={(open) => !open && setIsAddingCategory(null)}>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <BookMarked className="h-5 w-5" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onFocusOutside={e => e.preventDefault()}>
                                        <div className="flex justify-between items-center pr-2">
                                            <DropdownMenuLabel>Move to...</DropdownMenuLabel>
                                            <PlusCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setIsAddingCategory(thread.id)} />
                                        </div>
                                        {isAddingCategory === thread.id ? (
                                        <div className="px-2 pb-2 space-y-2">
                                            <Input
                                            placeholder="New category name..."
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddNewCategory(thread.id)
                                                e.stopPropagation()
                                            }}
                                            className="h-8"
                                            />
                                            <Button onClick={() => handleAddNewCategory(thread.id)} size="sm" className="w-full h-8">Add & Move</Button>
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
                                                {categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
                                                    <DropdownMenuCheckboxItem
                                                        key={cat}
                                                        checked={thread.category === cat}
                                                        onSelect={(e) => { e.preventDefault(); handleChangeCategory(thread.id, cat); }}
                                                    >
                                                        {cat}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </div>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleArchive(thread.id)}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        <span>Archive</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(thread.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap relative z-10" onClick={handleMenuClick}>
                                    <DropdownMenu onOpenChange={(open) => !open && setIsAddingTag(null)}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-primary/20 hover:text-foreground">
                                        <Hash className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" onFocusOutside={(e) => e.preventDefault()}>
                                        <div className="flex justify-between items-center pr-2">
                                        <DropdownMenuLabel>Tags</DropdownMenuLabel>
                                        <PlusCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setIsAddingTag(thread.id)} />
                                        </div>
                                        {isAddingTag === thread.id ? (
                                        <div className="px-2 pb-2 space-y-2">
                                            <Input
                                            placeholder="New tag name..."
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddTag(thread.id);
                                                e.stopPropagation();
                                                }
                                            }
                                            className="h-8"
                                            />
                                            <Button onClick={() => handleAddTag(thread.id)} size="sm" className="w-full h-8">Add Tag</Button>
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
                                    {thread.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap text-right">{getRelativeTime(thread.updatedAt)}</p>
                            </div>
                            </div>
                        </li>
                        ))}
                    </ul>
                    </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-16">
             { threads.length === 0 ? (
                <>
                    <p>You have no threads yet.</p>
                    <p className="text-sm mt-2">
                        Start a <Link href="/app" className="underline text-primary">New Thread</Link> to begin.
                    </p>
                </>
             ) : (
                <>
                    <p>No threads match your selected filters.</p>
                    <p className="text-sm mt-2">Try clearing the filters to see all your threads.</p>
                </>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
