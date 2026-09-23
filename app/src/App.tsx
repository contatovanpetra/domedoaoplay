import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthScreen } from "@/components/AuthScreen";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-marinho">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  return session ? <ChatScreen /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster theme="dark" position="top-center" richColors />
      <Gate />
    </AuthProvider>
  );
}
