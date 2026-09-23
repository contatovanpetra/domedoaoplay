import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  createdAt: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    (async () => {
      try {
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1);
        if (convError) throw convError;

        const latest = conversations?.[0]?.id ?? null;
        if (latest) {
          setConversationId(latest);
          const { data: rows, error: msgError } = await supabase
            .from("messages")
            .select("id, role, content, created_at")
            .eq("conversation_id", latest)
            .order("created_at", { ascending: true });
          if (msgError) throw msgError;

          setMessages(
            (rows ?? []).map((r) => ({
              id: r.id,
              role: r.role as "user" | "assistant",
              content: r.content,
              createdAt: r.created_at,
            })),
          );
        }
      } catch (err) {
        console.error(err);
        toast.error("Não consegui carregar o histórico. Você ainda pode enviar mensagens novas.");
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  const sendMessage = useCallback(
    async (text: string, imageFile: File | null) => {
      if (!text.trim() && !imageFile) return;
      setSending(true);

      const tempId = crypto.randomUUID();
      const imagePreview = imageFile ? URL.createObjectURL(imageFile) : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          role: "user",
          content: text,
          imagePreview,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const image = imageFile
          ? { data: await fileToBase64(imageFile), mediaType: imageFile.type }
          : undefined;

        const { data, error } = await supabase.functions.invoke("chat", {
          body: { conversationId, message: text, image },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: data.assistantMessage.id,
            role: "assistant",
            content: data.assistantMessage.content,
            createdAt: data.assistantMessage.created_at,
          },
        ]);
      } catch (err) {
        console.error(err);
        toast.error("Não consegui responder agora. Tenta de novo em instantes.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        setSending(false);
      }
    },
    [conversationId],
  );

  return { messages, sending, loadingHistory, sendMessage };
}
