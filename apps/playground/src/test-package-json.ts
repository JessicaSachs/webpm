// Test file to verify package.json resolution functionality
import { webpm, type PackageJsonManifest } from '@webpm/webpm'

// Test package.json resolution functionality
export async function testPackageJsonResolution() {
  try {
    console.log('Testing webpm package.json resolution...')

    // Sample package.json with various dependency types
    const packageJson: PackageJsonManifest = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        lodash: '^4.17.21',
        semver: '^7.5.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
      optionalDependencies: {
        fsevents: '^2.3.2',
      },
      peerDependencies: {
        react: '>=16.8.0',
      },
    }

    console.log(
      'Package.json to resolve:',
      JSON.stringify(packageJson, null, 2)
    )

    // Test 1: Resolve only production dependencies
    console.log('\n=== Test 1: Production dependencies only ===')
    const prodResults = await webpm.resolveAndFetchPackageJson(packageJson, {
      includeDevDependencies: false,
      includePeerDependencies: false,
      includeOptionalDependencies: true,
      maxConcurrent: 2,
    })

    console.log(`Production dependencies resolved: ${prodResults.length}`)
    for (const result of prodResults) {
      console.log(
        `  ${result.root.package.name}@${result.root.package.version}: ${result.totalPackages} packages`
      )
    }

    // Test 2: Resolve all dependencies including dev
    console.log('\n=== Test 2: All dependencies including dev ===')
    const allResults = await webpm.resolveAndFetchPackageJson(packageJson, {
      includeDevDependencies: true,
      includePeerDependencies: false, // Skip peers for now as they may not resolve
      includeOptionalDependencies: true,
      maxConcurrent: 2,
    })

    console.log(`All dependencies resolved: ${allResults.length}`)
    for (const result of allResults) {
      console.log(
        `  ${result.root.package.name}@${result.root.package.version}: ${result.totalPackages} packages`
      )
    }

    // Test 3: Test with auto-install peers
    console.log('\n=== Test 3: With auto-install peers ===')
    const withPeersResults = await webpm.resolveAndFetchPackageJson(
      packageJson,
      {
        includeDevDependencies: false,
        includePeerDependencies: true,
        includeOptionalDependencies: true,
        autoInstallPeers: true,
        maxConcurrent: 2,
      }
    )

    console.log(`Dependencies with peers resolved: ${withPeersResults.length}`)
    for (const result of withPeersResults) {
      console.log(
        `  ${result.root.package.name}@${result.root.package.version}: ${result.totalPackages} packages`
      )
    }

    console.log('\n✅ All tests completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Package.json resolution test failed:', error)
    return false
  }
}

// Test minimal package.json
export async function testMinimalPackageJson() {
  try {
    console.log('\n=== Testing minimal package.json ===')

    const minimalPackageJson: PackageJsonManifest = {
      name: 'minimal-test',
      version: '1.0.0',
      dependencies: {
        'is-positive': '^3.1.0', // Small package with minimal dependencies
      },
    }

    const results = await webpm.resolveAndFetchPackageJson(minimalPackageJson)

    console.log(`Minimal package resolved: ${results.length} root dependencies`)
    for (const result of results) {
      console.log(
        `  ${result.root.package.name}@${result.root.package.version}`
      )
      console.log(`    Total packages: ${result.totalPackages}`)
      console.log(`    Total files: ${result.totalFiles}`)
      console.log(
        `    Resolution time: ${result.timings.resolutionTime.toFixed(2)}ms`
      )
      console.log(
        `    Fetching time: ${result.timings.fetchingTime.toFixed(2)}ms`
      )
    }

    return true
  } catch (error) {
    console.error('❌ Minimal package.json test failed:', error)
    return false
  }
}

// Test empty package.json
export async function testEmptyPackageJson() {
  try {
    console.log('\n=== Testing empty package.json ===')

    const emptyPackageJson: PackageJsonManifest = {
      name: 'empty-test',
      version: '1.0.0',
    }

    const results = await webpm.resolveAndFetchPackageJson(emptyPackageJson)

    console.log(
      `Empty package.json resolved: ${results.length} dependencies (should be 0)`
    )

    return results.length === 0
  } catch (error) {
    console.error('❌ Empty package.json test failed:', error)
    return false
  }
}

// Run all tests
export async function runAllPackageJsonTests() {
  console.log('🚀 Starting package.json resolution tests...\n')

  const results = await Promise.all([
    testMinimalPackageJson(),
    testEmptyPackageJson(),
    testPackageJsonResolution(),
  ])

  const allPassed = results.every((result) => result)

  if (allPassed) {
    console.log('\n🎉 All package.json resolution tests passed!')
  } else {
    console.log('\n❌ Some package.json resolution tests failed')
  }

  return allPassed
}
