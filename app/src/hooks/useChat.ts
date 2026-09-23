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

const MAX_IMAGE_DIMENSION = 1568;
const IMAGE_QUALITY = 0.85;

// Fotos de celular podem vir com vários MB e resolução alta o bastante pra
// estourar o limite de 10MB (base64) da API — redimensiona antes de enviar
// pra garantir upload rápido e confiável (o servidor ainda ajusta o tamanho
// final por conta própria, então isso não precisa ser exato).
function resizeImageForUpload(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!ctx) {
        reject(new Error("Canvas 2D não suportado neste navegador."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Não foi possível processar a imagem."));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve({ data: result.split(",")[1] ?? "", mediaType: "image/jpeg" });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        IMAGE_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = objectUrl;
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
        const image = imageFile ? await resizeImageForUpload(imageFile) : undefined;

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
