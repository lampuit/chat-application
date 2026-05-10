import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChatClient } from "@/components/chat/chat-client";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex w-full flex-col gap-6 rounded-[2rem] bg-transparent p-0">
          <ChatClient />
        </div>
      </main>
    </ProtectedRoute>
  );
}
