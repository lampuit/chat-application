import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChatClient } from "@/components/chat/chat-client";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen p-6">
        <div className="w-full max-w-5xl rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,32,0.08)]">
          <ChatClient />
        </div>
      </main>
    </ProtectedRoute>
  );
}
