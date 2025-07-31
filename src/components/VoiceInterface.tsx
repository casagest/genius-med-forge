import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff, MessageSquare, Activity } from 'lucide-react';

interface VoiceInterfaceProps {
  onSpeakingChange: (speaking: boolean) => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}


const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onSpeakingChange }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Received message:', event);
    
    // Handle different event types
    switch (event.type) {
      case 'response.audio.delta':
        setIsSpeaking(true);
        onSpeakingChange(true);
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        onSpeakingChange(false);
        break;
        
      case 'response.audio_transcript.delta':
        setCurrentTranscript(prev => prev + (event.delta || ''));
        break;
        
      case 'response.audio_transcript.done':
        if (currentTranscript.trim()) {
          const message: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: currentTranscript.trim(),
            timestamp: new Date()
          };
          setMessages(prev => [...prev, message]);
          setCurrentTranscript('');
        }
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          const message: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: event.transcript,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, message]);
        }
        break;
        
      case 'error':
        console.error('Realtime API error:', event.error);
        toast({
          title: "Voice AI Error",
          description: event.error?.message || 'An error occurred',
          variant: "destructive",
        });
        break;
    }
  };

  const startConversation = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      setIsConnected(true);
      
      toast({
        title: "Voice AI Connected",
        description: "Medical AI assistant is ready for conversation",
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : 'Failed to start conversation',
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
    onSpeakingChange(false);
    
    toast({
      title: "Disconnected",
      description: "Voice AI session ended",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Voice Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            AI Voice Assistant
            {isConnected && (
              <Badge variant={isSpeaking ? "default" : "secondary"}>
                {isSpeaking ? "Speaking" : "Listening"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {!isConnected ? (
              <Button 
                onClick={startConversation}
                disabled={isConnecting}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {isConnecting ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Voice AI
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={endConversation}
                variant="secondary"
              >
                <MicOff className="w-4 h-4 mr-2" />
                End Session
              </Button>
            )}
            
            {isConnected && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                {isSpeaking ? 'AI is speaking...' : 'Listening for voice input'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Current AI Response */}
              {currentTranscript && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-muted mr-4 border-2 border-primary/20">
                    <p className="text-sm">{currentTranscript}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                      <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceInterface;