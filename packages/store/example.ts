/**
 * Example usage of the @webpm/store dependency resolution system
 */

import { webpm } from '@webpm/webpm'

async function example() {
  try {
    console.log('Installing nuxt package and resolving all dependencies...')
    
    // Install nuxt and resolve all its dependencies
    const dependencyTree = await webpm.install('nuxt', {
      version: '^3.0.0',
      dev: false,
    })

    if (!dependencyTree) {
      console.error('Failed to resolve nuxt package')
      return
    }

    console.log('\n=== Dependency Tree ===')
    console.log(`Root package: ${dependencyTree.package.name}@${dependencyTree.package.version}`)
    console.log(`Total dependencies: ${dependencyTree.children.size}`)
    
    // Log some key dependencies
    console.log('\n=== Key Dependencies ===')
    for (const [alias, childNode] of dependencyTree.children) {
      console.log(`- ${alias}@${childNode.package.version}`)
      
      // Show some sub-dependencies
      if (childNode.children.size > 0) {
        console.log(`  Sub-dependencies: ${childNode.children.size}`)
        let count = 0
        for (const [subAlias, subNode] of childNode.children) {
          if (count < 3) { // Show first 3 sub-dependencies
            console.log(`    - ${subAlias}@${subNode.package.version}`)
            count++
          }
        }
        if (childNode.children.size > 3) {
          console.log(`    ... and ${childNode.children.size - 3} more`)
        }
      }
    }

    console.log('\n=== Resolution Complete ===')
    console.log('All dependencies have been resolved successfully!')

  } catch (error) {
    console.error('Error during package resolution:', error)
  }
}

// Run the example
example()
