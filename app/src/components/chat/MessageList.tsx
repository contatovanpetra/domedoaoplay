import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { Loader2 } from "lucide-react";

const SUGESTOES = [
  "Manda uma foto de onde você vai gravar hoje",
  "Me ajuda a escolher um tema pro próximo vídeo",
  "Revisa esse roteiro antes de eu gravar",
  "Treinar minha dicção numa fala curta",
];

export function MessageList({
  messages,
  sending,
  loadingHistory,
}: {
  messages: ChatMessage[];
  sending: boolean;
  loadingHistory: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  if (loadingHistory) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="font-heading text-lg font-semibold text-white">
          Sobre o que vamos trabalhar hoje?
        </h2>
        <div className="grid w-full max-w-sm gap-2">
          {SUGESTOES.map((s) => (
            <div
              key={s}
              className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs text-muted-foreground"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {sending && (
        <div className="flex justify-start">
          <div className="rounded-lg rounded-bl-sm bg-card px-4 py-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
