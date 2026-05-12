import { EmailVerificationCard } from "@/components/auth/email-verification-card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import { ChatClient } from "@/components/chat/chat-client";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <main className="flex h-[100dvh] flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <EmailVerificationCard />
        <TwoFactorSettings />
        <div className="flex min-h-0 flex-1 w-full flex-col bg-transparent p-0">
          <ChatClient />
        </div>
      </main>
    </ProtectedRoute>
  );
}
