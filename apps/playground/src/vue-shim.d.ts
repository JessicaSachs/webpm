// TODO: This file will be removed.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // @ts-expect-error This won't be necessary
  const component: DefineComponent<{}, {}, any>
  export default component
}
