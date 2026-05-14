import { AuthSetupToast } from "@/components/auth/auth-setup-toast";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChatClient } from "@/components/chat/chat-client";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <main className="flex h-[100dvh] flex-col gap-4 overflow-hidden p-4 sm:p-6 lg:p-8">
        <AuthSetupToast />
        <div className="flex min-h-0 flex-1 w-full flex-col bg-transparent p-0">
          <ChatClient />
        </div>
      </main>
    </ProtectedRoute>
  );
}
