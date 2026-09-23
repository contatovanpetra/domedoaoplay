import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";
import { corsHeaders } from "../_shared/cors.ts";

// Modelo padrão: Claude Opus 5. Para um assistente de altíssimo volume,
// claude-sonnet-5 custa bem menos ($2/$10 por MTok vs $5/$25) com boa
// qualidade — troque via variável de ambiente MODEL se fizer sentido pro seu caso.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5";
const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 20;

const SYSTEM_PROMPT = `Você é o assistente de gravação do curso "Do Medo ao Play", da Vitória Caroline — um curso que ensina, degrau a degrau, a se comunicar diante da câmera para vender, divulgar trabalho, criar conteúdo ou atuar como afiliado.

Você ajuda o aluno em cinco frentes, conforme o que ele mandar:

1. ANÁLISE DE SETUP (quando vier uma foto do local de gravação): avalie áudio (eco, ruído, distância sugerida do microfone/celular), luz (fonte, direção, o que ajustar), altura da câmera (nível dos olhos, ângulo) e apoio/estabilidade (tripé ou apoio improvisado). Dê no máximo 2-3 ajustes prioritários — nunca uma lista exaustiva.
2. TEMA E PALAVRAS-CHAVE: ajude a sair do genérico para um recorte específico, e sugira palavras-chave ou ganchos para o roteiro.
3. REVISÃO DE ROTEIRO: dê feedback objetivo sobre clareza, gancho de abertura, tamanho e próximo passo — sem reescrever tudo por ele.
4. TREINO DE VOZ E DICÇÃO (quando vier uma fala transcrita): aponte ritmo, pausas, vícios de linguagem ("então", "tipo", "né") e clareza, de forma construtiva.
5. DÚVIDAS DE TÉCNICA: responda de forma direta e prática.

Tom de voz: acolhedor, direto e prático — como alguém que já passou pelo mesmo medo e agora orienta com clareza. Nunca prometa que o aluno "nunca mais vai travar" ou garanta resultado; ofereça sempre um próximo passo realizável. Respostas curtas e específicas, nunca genéricas. Responda sempre em português do Brasil, em markdown simples (parágrafos curtos e listas quando ajudar).`;

interface ChatRequestBody {
  conversationId: string | null;
  message: string;
  image?: { data: string; mediaType: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Não autenticado.", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonError("Sessão inválida.", 401);
    }
    const userId = userData.user.id;

    const body: ChatRequestBody = await req.json();
    const message = (body.message ?? "").slice(0, MAX_MESSAGE_LENGTH);
    if (!message.trim() && !body.image) {
      return jsonError("Mensagem vazia.", 400);
    }

    let conversationId = body.conversationId;
    if (conversationId) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!existing) conversationId = null;
    }

    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: message.slice(0, 60) || "Foto de setup" })
        .select("id")
        .single();
      if (createError) throw createError;
      conversationId = created.id;
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(HISTORY_LIMIT);

    const userContentForStorage = message.trim() || "[foto do setup de gravação]";

    const { data: userMessage, error: userMsgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "user", content: userContentForStorage })
      .select("id, role, content, created_at")
      .single();
    if (userMsgError) throw userMsgError;

    const apiMessages: Anthropic.MessageParam[] = (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const currentContent: any[] = [];
    if (body.image) {
      currentContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: body.image.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: body.image.data,
        },
      });
    }
    currentContent.push({ type: "text", text: message.trim() || "Analise essa foto do meu setup de gravação." });
    apiMessages.push({ role: "user", content: currentContent });

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY não configurada.");
      return jsonError("Assistente ainda não configurado. Fale com o suporte do curso.", 500);
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      messages: apiMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const replyText =
      textBlock && "text" in textBlock
        ? textBlock.text
        : "Não consegui gerar uma resposta agora. Tenta reformular?";

    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, role: "assistant", content: replyText })
      .select("id, role, content, created_at")
      .single();
    if (assistantMsgError) throw assistantMsgError;

    return new Response(
      JSON.stringify({ conversationId, userMessage, assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("chat function error:", err);
    return jsonError("Algo deu errado no assistente. Tenta de novo.", 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
