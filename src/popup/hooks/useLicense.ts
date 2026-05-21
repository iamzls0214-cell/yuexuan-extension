import { useState, useEffect } from 'react'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'
import type { License } from '../../shared/types'

export function useLicense() {
  const [license, setLicense] = useState<License | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEYS.LICENSE).then((result) => {
      const stored = result[STORAGE_KEYS.LICENSE] as License | undefined
      if (stored) {
        // Check expiration
        if (stored.expiresAt && Date.now() > stored.expiresAt) {
          setLicense({ ...stored, _expired: true } as License)
        } else {
          setLicense(stored)
        }
      }
      setLoading(false)
    })
  }, [])

  const isActivated = !!license && !(license as License & { _expired?: boolean })._expired
  const isExpired = !!(license as License & { _expired?: boolean })?._expired

  return { license, isActivated, isExpired, loading }
}
