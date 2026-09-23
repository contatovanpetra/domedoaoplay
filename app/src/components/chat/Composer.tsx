import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createDictation, isSpeechRecognitionSupported } from "@/lib/speech";
import type { SpeechRecognitionLike } from "@/lib/speech";
import { Camera, Mic, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSend: (text: string, image: File | null) => void;
  disabled: boolean;
}

export function Composer({ onSend, disabled }: ComposerProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function removeImage() {
    setImage(null);
    setImagePreview(null);
  }

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = createDictation(
      (transcript) => setText(transcript),
      () => setRecording(false),
    );
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function handleSend() {
    if (disabled || (!text.trim() && !image)) return;
    onSend(text.trim(), image);
    setText("");
    removeImage();
  }

  return (
    <div className="border-t border-border bg-marinho p-3">
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img src={imagePreview} alt="Prévia" className="h-16 w-16 rounded-md object-cover" />
          <button
            onClick={removeImage}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
            aria-label="Remover foto"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Anexar foto do local de gravação"
        >
          <Camera className="w-5 h-5" />
        </Button>

        {isSpeechRecognitionSupported() && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleRecording}
            disabled={disabled}
            aria-label={recording ? "Parar gravação" : "Ditar mensagem por voz"}
            className={cn(recording && "bg-destructive text-white animate-pulse")}
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva, ou anexe uma foto do seu setup..."
          rows={1}
          className="max-h-32 min-h-[44px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          aria-label="Enviar"
        >
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
