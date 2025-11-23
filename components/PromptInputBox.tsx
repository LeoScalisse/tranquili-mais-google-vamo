import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUpIcon, Paperclip, Square, X, Mic, Globe, BrainCogIcon, FolderCodeIcon } from "./ui/Icons";

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Embedded CSS for minimal custom styles
const styles = `
  *:focus-visible {
    outline-offset: 0 !important;
    --ring-offset: 0 !important;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

// Textarea Component
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// Simple Image Preview Dialog
const ImageViewDialog: React.FC<{ imageUrl: string | null; onClose: () => void; }> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0" />
      <div
        className="relative bg-transparent rounded-2xl overflow-hidden shadow-2xl max-w-[90vw] md:max-w-[800px]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Full preview"
          className="w-full max-h-[80vh] object-contain rounded-2xl"
        />
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033] transition-all">
          <X className="h-5 w-5 text-gray-200 hover:text-white" />
        </button>
      </div>
    </div>
  );
};

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
    />
  </div>
);

// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  onMicClick?: () => void;
}
export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const { onSend = () => {}, isLoading = false, placeholder = "Type your message here...", className, onMicClick } = props;
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const scrollHeight = textareaRef.current.scrollHeight;
    const maxHeight = 240;
    textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [input]);

  const handleToggleChange = (value: 'search' | 'think' | 'canvas') => {
    if (value === "search") {
      setShowSearch((prev) => !prev);
      if (!showSearch) { setShowThink(false); setShowCanvas(false); }
    } else if (value === "think") {
      setShowThink((prev) => !prev);
      if (!showThink) { setShowSearch(false); setShowCanvas(false); }
    } else if (value === 'canvas') {
      setShowCanvas((prev) => !prev);
      if (!showCanvas) { setShowSearch(false); setShowThink(false); }
    }
  };

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const processFile = (file: File) => {
    if (!isImageFile(file)) return;
    if (file.size > 10 * 1024 * 1024) return;
    setFiles([file]);
    const reader = new FileReader();
    reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (index: number) => {
    setFilePreviews({});
    setFiles([]);
  };

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      let messagePrefix = "";
      if (showSearch) messagePrefix = "[Search: ";
      else if (showThink) messagePrefix = "[Think: ";
      else if (showCanvas) messagePrefix = "[Canvas: ";

      const formattedInput = messagePrefix ? `${messagePrefix}${input}]` : input;
      onSend(formattedInput, files);
      setInput("");
      setFiles([]);
      setFilePreviews({});
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = input.trim() !== "" || files.length > 0;

  return (
    <>
      <div
        ref={ref}
        className={cn(
          "rounded-3xl border border-zinc-600 bg-zinc-700 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
          className
        )}
      >
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 p-0 pb-1">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                {file.type.startsWith("image/") && filePreviews[file.name] && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedImage(filePreviews[file.name])}>
                    <img src={filePreviews[file.name]} alt={file.name} className="h-full w-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(index); }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Textarea
            ref={textareaRef}
            placeholder={
              showSearch ? "Buscar na web..." :
              showThink ? "Pensar profundamente..." :
              showCanvas ? "Descreva a imagem..." :
              placeholder
            }
            className="text-base"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
        />

        <div className="flex items-center justify-between gap-2 p-0 pt-2">
          <div className="flex items-center gap-1">
            <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-8 w-8 text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]"
                disabled={isLoading}
              >
                <Paperclip className="h-5 w-5" />
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
                    if (e.target) e.target.value = "";
                  }}
                  accept="image/*"
                />
            </button>
            <button
              onClick={() => handleToggleChange("search")}
              className={cn("rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                showSearch ? "bg-[#1EAEDB]/15 border-[#1EAEDB] text-[#1EAEDB]" : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
              )}
            >
              <Globe className="w-4 h-4" />
              {showSearch && <span className="text-xs">Busca</span>}
            </button>
            <CustomDivider />
            <button
              onClick={() => handleToggleChange("think")}
              className={cn("rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                showThink ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#8B5CF6]" : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
              )}
            >
              <BrainCogIcon className="w-4 h-4" />
              {showThink && <span className="text-xs">Pensa</span>}
            </button>
            <CustomDivider />
            <button
              onClick={() => handleToggleChange("canvas")}
              className={cn("rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                showCanvas ? "bg-[#F97316]/15 border-[#F97316] text-[#F97316]" : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
              )}
            >
              <FolderCodeIcon className="w-4 h-4" />
              {showCanvas && <span className="text-xs">Criador de Imagens</span>}
            </button>
          </div>

          <button
            className={cn("h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center",
              hasContent ? "bg-white hover:bg-white/80 text-[#1F2023]" : "bg-transparent hover:bg-gray-600/30 text-[#9CA3AF] hover:text-[#D1D5DB]"
            )}
            onClick={() => {
              if (hasContent) handleSubmit();
              else onMicClick?.();
            }}
            disabled={isLoading && !hasContent}
            aria-label={hasContent ? 'Enviar mensagem' : 'Iniciar conversa por voz'}
          >
            {isLoading ? <Square className="h-4 w-4 fill-[#1F2023] animate-pulse" /> : hasContent ? <ArrowUpIcon className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
});
PromptInputBox.displayName = "PromptInputBox";