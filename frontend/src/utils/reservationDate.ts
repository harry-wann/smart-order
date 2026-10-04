const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const DAY_MS = 24 * 60 * 60 * 1000

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatDateWithWeekday(date: Date) {
  return `${formatShortDate(date)}（${WEEKDAYS[date.getDay()]}）`
}

export function formatDateCode(date: Date) {
  return [date.getFullYear() % 100, date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('')
}

export function getDayOffset(date: Date, fromDate = startOfToday()) {
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const fromDateUtc = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  return Math.round((dateUtc - fromDateUtc) / DAY_MS)
}
