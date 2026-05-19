import { useState, useEffect } from 'react'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'
import type { License } from '../../shared/types'

export function useLicense() {
  const [license, setLicense] = useState<License | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEYS.LICENSE).then((result) => {
      if (result[STORAGE_KEYS.LICENSE]) {
        setLicense(result[STORAGE_KEYS.LICENSE] as License)
      }
      setLoading(false)
    })
  }, [])

  const isActivated = !!license

  return { license, isActivated, loading }
}
