import { ref, computed } from 'vue'
import { webpm } from '@webpm/webpm'
import type {
  InstallationResult,
  UntarProgressEvent,
  ParsedPackageJson,
  DependencyCount,
  InstalledPackage,
} from '../types/package-manager'

export function usePackageJsonInstallation(
  packageJsonContent: string | undefined,
  onProgress?: (event: UntarProgressEvent) => void,
  onInstallationResult?: (result: InstallationResult) => void
) {
  // State
  const isInstalling = ref(false)
  const error = ref('')
  const installResult = ref<InstallationResult | null>(null)
  const installedPackages = ref<InstalledPackage[]>([])
  const fetchedPackages = ref<any[]>([])

  // Computed properties
  const parsedPackageJson = computed<ParsedPackageJson | null>(() => {
    if (!packageJsonContent) return null
    try {
      return JSON.parse(packageJsonContent)
    } catch {
      return null
    }
  })

  const dependencyCount = computed<DependencyCount>(() => {
    const pkg = parsedPackageJson.value
    if (!pkg) return { dependencies: 0, devDependencies: 0 }

    return {
      dependencies: pkg.dependencies ? Object.keys(pkg.dependencies).length : 0,
      devDependencies: pkg.devDependencies
        ? Object.keys(pkg.devDependencies).length
        : 0,
    }
  })

  const totalDependencies = computed(() => {
    return (
      dependencyCount.value.dependencies + dependencyCount.value.devDependencies
    )
  })

  const hasDependencies = computed(() => {
    return totalDependencies.value > 0
  })

  // Methods
  const installFromPackageJson = async () => {
    if (!parsedPackageJson.value) {
      error.value = 'Invalid package.json content'
      return
    }

    if (!hasDependencies.value) {
      error.value = 'No dependencies found in package.json'
      return
    }

    // Clear previous results
    error.value = ''
    installResult.value = null
    isInstalling.value = true

    try {
      // Use the new library API with proper untar handling
      const result = await webpm.installWithUntarHandler(
        parsedPackageJson.value,
        {
          onProgress: (event: UntarProgressEvent) => {
            // Forward progress events to parent
            if (onProgress) {
              onProgress(event)
            }
          },
          onComplete: (result: InstallationResult) => {
            // Update local state with final results
            installResult.value = result

            // Update installed packages list
            installedPackages.value = result.allPackages.map((pkg: any) => {
              const manifest =
                (pkg.extractedFiles.manifest as Record<string, any>) || {}
              return {
                name: manifest.name || pkg.package.name,
                version: manifest.version || pkg.package.version,
                files: pkg.extractedFiles.files.length,
              }
            })

            // Update fetched packages for file explorer
            fetchedPackages.value = result.allPackages

            // Notify parent with complete results
            if (onInstallationResult) {
              onInstallationResult(result)
            }
          },
          onError: (err: Error) => {
            error.value = err.message
          },
        },
        {
          // Include devDependencies by default when installing from package.json
          includeDevDependencies: true,
          includeOptionalDependencies: true,
          includePeerDependencies: false,
          autoInstallPeers: false,
        }
      )

      // The result is also returned directly, so we can use it here too
      console.log(
        `Installation completed successfully: ${result.totalPackages} packages, ${result.totalFiles} files`
      )
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'An unexpected error occurred'
    } finally {
      isInstalling.value = false
    }
  }

  return {
    // State
    isInstalling,
    error,
    installResult,
    installedPackages,
    fetchedPackages,

    // Computed
    parsedPackageJson,
    dependencyCount,
    totalDependencies,
    hasDependencies,

    // Methods
    installFromPackageJson,
  }
}
