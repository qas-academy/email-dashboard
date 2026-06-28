export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

type DateInput = string | number | Date | null | undefined;

const vietnamDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const vietnamDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDate(value: DateInput) {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getParts(
  formatter: Intl.DateTimeFormat,
  date: Date
): Record<string, string> {
  return formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

export function formatVietnamDate(value: DateInput, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;

  const parts = getParts(vietnamDateFormatter, date);
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatVietnamDateTime(value: DateInput, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;

  const parts = getParts(vietnamDateTimeFormatter, date);
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

export function getVietnamDateKey(value: DateInput = new Date()) {
  const date = toDate(value) ?? new Date();
  const parts = getParts(vietnamDateFormatter, date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + days)
  );

  return date.toISOString().split("T")[0];
}

export function addMonthsToDateKey(dateKey: string, months: number) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1 + months, Number(day))
  );

  return date.toISOString().split("T")[0];
}

export function vietnamDateKeyToUtcISOString(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date().toISOString();

  const [, year, month, day] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), -7)
  ).toISOString();
}

export function formatVietnamDateTimeLocalInput(value: DateInput, fallback = "") {
  const date = toDate(value);
  if (!date) return fallback;

  const parts = getParts(vietnamDateTimeFormatter, date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function vietnamDateTimeLocalInputToISOString(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) return "";

  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
