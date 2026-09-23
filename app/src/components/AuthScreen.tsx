import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function AuthScreen() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(
        error === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error,
      );
    }
  }

  async function handleReset() {
    if (!email) {
      setError("Digite seu e-mail acima antes de pedir o link de redefinição.");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) setError(error);
    else setResetSent(true);
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-marinho px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Do Medo ao Play</h1>
          <p className="text-sm text-muted-foreground">
            Entre com o e-mail cadastrado no curso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {resetSent && (
            <p className="text-sm text-azul-aco">
              Enviamos um link de redefinição para o seu e-mail.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </Button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Esqueci minha senha
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Ainda não tem acesso? Fale com a equipe do curso para receber seu convite.
        </p>
      </div>
    </div>
  );
}
