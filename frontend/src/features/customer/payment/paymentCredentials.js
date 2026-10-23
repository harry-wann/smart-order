const STORAGE_PREFIX = 'customer.paymentReceipt.'

export function canSavePaymentCredentials(sessionToken, deviceId) {
  if (!sessionToken || !deviceId) return false

  let storage
  let probeKey
  try {
    storage = globalThis.sessionStorage
    if (!storage) return false

    const serialized = JSON.stringify({ sessionToken, deviceId })
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

export function savePaymentCredentials(transactionNo, sessionToken, deviceId) {
  if (!transactionNo || !sessionToken || !deviceId) return false

  try {
    const storage = globalThis.sessionStorage
    if (!storage) return false
    storage.setItem(
      `${STORAGE_PREFIX}${transactionNo}`,
      JSON.stringify({ sessionToken, deviceId }),
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

    const credentials = JSON.parse(raw)
    if (
      typeof credentials?.sessionToken !== 'string' ||
      !credentials.sessionToken ||
      typeof credentials?.deviceId !== 'string' ||
      !credentials.deviceId
    ) {
      return null
    }

    return credentials
  } catch {
    return null
  }
}
