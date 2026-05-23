export function isSameLocalDate(dateA: Date | null | undefined, dateB: Date | null | undefined) {
  if (!dateA || !dateB) {
    return false;
  }

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatLocalDate(date: Date) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function getDateSeparatorLabel(date: Date, now = new Date()) {
  if (isSameLocalDate(date, now)) {
    return "Hôm nay";
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (isSameLocalDate(date, yesterday)) {
    return "Hôm qua";
  }

  return formatLocalDate(date);
}
