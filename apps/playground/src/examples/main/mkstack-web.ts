// MkStack Web Example - TypeScript exercises
import { createApp } from 'vue'

interface Component {
  name: string
  props: Record<string, any>
  template: string
}

class ComponentRegistry {
  private components = new Map<string, Component>()

  register(name: string, component: Component): void {
    this.components.set(name, component)
  }

  get(name: string): Component | undefined {
    return this.components.get(name)
  }

  list(): string[] {
    return Array.from(this.components.keys())
  }
}

// Example usage
const registry = new ComponentRegistry()

registry.register('Button', {
  name: 'Button',
  props: { variant: 'primary' },
  template: '<button :class="variant">{{ text }}</button>'
})

const button = registry.get('Button')
console.log('Registered components:', registry.list())
console.log('Button component:', button)
