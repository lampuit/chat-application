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
  isLoading: boolean;
  users: Array<{
    uid: string;
    displayName: string;
    email: string;
  }>;
  onStartConversation: (userId: string) => void;
  onOpenCreateGroup: () => void;
};

export function UserList({
  currentUserId,
  isLoading,
  users,
  onStartConversation,
  onOpenCreateGroup,
}: UserListProps) {
  const availableUsers = users.filter((user) => user.uid !== currentUserId);

  return (
    <section className="flex min-h-0 flex-col rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.78)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl ring-1 ring-slate-900/5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600">People</p>
          <h2 className="heading-font text-xl font-semibold tracking-[-0.04em] text-slate-950">Directory</h2>
          <p className="text-sm text-slate-500">Find people to chat with.</p>
        </div>
        <button
          className="rounded-full bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
          onClick={onOpenCreateGroup}
          type="button"
        >
          New group
        </button>
      </div>
      {isLoading ? (
        <div
          className="flex flex-1 flex-col gap-3 overflow-hidden"
          data-testid="user-list-skeleton"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`user-skeleton-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/5 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : availableUsers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/45">
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
                  className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                  onClick={() => onStartConversation(user.uid)}
                  type="button"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 text-sm font-semibold text-teal-800 ring-1 ring-inset ring-teal-200/70">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-950 transition-colors group-hover:text-teal-700">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {user.email}
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 opacity-0 transition-all group-hover:bg-teal-50 group-hover:text-teal-700 group-hover:opacity-100">
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
