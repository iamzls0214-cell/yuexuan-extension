/**
 * Backward-compat shim — delegates to shared/translations.ts.
 * @deprecated Import from '../shared/translations' directly.
 */
import {
  translateKeyword,
  extractCategoryFromViTitle,
  importTranslations as importTranslationsShared,
} from './translations'

/** @deprecated Use translateKeyword(keyword, 'VN') from translations.ts */
export function translateToVietnamese(keyword: string): string {
  return translateKeyword(keyword, 'VN')
}

export { extractCategoryFromViTitle }

/** @deprecated Use importTranslations('VN', external) from translations.ts */
export function importTranslations(external: Record<string, string>): void {
  importTranslationsShared('VN', external)
}

/** @deprecated Use translations.ts TRANSLATIONS directly */
export const VI_TRANSLATIONS: Record<string, string> = {}
