import { WebpmError } from '@webpm/error'

export function getIntegrity(dist: {
  integrity?: string
  shasum?: string
  tarball: string
}): string | undefined {
  if (dist.integrity) return dist.integrity
  if (!dist.shasum) return undefined

  // npm's legacy field is a SHA-1 hex digest (40 chars).
  if (!/^[0-9a-f]{40}$/i.test(dist.shasum)) {
    throw new WebpmError(
      'INVALID_TARBALL_INTEGRITY',
      `Tarball "${dist.tarball}" has invalid shasum specified in its metadata: ${dist.shasum}`
    )
  }

  // Equivalent of ssri.fromHex(dist.shasum, 'sha1').toString()
  return `sha1-${hexToBase64(dist.shasum)}`
}

// universal hex -> base64 (Node or Browser)
function hexToBase64(hex: string): string {
  // normalize
  const clean = hex.trim().toLowerCase()
  if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new WebpmError(
      'INVALID_TARBALL_INTEGRITY',
      `Invalid hex digest: ${hex}`
    )
  }

  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16)
  }
  let bin = ''
  // chunk to avoid call stack / arg limit
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }

  return btoa(bin)
}
