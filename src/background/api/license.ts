/**
 * License verification using HMAC-SHA256 (Web Crypto API).
 * The secret key is hardcoded in the background worker.
 * Replace SECRET with your actual key before building for production.
 */

// Hardcoded HMAC secret — change this per build
const SECRET = 'yuexuan-prod-secret-key-2026'

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Verify a license key. Key format: XXXX-XXXX-XXXX-XXXX (16 hex chars + dashes)
 */
export async function verifyLicense(key: string): Promise<boolean> {
  try {
    const cleanKey = key.replace(/-/g, '')
    if (cleanKey.length !== 16 || !/^[0-9A-Fa-f]+$/.test(cleanKey)) {
      return false
    }

    const encoder = new TextEncoder()
    const keyData = encoder.encode(SECRET)
    const messageData = encoder.encode('yuexuan-license')

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    )

    // For verification: the key is the HMAC signature of the message
    const expectedSignature = hexToUint8Array(cleanKey)

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      expectedSignature,
      messageData,
    )

    return isValid
  } catch {
    return false
  }
}

/**
 * Generate a license key (for admin use only, not exposed in production).
 */
export async function generateLicense(): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SECRET)
  const messageData = encoder.encode('yuexuan-license')

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const hex = uint8ArrayToHex(new Uint8Array(signature)).slice(0, 16)

  // Format: XXXX-XXXX-XXXX-XXXX
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
}
