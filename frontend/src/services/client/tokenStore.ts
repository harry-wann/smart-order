export const customerTokens = {
  member: createTokenSlot('customer.memberToken'),
  session: createTokenSlot('customer.sessionToken'),
  // join 時後端簽發的同桌身分權杖（X-Guest-Token），跟 session 一起存、一起清
  guest: createTokenSlot('customer.guestToken'),
}

export const employeeToken = createTokenSlot('employee.token')

// 裝置識別碼只當提示送給後端（顯示／診斷），不能用來證明身分；身分看 guest token
export function getDeviceId() {
  const saved = read(DEVICE_ID_KEY)
  if (saved) return saved

  const id = createUuid()
  write(DEVICE_ID_KEY, id)
  return id
}

const DEVICE_ID_KEY = 'customer.deviceId'

// localStorage 被瀏覽器封鎖時，至少在這個分頁內維持同一組值
const memory = new Map<string, string>()

function createTokenSlot(key: string) {
  return {
    get: () => read(key),
    set: (value: string) => write(key, value),
    clear: () => remove(key),
  }
}

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string) {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

function remove(key: string) {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    return
  }
}

// crypto.randomUUID 只在 https 或 localhost 可用，手機連區網 IP 測試時改用 getRandomValues 組
function createUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
