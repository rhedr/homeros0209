import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Paperclip, Mic, Loader2 } from "lucide-react";
import { useState } from "react";

export function MessageComposer({ onSend, isLoading }: { onSend: (message: string) => void, isLoading: boolean }) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t bg-card">
      <div className="relative">
        <Textarea
          placeholder="Ask a question or type '/' for commands..."
          className="pr-28 py-3 min-h-[52px] resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={isLoading}>
                <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button size="icon" onClick={handleSend} disabled={isLoading || !message.trim()}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
            </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Homeros AI can make mistakes. Consider checking important information.
      </p>
    </div>
  );
}
