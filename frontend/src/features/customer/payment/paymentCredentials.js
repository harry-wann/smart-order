const STORAGE_PREFIX = 'customer.paymentReceipt.'

// 收據查詢要的是付款當下那位 guest 的兩個權杖（X-Session-Token＋X-Guest-Token），
// 存在這個分頁的 sessionStorage，之後換桌或重新掃碼也查得到原本那筆
export function canSavePaymentCredentials(sessionToken, guestToken) {
  if (!sessionToken || !guestToken) return false

  let storage
  let probeKey
  try {
    storage = globalThis.sessionStorage
    if (!storage) return false

    const serialized = JSON.stringify({ sessionToken, guestToken })
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const probeTransactionNo = createProbeTransactionNo()
      const candidateKey = `${STORAGE_PREFIX}${probeTransactionNo}`
      if (storage.getItem(candidateKey) === null) {
        probeKey = candidateKey
        break
      }
    }
    if (!probeKey) return false

    storage.setItem(probeKey, serialized)
    const readable = storage.getItem(probeKey) === serialized
    storage.removeItem(probeKey)
    return readable && storage.getItem(probeKey) === null
  } catch {
    try {
      if (storage && probeKey) storage.removeItem(probeKey)
    } catch {
      // If storage itself is failing, the caller still fails closed before creating a payment.
    }
    return false
  }
}

export function savePaymentCredentials(transactionNo, sessionToken, guestToken) {
  if (!transactionNo || !sessionToken || !guestToken) return false

  try {
    const storage = globalThis.sessionStorage
    if (!storage) return false
    storage.setItem(
      `${STORAGE_PREFIX}${transactionNo}`,
      JSON.stringify({ sessionToken, guestToken }),
    )
    return true
  } catch {
    return false
  }
}

function createProbeTransactionNo() {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const bytes = new Uint8Array(20)
  try {
    globalThis.crypto.getRandomValues(bytes)
  } catch {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function getPaymentCredentials(transactionNo) {
  if (!transactionNo) return null

  try {
    const storage = globalThis.sessionStorage
    if (!storage) return null
    const raw = storage.getItem(`${STORAGE_PREFIX}${transactionNo}`)
    if (!raw) return null

    // 舊版只存了裝置識別碼、沒有 guestToken 的紀錄查不到收據，當作沒存
    const credentials = JSON.parse(raw)
    if (
      typeof credentials?.sessionToken !== 'string' ||
      !credentials.sessionToken ||
      typeof credentials?.guestToken !== 'string' ||
      !credentials.guestToken
    ) {
      return null
    }

    return credentials
  } catch {
    return null
  }
}
