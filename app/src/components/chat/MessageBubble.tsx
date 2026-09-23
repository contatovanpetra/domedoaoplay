import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-azul-aco text-white rounded-br-sm"
            : "bg-card text-card-foreground rounded-bl-sm",
        )}
      >
        {message.imagePreview && (
          <img
            src={message.imagePreview}
            alt="Foto enviada"
            className="mb-2 max-h-48 rounded-md object-cover"
          />
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
