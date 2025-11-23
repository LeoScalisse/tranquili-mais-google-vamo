import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChatMessage, ChatMode } from '../types';
import { connectLiveSession, createPcmBlob, decode, decodeAudioData } from '../services/geminiService';
import { playSound } from '../services/soundService';
import { LinkIcon, Mic, Square, CopyIcon, CheckIcon } from '../components/ui/Icons';
import { PromptInputBox } from '../components/PromptInputBox';

// --- Utility function for className merging ---
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5 p-3">
      <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
      <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
      <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

interface ChatScreenProps {
    chatHistory: ChatMessage[];
    onSendMessage: (message: string, files: File[]) => void;
    isLoading: boolean;
    handleProtectedAction: (action: () => void) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatHistory: messages, onSendMessage, isLoading, handleProtectedAction }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    
    const liveSessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);
    
    const stopLiveSession = useCallback(async () => {
        setIsRecording(false);
        if (liveSessionPromiseRef.current) {
            try {
                const session = await liveSessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session", e);
            }
            liveSessionPromiseRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);
    
    const startLiveSession = useCallback(async () => {
        handleProtectedAction(() => {
            const execute = async () => {
                setIsRecording(true);
                playSound('select');
                
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                let nextStartTime = 0;

                liveSessionPromiseRef.current = connectLiveSession({
                    onOpen: async () => {
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            mediaStreamRef.current = stream;
                            const source = audioContextRef.current!.createMediaStreamSource(stream);
                            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createPcmBlob(inputData);
                                liveSessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(scriptProcessor);
                            scriptProcessor.connect(audioContextRef.current!.destination);
                        } catch (err) {
                            console.error("Error accessing microphone:", err);
                            stopLiveSession();
                        }
                    },
                    onMessage: async (message) => {
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (audioData) {
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            const currentTime = outputAudioContext.currentTime;
                            const startTime = Math.max(currentTime, nextStartTime);
                            source.start(startTime);
                            nextStartTime = startTime + audioBuffer.duration;
                        }
                    },
                    onError: (e) => { console.error(e); stopLiveSession(); },
                    onClose: () => { console.log('Session closed'); stopLiveSession(); },
                });
            };
            execute();
        });

    }, [stopLiveSession, handleProtectedAction]);
    
    const handleSend = (message: string, files: File[]) => {
        handleProtectedAction(() => onSendMessage(message, files));
    };
    
    const formatTimestamp = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    
    const handleCopyToClipboard = (text: string, messageId: string) => {
        if (!navigator.clipboard) {
            console.error('Clipboard API not available');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            playSound('confirm');
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            playSound('error');
        });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="flex items-center p-4 border-b border-gray-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#38b6ff] to-blue-200 mr-3"></div>
                <div>
                    <h1 className="font-bold text-lg text-gray-800">Tranquilinha</h1>
                    <p className="text-sm text-gray-500">{isLoading ? 'Digitando...' : 'Online'}</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-48">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                        "flex flex-col animate-incoming-message",
                        msg.role === 'user' ? 'items-end' : 'items-start'
                    )}>
                        <div className={cn(
                            "flex items-end gap-2",
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38b6ff] to-blue-200 flex-shrink-0 self-start"></div>}
                            
                            <div className="group relative">
                                <div className={cn(
                                    "max-w-xs md:max-w-md p-3 rounded-2xl",
                                    msg.role === 'user' ? 'bg-[#38b6ff] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    {msg.image && <img src={msg.image} alt="Chat content" className="mt-2 rounded-lg max-w-full h-auto" />}
                                    {msg.sources && (
                                        <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                                            {msg.sources.map((source, i) => (
                                                <a href={source.uri} key={i} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                                                    <LinkIcon className="w-3 h-3"/> {source.title}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {msg.role === 'model' && msg.text && (
                                    <button 
                                        onClick={() => handleCopyToClipboard(msg.text, msg.id)}
                                        className="absolute bottom-2 right-2 p-1.5 bg-white/70 backdrop-blur-sm rounded-full text-gray-500 hover:bg-white hover:text-gray-800 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        title={copiedMessageId === msg.id ? "Copiado!" : "Copiar"}
                                        disabled={copiedMessageId === msg.id}
                                    >
                                        {copiedMessageId === msg.id ? (
                                            <CheckIcon className="w-3 h-3 text-green-500" />
                                        ) : (
                                            <CopyIcon className="w-3 h-3" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className={cn(
                            "text-xs text-gray-400 mt-1",
                            msg.role === 'user' ? 'mr-0' : 'ml-10' // ml-10 = w-8 (2rem) + gap-2 (0.5rem)
                        )}>
                            {formatTimestamp(msg.timestamp)}
                        </p>
                    </div>
                ))}
                {isLoading && !isRecording && (
                    <div className="flex items-end gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38b6ff] to-blue-200 flex-shrink-0"></div>
                        <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none">
                            <TypingIndicator />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            {isRecording ? (
                <div className="fixed bottom-24 left-0 right-0 px-4 flex justify-center items-center h-[56px] z-20">
                    <button
                        onClick={stopLiveSession}
                        className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center relative"
                        aria-label="Stop recording"
                    >
                        <div className="absolute w-20 h-20 rounded-full bg-red-500 animate-ping"></div>
                        <Square className="w-8 h-8 z-10" />
                    </button>
                </div>
            ) : (
                <div className="fixed bottom-24 left-0 right-0 px-4 pointer-events-none z-20">
                  <div className="max-w-3xl mx-auto pointer-events-auto">
                     <PromptInputBox
                        onSend={handleSend}
                        isLoading={isLoading}
                        onMicClick={startLiveSession}
                        placeholder="Converse com a Tranquilinha..."
                     />
                  </div>
                </div>
            )}
        </div>
    );
};

export default ChatScreen;