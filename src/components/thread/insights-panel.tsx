import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Quote, Loader2, Dot, ClipboardCheck, PanelRight, Trash2, PanelLeft } from 'lucide-react';
import type { GenerateThreadAbstractOutput, Reference } from "@/ai/flows/types/thread-abstract-types";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";


type Highlight = {
    id: string;
    messageId: string;
    text: string;
    color?: string;
};

type Message = {
  role: 'user' | 'ai';
  text: string;
  id: string;
};

type InsightsPanelProps = {
  highlights: Highlight[];
  messages: Message[];
  abstractData: GenerateThreadAbstractOutput | null | undefined;
  isLoadingAbstract: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDeleteHighlight: (highlightId: string) => void;
  colorDescriptions: Record<string, string>;
  onSetColorDescription: (color: string, description: string) => void;
  onActionItemClick?: (actionText: string) => void;
  onReferenceClick?: (ref: Reference) => void;
  onHighlightClick?: (highlight: Highlight) => void;
};


export function InsightsPanel({ 
    highlights, 
    messages,
    abstractData,
    isLoadingAbstract,
    isCollapsed, 
    onToggleCollapse, 
    onDeleteHighlight, 
    colorDescriptions,
    onSetColorDescription,
    onActionItemClick,
    onReferenceClick,
    onHighlightClick,
}: InsightsPanelProps) {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [currentDescription, setCurrentDescription] = useState('');

  const highlightColors = useMemo(() => {
    const colors = highlights.map(h => h.color).filter((c): c is string => !!c);
    return [...new Set(colors)];
  }, [highlights]);
  
  const handleColorFilter = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color) 
        : [...prev, color]
    );
  };

  const filteredHighlights = useMemo(() => {
    if (selectedColors.length === 0) {
      return highlights;
    }
    return highlights.filter(h => h.color && selectedColors.includes(h.color));
  }, [highlights, selectedColors]);

  const handleEditClick = () => {
    if (selectedColors.length === 1) {
        setCurrentDescription(colorDescriptions[selectedColors[0]] || '');
        setIsEditingDescription(true);
    }
  };

  const handleSaveDescription = () => {
    if (selectedColors.length === 1) {
        onSetColorDescription(selectedColors[0], currentDescription);
    }
    setIsEditingDescription(false);
  };

  const multiDescriptionText = useMemo(() => {
    if (selectedColors.length > 1) {
        return selectedColors
            .map(color => colorDescriptions[color])
            .filter(Boolean)
            .join(', ');
    }
    return '';
  }, [selectedColors, colorDescriptions]);


  if (isCollapsed) {
    return (
       <Card className="h-full flex flex-col items-center shadow-sm py-2 border-l-2 border-r-0 border-y-0 rounded-none">
         <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
             <PanelLeft className="h-6 w-6 text-primary" strokeWidth={1.5} />
         </Button>
       </Card>
    )
  }


  return (
    <Card className="h-full flex flex-col shadow-sm">
        <Tabs defaultValue="references" className="flex flex-col flex-grow" onValueChange={setActiveTab}>
            <div className="flex items-center justify-between p-2 border-b">
                <div className="flex-1 pl-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="references">References</TabsTrigger>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="highlights">Highlights</TabsTrigger>
                    </TabsList>
                </div>
                <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="w-10">
                    <PanelRight className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </Button>
            </div>
            <div className="flex-grow min-h-0">
                <TabsContent value="references" className="h-full">
                     <ScrollArea className="h-full p-4">
                        <div className="pb-4">
                            {abstractData?.references && abstractData.references.length > 0 ? (
                                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                                {abstractData.references.map((ref, index) => (
                                    <li
                                    key={index}
                                    className="cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => onReferenceClick?.(ref)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onReferenceClick?.(ref) }}
                                    >
                                    <span className="break-words">{ref.text}</span>
                                    </li>
                                ))}
                                </ol>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                <p className="text-sm text-muted-foreground text-center">
                                    {isLoadingAbstract ? 'Loading references...' : 'No references found in this thread yet.'}
                                </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="summary" className="h-full">
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2 text-sm">Abstract</h3>
                                {isLoadingAbstract ? (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    <span>Generating...</span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{abstractData?.abstract || "Not enough content to generate an abstract."}</p>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2 text-sm">Key Points</h3>
                                {isLoadingAbstract ? (
                                    <div className="space-y-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Generating point...</span>
                                        </div>
                                    ))}
                                    </div>
                                ) : (
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                    {abstractData?.keyPoints && abstractData.keyPoints.length > 0 ? (
                                        abstractData.keyPoints.map((point, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Dot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                            <span>{point}</span>
                                        </li>
                                        ))
                                    ) : (
                                        <p>Not enough content to generate key points.</p>
                                    )}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2 text-sm">Action Items</h3>
                                {isLoadingAbstract ? (
                                    <div className="space-y-2">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className="flex items-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Generating action...</span>
                                        </div>
                                    ))}
                                    </div>
                                ) : (
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                    {abstractData?.actionItems && abstractData.actionItems.length > 0 ? (
                                        abstractData.actionItems.map((item, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-2 cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => onActionItemClick?.(item)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActionItemClick?.(item) }}
                                        >
                                            <ClipboardCheck className="h-4 w-4 mt-1 flex-shrink-0 text-primary/70" />
                                            <span>{item}</span>
                                        </li>
                                        ))
                                    ) : (
                                        <p>No action items suggested yet.</p>
                                    )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="highlights" className="h-full flex flex-col">
                    <div className="p-4 pb-2">
                        {highlightColors.length > 0 && (
                            <div className="flex items-center flex-wrap gap-3 py-2 mb-2 border-b">
                            {highlightColors.map(color => (
                                <div
                                key={color}
                                className={cn(
                                    "h-5 w-5 rounded-full cursor-pointer transition-all",
                                    selectedColors.includes(color) ? "scale-110 opacity-100 border-2 border-black" : "opacity-50 hover:opacity-100"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => handleColorFilter(color)}
                                />
                            ))}
                            </div>
                        )}
                        {selectedColors.length === 1 && (
                            <div className="mb-4">
                            {isEditingDescription ? (
                                <Input
                                placeholder="Describe Highlights"
                                className="h-8 text-sm"
                                value={currentDescription}
                                onChange={(e) => setCurrentDescription(e.target.value)}
                                onBlur={handleSaveDescription}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveDescription();
                                    if (e.key === 'Escape') setIsEditingDescription(false);
                                }}
                                autoFocus
                                />
                            ) : (
                                <div
                                className="text-sm text-muted-foreground italic h-8 flex items-center px-3 cursor-text"
                                onClick={handleEditClick}
                                >
                                {colorDescriptions[selectedColors[0]] || 'Describe Highlights'}
                                </div>
                            )}
                            </div>
                        )}
                        {selectedColors.length > 1 && multiDescriptionText && (
                            <div className="mb-4 text-sm text-muted-foreground italic h-8 flex items-center px-3">
                            {multiDescriptionText}
                            </div>
                        )}
                    </div>
                    <div className="flex-grow min-h-0">
                        <ScrollArea className="h-full px-4">
                            {highlights.length > 0 ? (
                                <div className="space-y-4">
                                {filteredHighlights.map(highlight => (
                                    <Card 
                                        key={highlight.id} 
                                        className="bg-card group relative cursor-pointer" 
                                        style={{ borderLeft: `4px solid ${highlight.color || 'transparent'}` }}
                                        onClick={() => onHighlightClick?.(highlight)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onHighlightClick?.(highlight) }}
                                    >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); onDeleteHighlight(highlight.id); }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <CardContent className="p-3">
                                        <p className="text-sm text-foreground italic pr-6">
                                        <Quote className="inline-block h-4 w-4 mr-2 text-muted-foreground/50" />
                                        {highlight.text}
                                        </p>
                                    </CardContent>
                                    </Card>
                                ))}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                <p className="text-sm text-muted-foreground text-center">
                                    Select text in the chat<br />to create a highlight.
                                </p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </TabsContent>
            </div>
        </Tabs>
    </Card>
  );
}
