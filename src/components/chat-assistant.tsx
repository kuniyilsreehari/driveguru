'use client';

import { useState, useRef, useEffect } from 'react';
import { chat, type ChatInput } from '@/ai/flows/chat-assistant-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, X, MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Message = {
  role: 'user' | 'model';
  text: string;
};

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi! I am Gemini, your DriveGuru assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Map history to Genkit format
      const history = messages.map(m => ({
        role: m.role,
        content: [{ text: m.text }]
      }));

      const response = await chat({
        message: userMessage,
        history
      });

      setMessages(prev => [...prev, { role: 'model', text: response.reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[350px] sm:w-[400px] h-[500px] shadow-2xl flex flex-col overflow-hidden border-2 border-primary/20 animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="bg-primary p-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-white text-base font-black">Gemini Assistant</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden bg-background">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn("h-8 w-8 shrink-0", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <AvatarFallback className="text-[10px] font-bold">
                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed",
                      m.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none"
                    )}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0 bg-muted">
                      <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground italic">Gemini is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-4 border-t bg-background">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
              <Input 
                placeholder="Ask Gemini anything..." 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-xl h-10"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="rounded-xl h-10 w-10">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      <Button 
        size="icon" 
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
          isOpen ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-primary text-primary-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
      </Button>
    </div>
  );
}