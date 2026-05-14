"use client";

import React, { useEffect, useMemo, useState } from "react";

type CreateGroupModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  users: Array<{
    uid: string;
    displayName: string;
    email: string;
  }>;
  onClose: () => void;
  onCreateGroup: (input: { groupName: string; memberIds: string[] }) => Promise<void>;
};

export function CreateGroupModal({
  isOpen,
  isSubmitting,
  users,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setSelectedMemberIds([]);
      setNameError(null);
      setMemberError(null);
    }
  }, [isOpen]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.displayName || a.email).localeCompare(b.displayName || b.email),
      ),
    [users],
  );

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextGroupName = groupName.trim();
    const nextNameError = nextGroupName ? null : "Enter a group name.";
    const nextMemberError =
      selectedMemberIds.length > 0 ? null : "Choose at least one member.";

    setNameError(nextNameError);
    setMemberError(nextMemberError);

    if (nextNameError || nextMemberError) {
      return;
    }

    await onCreateGroup({
      groupName: nextGroupName,
      memberIds: selectedMemberIds,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Create group</h2>
            <p className="text-sm text-slate-500">
              Pick a name and choose who should join this chat.
            </p>
          </div>
          <button
            aria-label="Close group modal"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="group-name">
              Group name
            </label>
            <input
              id="group-name"
              aria-label="Group name"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              disabled={isSubmitting}
              onChange={(event) => {
                setNameError(null);
                setGroupName(event.target.value);
              }}
              value={groupName}
            />
            {nameError ? <p className="text-sm font-medium text-rose-500">{nameError}</p> : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Members</p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {sortedUsers.map((user) => {
                const checked = selectedMemberIds.includes(user.uid);

                return (
                  <label
                    key={user.uid}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-all hover:border-sky-200 hover:bg-sky-50/40"
                  >
                    <input
                      aria-label={user.displayName}
                      checked={checked}
                      className="h-4 w-4 accent-sky-600"
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setMemberError(null);
                        setSelectedMemberIds((current) =>
                          event.target.checked
                            ? [...current, user.uid]
                            : current.filter((memberId) => memberId !== user.uid),
                        );
                      }}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {user.displayName}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {memberError ? (
              <p className="text-sm font-medium text-rose-500">{memberError}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating..." : "Create group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
