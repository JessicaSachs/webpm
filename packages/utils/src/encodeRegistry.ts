import memoize from 'memoize'

export default memoize(encodeRegistry)

function encodeRegistry(registry: string): string {
  if (!registry) {
    throw new Error('`registry` is required')
  }
  if (typeof registry !== 'string') {
    throw new Error('`registry` should be a string')
  }
  const host = getHost(registry)
  return escapeHost(host)
}

function escapeHost(host: string): string {
  return host.replace(':', '+')
}

function getHost(rawUrl: string): string {
  let urlObj: URL
  try {
    urlObj = new URL(rawUrl)
  } catch (err) {
    throw new Error(
      `Failed to parse registry URL "${rawUrl}": ${(err as Error).message}`
    )
  }
  if (!urlObj || !urlObj.host) {
    throw new Error(`Couldn't get host from ${rawUrl}`)
  }
  return urlObj.host
}
