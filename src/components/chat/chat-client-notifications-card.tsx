interface NotificationsCardProps {
  isRegisteringNotifications: boolean;
  onEnableNotifications: () => void;
  notificationFeedback: string | null;
}

export function NotificationsCard({
  isRegisteringNotifications,
  onEnableNotifications,
  notificationFeedback,
}: NotificationsCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-sky-200/80 bg-sky-50/80 p-4 shadow-[0_12px_32px_rgba(14,165,233,0.08)] ring-1 ring-sky-100/80 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
            Notifications
          </p>
          <p className="text-sm text-slate-700">
            Turn on push alerts for new messages on this device.
          </p>
        </div>
        <button
          className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-500 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-sky-300"
          disabled={isRegisteringNotifications}
          onClick={onEnableNotifications}
          type="button"
        >
          {isRegisteringNotifications ? "Enabling..." : "Enable notifications"}
        </button>
      </div>
      {notificationFeedback && (
        <p className="mt-3 text-sm text-slate-600">{notificationFeedback}</p>
      )}
    </div>
  );
}
