import React from "react";

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
    <section className="flex min-h-0 flex-col rounded-[2rem] border border-black/5 bg-white/80 p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">Users</h2>
        <p className="text-sm text-slate-500">Start a direct conversation.</p>
      </div>
      {availableUsers.length === 0 ? (
        <p className="text-sm text-slate-500">No registered users yet.</p>
      ) : (
        <ul className="flex-1 space-y-3 overflow-y-auto pr-1">
          {availableUsers.map((user) => (
            <li key={user.uid}>
              <button
                className="w-full rounded-2xl border border-black/5 bg-stone-50 px-4 py-3 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/60"
                onClick={() => onStartConversation(user.uid)}
                type="button"
              >
                <span className="block font-medium text-slate-900">
                  {user.displayName}
                </span>
                <span className="block text-sm text-slate-500">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

