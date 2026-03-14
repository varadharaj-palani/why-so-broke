import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

const IST = 'Asia/Kolkata'

export function formatDate(dateStr: string): string {
  return dayjs(dateStr).tz(IST).format('DD MMM YYYY')
}

export function formatDateTime(dateStr: string): string {
  return dayjs(dateStr).tz(IST).format('DD MMM YYYY, h:mm A')
}

export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num)
}

export function currentMonth(): string {
  return dayjs().tz(IST).format('YYYY-MM')
}

export function formatMonth(monthStr: string): string {
  return dayjs(monthStr + '-01').format('MMMM YYYY')
}
