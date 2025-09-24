// MkStack Example - TypeScript exercises
// Modern stack configuration with TypeScript

interface StackConfig {
  name: string
  version: string
  services: Service[]
}

interface Service {
  name: string
  port: number
  dependencies: string[]
}

class StackManager {
  private config: StackConfig

  constructor(config: StackConfig) {
    this.config = config
  }

  getService(name: string): Service | undefined {
    return this.config.services.find(service => service.name === name)
  }

  getDependencies(serviceName: string): Service[] {
    const service = this.getService(serviceName)
    if (!service) return []
    
    return service.dependencies
      .map(depName => this.getService(depName))
      .filter((service): service is Service => service !== undefined)
  }
}

// Example usage
const stackConfig: StackConfig = {
  name: 'my-stack',
  version: '1.0.0',
  services: [
    { name: 'api', port: 3000, dependencies: ['database'] },
    { name: 'database', port: 5432, dependencies: [] }
  ]
}

const manager = new StackManager(stackConfig)
const apiService = manager.getService('api')
const apiDeps = manager.getDependencies('api')

console.log('API Service:', apiService)
console.log('API Dependencies:', apiDeps)
