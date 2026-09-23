import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function ChatScreen() {
  const { signOut } = useAuth();
  const { messages, sending, loadingHistory, sendMessage } = useChat();

  return (
    <div className="flex h-[100dvh] flex-col bg-marinho">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="font-heading text-sm font-bold text-white">Do Medo ao Play</h1>
          <p className="text-xs text-muted-foreground">Assistente de gravação</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <MessageList messages={messages} sending={sending} loadingHistory={loadingHistory} />

      <Composer onSend={sendMessage} disabled={sending || loadingHistory} />
    </div>
  );
}
