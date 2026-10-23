import { useEffect, useState } from 'react'

// 驗證碼要太多次（429 TOO_MANY_ATTEMPTS）之後的倒數：start(秒數) 開始倒數，secondsLeft 是還剩幾秒，0 就是可以再試。
// 記的是「幾點可以再試」，每秒拿現在時間重算剩幾秒，不是每秒減 1；
// 手機切到背景時計時器會變慢，回到畫面時秒數還是對的
export function useRetryCountdown() {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until <= Date.now()) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])

  function start(seconds: number) {
    const current = Date.now()
    setNow(current)
    setUntil(current + seconds * 1000)
  }

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000))
  return { secondsLeft, start }
}

// 600 → "10:00"、59 → "0:59"
export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
