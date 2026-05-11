import React from "react";

const MessageSquarePlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M12 7v6"/>
    <path d="M9 10h6"/>
  </svg>
);

type UserListProps = {
  currentUserId: string;
  users: Array<{
    uid: string;
    displayName: string;
    email: string;
  }>;
  onStartConversation: (userId: string) => void;
};

export function UserList({
  currentUserId,
  users,
  onStartConversation,
}: UserListProps) {
  const availableUsers = users.filter((user) => user.uid !== currentUserId);

  return (
    <section className="flex min-h-0 flex-col rounded-[2rem] border border-black/5 bg-white/60 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Directory</h2>
        <p className="text-sm text-slate-500">Find people to chat with.</p>
      </div>
      {availableUsers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm text-slate-500">No registered users yet.</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {availableUsers.map((user) => {
            const initials = user.displayName
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "U";
            
            return (
              <li key={user.uid}>
                <button
                  className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition-all hover:bg-white hover:shadow-sm"
                  onClick={() => onStartConversation(user.uid)}
                  type="button"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900 transition-colors group-hover:text-indigo-600">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {user.email}
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 opacity-0 transition-all group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:opacity-100">
                    <MessageSquarePlusIcon />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
