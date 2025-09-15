
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessageSquare, Send, X, Loader2, Bot, Mic, Volume2, Play } from 'lucide-react';
import { chatbotAction, textToSpeechAction } from '@/lib/actions';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

export function Chatbot({ lat, lon }: { lat?: string, lon?: string }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStates, setAudioStates] = useState<Record<number, 'idle' | 'loading' | 'playing'>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  if (recognitionRef.current === null && typeof window !== 'undefined') {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          handleSend(transcript); 
        };
        recognition.onerror = (event: any) => {
           toast({ title: t('chatbot.error.voice.title'), description: event.error, variant: "destructive"});
           setIsRecording(false);
        };
        recognition.onend = () => {
           setIsRecording(false);
        };
        recognitionRef.current = recognition;
    }
  }


  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: 'model', content: t('chatbot.greeting') }
      ]);
    }
  }, [isOpen, messages.length, t]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
       toast({ title: t('chatbot.error.unsupported.title'), description: t('chatbot.error.unsupported.description'), variant: "destructive" });
       return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };
  
  const handlePlayAudio = async (text: string, index: number) => {
    if (audioStates[index] === 'playing') {
      audioRef.current?.pause();
      setAudioStates(prev => ({...prev, [index]: 'idle'}));
      return;
    }
    
    setAudioStates(prev => ({...prev, [index]: 'loading'}));
    const result = await textToSpeechAction(text);
    if(result.error || !result.data) {
        toast({ title: t('chatbot.error.audio.title'), description: result.error || t('chatbot.error.audio.description'), variant: "destructive" });
        setAudioStates(prev => ({...prev, [index]: 'idle'}));
        return;
    }

    if(audioRef.current) {
        audioRef.current.src = result.data.audioDataUri;
        audioRef.current.play();
        setAudioStates(prev => ({...prev, [index]: 'playing'}));
        audioRef.current.onended = () => {
            setAudioStates(prev => ({...prev, [index]: 'idle'}));
        }
    }
  }
  

  const handleSend = async (textToSend?: string) => {
    const currentInput = textToSend || input;
    if (currentInput.trim() === '') return;

    const userMessage: ChatMessage = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const newMessages = [...messages, userMessage];
    const result = await chatbotAction({ 
        messages: newMessages,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lon ? parseFloat(lon) : undefined,
    });

    setIsLoading(false);

    if (result.error) {
      const errorMessage: ChatMessage = { role: 'model', content: t('chatbot.error.connection') };
      setMessages(prev => [...prev, errorMessage]);
    } else if (result.data) {
      const modelMessage: ChatMessage = { role: 'model', content: result.data.response };
      setMessages(prev => [...prev, modelMessage]);
    }
  };
  
  const renderAudioIcon = (text: string, index: number) => {
      const state = audioStates[index] || 'idle';

      if (state === 'loading') return <Loader2 className="h-4 w-4 animate-spin" />;
      if (state === 'playing') return <Play className="h-4 w-4" />;
      return <Volume2 className="h-4 w-4" />
  }

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      {isOpen ? (
        <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col z-50 shadow-2xl rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg">{t('chatbot.title')}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto">
            <ScrollArea className="h-full" ref={scrollAreaRef as any}>
                <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn('flex items-start gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'model' && (
                     <Avatar className="w-8 h-8">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                  )}
                   <div className={cn(
                        'p-3 rounded-lg max-w-[80%] relative group',
                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.role === 'model' && (
                            <Button size="icon" variant="ghost" className="absolute -right-10 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handlePlayAudio(message.content, index)} disabled={audioStates[index] === 'loading'}>
                               {renderAudioIcon(message.content, index)}
                            </Button>
                        )}
                    </div>
                  {message.role === 'user' && (
                     <Avatar className="w-8 h-8">
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-start gap-3 justify-start">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                </div>
              )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 border-t">
            <div className="flex w-full items-center space-x-2">
              <Input
                placeholder={t('chatbot.placeholder')}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                disabled={isLoading || isRecording}
              />
               <Button onClick={handleVoiceInput} disabled={isLoading} variant={isRecording ? "destructive" : "outline"} size="icon">
                <Mic className="h-4 w-4" />
              </Button>
              <Button onClick={() => handleSend()} disabled={isLoading || isRecording}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 rounded-full w-16 h-16 shadow-lg"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </>
  );
}
