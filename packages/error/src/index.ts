import {
  type RegistryPackageSpecifier,
  NormalizeSpecifierOptions,
} from '@webpm/types'

type VagueSpecifier = Partial<
  RegistryPackageSpecifier & NormalizeSpecifierOptions
>

export class WebpmError extends Error {
  public readonly code: string
  public readonly hint?: string
  public attempts?: number
  public prefix?: string
  public spec?: Partial<RegistryPackageSpecifier & NormalizeSpecifierOptions>
  public pkgsStack?: Array<{ id: string; name: string; version: string }>

  constructor(
    code: string,
    message: string,
    opts?: {
      attempts?: number
      hint?: string
      spec?: VagueSpecifier
      pkgsStack?: Array<{ id: string; name: string; version: string }>
    }
  ) {
    super(message)
    this.code = code.startsWith('ERR_WEBPM_') ? code : `ERR_WEBPM_${code}`
    this.hint = opts?.hint
    this.attempts = opts?.attempts
    this.spec = opts?.spec
    this.pkgsStack = opts?.pkgsStack
    this.name = 'WebpmError'
  }
}

export interface FetchErrorResponse {
  status: number
  statusText: string
}

export interface FetchErrorRequest {
  url: string
  authHeaderValue?: string
}

export class FetchError extends WebpmError {
  public readonly response: FetchErrorResponse
  public readonly request: FetchErrorRequest

  constructor(
    request: FetchErrorRequest,
    response: FetchErrorResponse,
    hint?: string
  ) {
    const _request: FetchErrorRequest = {
      url: request.url,
    }
    if (request.authHeaderValue) {
      _request.authHeaderValue = hideAuthInformation(request.authHeaderValue)
    }
    const message = `GET ${request.url}: ${response.statusText} - ${response.status}`

    // NOTE: For security reasons, some registries respond with 404 on authentication errors as well.
    // So we print authorization info on 404 errors as well.
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404
    ) {
      hint = hint ? `${hint}\n\n` : ''
      if (_request.authHeaderValue) {
        hint += `An authorization header was used: ${_request.authHeaderValue}`
      } else {
        hint += 'No authorization header was set for the request.'
      }
    }

    super(`FETCH_${response.status}`, message, { hint })
    this.request = _request
    this.response = response
    this.name = 'FetchError'
  }
}

export class ValidationError extends WebpmError {
  constructor(
    code: string,
    message: string,
    opts?: {
      hint?: string
      spec?: VagueSpecifier
    }
  ) {
    super(code, message, opts)
    this.name = 'ValidationError'
  }
}

export class PackageResolutionError extends WebpmError {
  constructor(
    code: string,
    message: string,
    opts?: {
      hint?: string
      spec?: VagueSpecifier
    }
  ) {
    super(code, message, opts)
    this.name = 'PackageResolutionError'
  }
}

// Specific error types for common scenarios
export class NoOfflineMetaError extends PackageResolutionError {
  public readonly pkgMirror: string

  constructor(spec: VagueSpecifier, pkgMirror: string) {
    super(
      'NO_OFFLINE_META',
      `Failed to resolve ${toRaw(spec)} in package mirror ${pkgMirror}`,
      {
        hint: 'This package is not available in offline mode. Check your internet connection or run without --offline flag.',
        spec,
      }
    )
    this.pkgMirror = pkgMirror
    this.name = 'NoOfflineMetaError'
  }
}

export class InvalidPackageNameError extends ValidationError {
  public readonly pkgName: string

  constructor(pkgName: string) {
    super(
      'INVALID_PACKAGE_NAME',
      `Package name ${pkgName} is invalid, it should have a @scope`,
      {
        hint: 'Scoped packages must start with @ followed by the scope name, e.g., @scope/package-name',
        spec: { name: pkgName },
      }
    )
    this.pkgName = pkgName
    this.name = 'InvalidPackageNameError'
  }
}

export class PackageNotFoundError extends PackageResolutionError {
  public readonly pkgName: string
  public readonly registry?: string

  constructor(pkgName: string, registry?: string) {
    super(
      'PACKAGE_NOT_FOUND',
      `Package '${pkgName}' not found${registry ? ` in registry ${registry}` : ''}`,
      {
        hint: 'Check the package name for typos or verify the package exists in the registry.',
        spec: { name: pkgName, registry },
      }
    )
    this.pkgName = pkgName
    this.registry = registry
    this.name = 'PackageNotFoundError'
  }
}

export class VersionNotFoundError extends PackageResolutionError {
  public readonly pkgName: string
  public readonly version: string

  constructor(pkgName: string, version: string) {
    super(
      'VERSION_NOT_FOUND',
      `Version '${version}' of package '${pkgName}' not found`,
      {
        hint: 'Check if the version exists or try using a different version or tag.',
        spec: { name: pkgName, fetchSpec: version },
      }
    )
    this.pkgName = pkgName
    this.version = version
    this.name = 'VersionNotFoundError'
  }
}

export class RegistryError extends WebpmError {
  public readonly registry: string

  constructor(
    registry: string,
    message: string,
    opts?: {
      hint?: string
      spec?: VagueSpecifier
    }
  ) {
    super('REGISTRY_ERROR', `Registry error for ${registry}: ${message}`, opts)
    this.registry = registry
    this.name = 'RegistryError'
  }
}

export class RegistryResponseError extends FetchError {
  public readonly pkgName: string

  constructor(
    request: FetchErrorRequest,
    response: FetchErrorResponse,
    pkgName: string
  ) {
    let hint: string | undefined
    if (response.status === 404) {
      hint = `${pkgName} is not in the npm registry, or you have no permission to fetch it.`
      // Check if package name looks like a version (semver pattern)
      const semverRegex =
        /(.*)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
      const matched = pkgName.match(semverRegex)
      if (matched != null) {
        hint += ` Did you mean ${matched[1]}?`
      }
    }
    super(request, response, hint)
    this.pkgName = pkgName
    this.name = 'RegistryResponseError'
  }
}

export class TarballIntegrityError extends WebpmError {
  public readonly found: string
  public readonly expected: string
  public readonly algorithm: string
  public readonly sri: string
  public readonly url: string

  constructor(opts: {
    attempts?: number
    found: string
    expected: string
    algorithm: string
    sri: string
    url: string
  }) {
    super(
      'TARBALL_INTEGRITY',
      `Got unexpected checksum for "${opts.url}". Wanted "${opts.expected}". Got "${opts.found}".`,
      {
        attempts: opts.attempts,
        hint: `This error may happen when a package is republished to the registry with the same version.
In this case, the metadata in the local cache will contain the old integrity checksum.

If you think that this is the case, then clear your cache and rerun the command that failed.`,
      }
    )
    this.found = opts.found
    this.expected = opts.expected
    this.algorithm = opts.algorithm
    this.sri = opts.sri
    this.url = opts.url
    this.name = 'TarballIntegrityError'
  }
}

export class BadTarballError extends WebpmError {
  public readonly expectedSize: number
  public readonly receivedSize: number
  public readonly tarballUrl: string

  constructor(opts: {
    attempts?: number
    expectedSize: number
    receivedSize: number
    tarballUrl: string
  }) {
    super(
      'BAD_TARBALL',
      `Bad tarball from "${opts.tarballUrl}". Expected size: ${opts.expectedSize}, received size: ${opts.receivedSize}`,
      {
        attempts: opts.attempts,
        hint: 'The tarball may be corrupted or incomplete. Try downloading it again.',
      }
    )
    this.expectedSize = opts.expectedSize
    this.receivedSize = opts.receivedSize
    this.tarballUrl = opts.tarballUrl
    this.name = 'BadTarballError'
  }
}

export class NoMatchingVersionError extends PackageResolutionError {
  public readonly packageMeta: unknown

  constructor(opts: {
    wantedDependency: { alias?: string; bareSpecifier?: string }
    packageMeta: unknown
    registry: string
  }) {
    const dep = opts.wantedDependency.alias
      ? `${opts.wantedDependency.alias}@${opts.wantedDependency.bareSpecifier ?? ''}`
      : opts.wantedDependency.bareSpecifier!
    super(
      'NO_MATCHING_VERSION',
      `No matching version found for ${dep} while fetching it from ${opts.registry}`,
      {
        hint: 'Check if the version exists or try using a different version or tag.',
        spec: opts.wantedDependency,
      }
    )
    this.packageMeta = opts.packageMeta
    this.name = 'NoMatchingVersionError'
  }
}

export class MetaFetchError extends WebpmError {
  public readonly url: string

  constructor(url: string, message: string, attempts?: number) {
    super('META_FETCH_FAIL', `GET ${url}: ${message}`, {
      attempts,
      hint: 'Failed to fetch package metadata from the registry. Check your internet connection and registry URL.',
    })
    this.url = url
    this.name = 'MetaFetchError'
  }
}

export class BrokenMetadataJsonError extends WebpmError {
  public readonly url: string

  constructor(url: string, message: string) {
    super(
      'BROKEN_METADATA_JSON',
      `Failed to parse JSON response from ${url}: ${message}`,
      {
        hint: 'The registry returned invalid JSON. This might be a temporary issue with the registry.',
      }
    )
    this.url = url
    this.name = 'BrokenMetadataJsonError'
  }
}

export class UnsupportedPlatformError extends WebpmError {
  public readonly wanted: Record<string, unknown>
  public readonly current: Record<string, unknown>
  public readonly packageId: string

  constructor(
    packageId: string,
    wanted: Record<string, unknown>,
    current: Record<string, unknown>
  ) {
    super(
      'UNSUPPORTED_PLATFORM',
      `Unsupported platform for ${packageId}: wanted ${JSON.stringify(wanted)} (current: ${JSON.stringify(current)})`,
      {
        hint: 'This package is not compatible with your current platform. Check if there are alternative packages or versions available.',
      }
    )
    this.wanted = wanted
    this.current = current
    this.packageId = packageId
    this.name = 'UnsupportedPlatformError'
  }
}

export class UnsupportedEngineError extends WebpmError {
  public readonly wanted: Record<string, unknown>
  public readonly current: Record<string, unknown>
  public readonly packageId: string

  constructor(
    packageId: string,
    wanted: Record<string, unknown>,
    current: Record<string, unknown>
  ) {
    super(
      'UNSUPPORTED_ENGINE',
      `Unsupported engine for ${packageId}: wanted: ${JSON.stringify(wanted)} (current: ${JSON.stringify(current)})`,
      {
        hint: 'This package requires a different version of Node.js or other runtime engine. Check the package documentation for requirements.',
      }
    )
    this.wanted = wanted
    this.current = current
    this.packageId = packageId
    this.name = 'UnsupportedEngineError'
  }
}

export class NetworkError extends WebpmError {
  public readonly url: string
  public readonly originalError?: Error

  constructor(url: string, message: string, originalError?: Error) {
    super('NETWORK_ERROR', `Network error while fetching ${url}: ${message}`, {
      hint: 'Check your internet connection and try again. If the problem persists, the registry might be temporarily unavailable.',
    })
    this.url = url
    this.originalError = originalError
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends WebpmError {
  public readonly url: string
  public readonly timeout: number

  constructor(url: string, timeout: number) {
    super('TIMEOUT_ERROR', `Request to ${url} timed out after ${timeout}ms`, {
      hint: 'The request took too long to complete. Try again or check your network connection.',
    })
    this.url = url
    this.timeout = timeout
    this.name = 'TimeoutError'
  }
}

export class UnpublishedPackageError extends PackageResolutionError {
  public readonly pkgName: string

  constructor(pkgName: string) {
    super(
      'UNPUBLISHED_PKG',
      `No versions available for ${pkgName} because it was unpublished`,
      {
        hint: 'This package was unpublished from the registry. Check if there are alternative packages or if the package has been republished under a different name.',
        spec: { name: pkgName },
      }
    )
    this.pkgName = pkgName
    this.name = 'UnpublishedPackageError'
  }
}

export class NoVersionsError extends PackageResolutionError {
  public readonly spec: VagueSpecifier

  constructor(pkgName: string) {
    super(
      'NO_VERSIONS',
      `No versions available for ${pkgName}. The package may be unpublished.`,
      {
        hint: 'This package has no published versions. It may be unpublished, private, or not yet published. Check the package name and registry.',
        spec: { name: pkgName },
      }
    )
    this.spec = { name: pkgName }
    this.name = 'NoVersionsError'
  }
}

function hideAuthInformation(authHeaderValue: string): string {
  const [authType, token] = authHeaderValue.split(' ')
  if (token == null) return '[hidden]'
  if (token.length < 20) {
    return `${authType} [hidden]`
  }
  return `${authType} ${token.substring(0, 4)}[hidden]`
}

function toRaw(spec: unknown): string {
  if (typeof spec === 'string') return spec
  if (spec && typeof spec === 'object') {
    const specObj = spec as Record<string, unknown>
    if (specObj.normalizedBareSpecifier)
      return String(specObj.normalizedBareSpecifier)
    if (specObj.name && specObj.fetchSpec) {
      return specObj.type === 'tag'
        ? `${specObj.name}@${specObj.fetchSpec}`
        : `${specObj.name}@${specObj.fetchSpec}`
    }
    if (specObj.name) return String(specObj.name)
  }
  return String(spec)
}

// Utility functions for error handling
export function isWebpmError(error: unknown): error is WebpmError {
  return error instanceof WebpmError
}

export function isFetchError(error: unknown): error is FetchError {
  return error instanceof FetchError
}

export function isPackageResolutionError(
  error: unknown
): error is PackageResolutionError {
  return error instanceof PackageResolutionError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isRegistryError(error: unknown): error is RegistryError {
  return error instanceof RegistryError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

export function isTarballIntegrityError(
  error: unknown
): error is TarballIntegrityError {
  return error instanceof TarballIntegrityError
}

export function isNoMatchingVersionError(
  error: unknown
): error is NoMatchingVersionError {
  return error instanceof NoMatchingVersionError
}

export function isPackageNotFoundError(
  error: unknown
): error is PackageNotFoundError {
  return error instanceof PackageNotFoundError
}

export function isVersionNotFoundError(
  error: unknown
): error is VersionNotFoundError {
  return error instanceof VersionNotFoundError
}

export function isUnsupportedPlatformError(
  error: unknown
): error is UnsupportedPlatformError {
  return error instanceof UnsupportedPlatformError
}

export function isUnsupportedEngineError(
  error: unknown
): error is UnsupportedEngineError {
  return error instanceof UnsupportedEngineError
}

export function isUnpublishedPackageError(
  error: unknown
): error is UnpublishedPackageError {
  return error instanceof UnpublishedPackageError
}

export function isNoVersionsError(error: unknown): error is NoVersionsError {
  return error instanceof NoVersionsError
}
