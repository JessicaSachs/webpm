// Svelte App Example - TypeScript exercises
import { writable, derived, readable } from 'svelte/store'
import { onMount, onDestroy, tick } from 'svelte'
import { fly, fade, scale } from 'svelte/transition'
import { quintOut } from 'svelte/easing'

// Type definitions
interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: Date
}

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: Date
  priority: 'low' | 'medium' | 'high'
  tags: string[]
}

interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

interface CreateTodoRequest {
  text: string
  priority: 'low' | 'medium' | 'high'
  tags: string[]
}

// Stores with TypeScript
interface AppState {
  user: User | null
  todos: Todo[]
  loading: boolean
  error: string | null
  filter: 'all' | 'active' | 'completed'
  searchTerm: string
}

const initialState: AppState = {
  user: null,
  todos: [],
  loading: false,
  error: null,
  filter: 'all',
  searchTerm: ''
}

// Create stores
const appStore = writable<AppState>(initialState)

// Derived stores
export const user = derived(appStore, $store => $store.user)
export const todos = derived(appStore, $store => $store.todos)
export const loading = derived(appStore, $store => $store.loading)
export const error = derived(appStore, $store => $store.error)
export const filter = derived(appStore, $store => $store.filter)
export const searchTerm = derived(appStore, $store => $store.searchTerm)

// Computed derived stores
export const filteredTodos = derived(
  [appStore, searchTerm],
  ([$store, $searchTerm]) => {
    let filtered = $store.todos

    // Apply filter
    switch ($store.filter) {
      case 'active':
        filtered = filtered.filter(todo => !todo.completed)
        break
      case 'completed':
        filtered = filtered.filter(todo => todo.completed)
        break
    }

    // Apply search
    if ($searchTerm) {
      const term = $searchTerm.toLowerCase()
      filtered = filtered.filter(todo => 
        todo.text.toLowerCase().includes(term) ||
        todo.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    return filtered
  }
)

export const todoStats = derived(appStore, $store => {
  const total = $store.todos.length
  const completed = $store.todos.filter(todo => todo.completed).length
  const active = total - completed
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  return {
    total,
    completed,
    active,
    completionRate: Math.round(completionRate)
  }
})

// Store actions
export const appActions = {
  setUser: (user: User | null) => {
    appStore.update(state => ({ ...state, user }))
  },

  setLoading: (loading: boolean) => {
    appStore.update(state => ({ ...state, loading }))
  },

  setError: (error: string | null) => {
    appStore.update(state => ({ ...state, error }))
  },

  setFilter: (filter: 'all' | 'active' | 'completed') => {
    appStore.update(state => ({ ...state, filter }))
  },

  setSearchTerm: (searchTerm: string) => {
    appStore.update(state => ({ ...state, searchTerm }))
  },

  addTodo: (todo: Todo) => {
    appStore.update(state => ({
      ...state,
      todos: [todo, ...state.todos]
    }))
  },

  updateTodo: (id: number, updates: Partial<Todo>) => {
    appStore.update(state => ({
      ...state,
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    }))
  },

  deleteTodo: (id: number) => {
    appStore.update(state => ({
      ...state,
      todos: state.todos.filter(todo => todo.id !== id)
    }))
  },

  toggleTodo: (id: number) => {
    appStore.update(state => ({
      ...state,
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }))
  },

  clearCompleted: () => {
    appStore.update(state => ({
      ...state,
      todos: state.todos.filter(todo => !todo.completed)
    }))
  }
}

// API functions
const api = {
  async fetchTodos(): Promise<Todo[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return [
      {
        id: 1,
        text: 'Learn Svelte with TypeScript',
        completed: false,
        createdAt: new Date('2023-12-01'),
        priority: 'high',
        tags: ['svelte', 'typescript', 'learning']
      },
      {
        id: 2,
        text: 'Build a todo app',
        completed: true,
        createdAt: new Date('2023-11-28'),
        priority: 'medium',
        tags: ['project', 'app']
      },
      {
        id: 3,
        text: 'Write documentation',
        completed: false,
        createdAt: new Date('2023-11-25'),
        priority: 'low',
        tags: ['documentation', 'writing']
      }
    ]
  },

  async createTodo(todoData: CreateTodoRequest): Promise<Todo> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      id: Date.now(),
      text: todoData.text,
      completed: false,
      createdAt: new Date(),
      priority: todoData.priority,
      tags: todoData.tags
    }
  },

  async updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const currentTodos = await this.fetchTodos()
    const todo = currentTodos.find(t => t.id === id)
    if (!todo) throw new Error('Todo not found')
    
    return { ...todo, ...updates }
  },

  async deleteTodo(id: number): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
  }
}

// Utility functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getPriorityColor = (priority: Todo['priority']): string => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-100'
    case 'medium': return 'text-yellow-600 bg-yellow-100'
    case 'low': return 'text-green-600 bg-green-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

// Component logic
export const loadTodos = async (): Promise<void> => {
  appActions.setLoading(true)
  appActions.setError(null)
  
  try {
    const todos = await api.fetchTodos()
    appStore.update(state => ({ ...state, todos }))
  } catch (error) {
    appActions.setError(error instanceof Error ? error.message : 'Failed to load todos')
  } finally {
    appActions.setLoading(false)
  }
}

export const createTodo = async (todoData: CreateTodoRequest): Promise<void> => {
  appActions.setLoading(true)
  appActions.setError(null)
  
  try {
    const todo = await api.createTodo(todoData)
    appActions.addTodo(todo)
  } catch (error) {
    appActions.setError(error instanceof Error ? error.message : 'Failed to create todo')
  } finally {
    appActions.setLoading(false)
  }
}

export const updateTodo = async (id: number, updates: Partial<Todo>): Promise<void> => {
  try {
    const updatedTodo = await api.updateTodo(id, updates)
    appActions.updateTodo(id, updatedTodo)
  } catch (error) {
    appActions.setError(error instanceof Error ? error.message : 'Failed to update todo')
  }
}

export const deleteTodo = async (id: number): Promise<void> => {
  try {
    await api.deleteTodo(id)
    appActions.deleteTodo(id)
  } catch (error) {
    appActions.setError(error instanceof Error ? error.message : 'Failed to delete todo')
  }
}

// Auto-save functionality
let autoSaveTimeout: NodeJS.Timeout | null = null

export const scheduleAutoSave = (): void => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }
  
  autoSaveTimeout = setTimeout(() => {
    // Auto-save logic here
    console.log('Auto-saving todos...')
  }, 2000)
}

// Keyboard shortcuts
export const handleKeydown = (event: KeyboardEvent): void => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'n':
        event.preventDefault()
        // Create new todo
        break
      case 'f':
        event.preventDefault()
        // Focus search
        break
      case 'a':
        event.preventDefault()
        // Select all
        break
    }
  }
}

// Local storage persistence
export const saveToStorage = (): void => {
  if (typeof window !== 'undefined') {
    appStore.subscribe(state => {
      localStorage.setItem('svelte-todos', JSON.stringify(state.todos))
    })
  }
}

export const loadFromStorage = (): void => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('svelte-todos')
    if (stored) {
      try {
        const todos = JSON.parse(stored)
        appStore.update(state => ({ ...state, todos }))
      } catch (error) {
        console.error('Failed to load todos from storage:', error)
      }
    }
  }
}

// Animation helpers
export const animateIn = (node: Element, delay: number = 0): void => {
  setTimeout(() => {
    node.classList.add('animate-in')
  }, delay)
}

export const animateOut = (node: Element): void => {
  node.classList.add('animate-out')
}

// Export the main app component
export default `
<script lang="ts">
  import { onMount } from 'svelte'
  import { 
    user, 
    todos, 
    loading, 
    error, 
    filteredTodos, 
    todoStats,
    appActions,
    loadTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    handleKeydown,
    saveToStorage,
    loadFromStorage
  } from './stores'
  
  let newTodoText = ''
  let newTodoPriority = 'medium'
  let newTodoTags = ''
  
  onMount(() => {
    loadFromStorage()
    loadTodos()
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', handleKeydown)
    
    // Set up auto-save
    saveToStorage()
    
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  })
  
  const handleSubmit = async () => {
    if (!newTodoText.trim()) return
    
    const tags = newTodoTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
    
    await createTodo({
      text: newTodoText,
      priority: newTodoPriority,
      tags
    })
    
    newTodoText = ''
    newTodoTags = ''
  }
  
  const handleToggle = async (id: number) => {
    await updateTodo(id, { completed: !todos.find(t => t.id === id)?.completed })
  }
  
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this todo?')) {
      await deleteTodo(id)
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Svelte Todo App</h1>
    
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-2xl font-bold text-blue-600">{$todoStats.total}</div>
        <div class="text-sm text-gray-600">Total</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-2xl font-bold text-green-600">{$todoStats.active}</div>
        <div class="text-sm text-gray-600">Active</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-2xl font-bold text-gray-600">{$todoStats.completed}</div>
        <div class="text-sm text-gray-600">Completed</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="text-2xl font-bold text-purple-600">{$todoStats.completionRate}%</div>
        <div class="text-sm text-gray-600">Complete</div>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <button 
        class="px-4 py-2 rounded-lg {appActions.filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}"
        on:click={() => appActions.setFilter('all')}
      >
        All
      </button>
      <button 
        class="px-4 py-2 rounded-lg {appActions.filter === 'active' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}"
        on:click={() => appActions.setFilter('active')}
      >
        Active
      </button>
      <button 
        class="px-4 py-2 rounded-lg {appActions.filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}"
        on:click={() => appActions.setFilter('completed')}
      >
        Completed
      </button>
    </div>
    
    <!-- Search -->
    <div class="mb-6">
      <input 
        type="text" 
        placeholder="Search todos..."
        bind:value={appActions.searchTerm}
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <!-- Add Todo Form -->
    <div class="bg-white p-6 rounded-lg shadow mb-8">
      <h2 class="text-xl font-semibold mb-4">Add New Todo</h2>
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <input 
            type="text" 
            bind:value={newTodoText}
            placeholder="What needs to be done?"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div class="flex gap-4">
          <select bind:value={newTodoPriority} class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          
          <input 
            type="text" 
            bind:value={newTodoTags}
            placeholder="Tags (comma separated)"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button 
          type="submit"
          disabled={$loading}
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if $loading}
            Adding...
          {:else}
            Add Todo
          {/if}
        </button>
      </form>
    </div>
    
    <!-- Error Message -->
    {#if $error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {$error}
      </div>
    {/if}
    
    <!-- Todo List -->
    <div class="space-y-4">
      {#each $filteredTodos as todo (todo.id)}
        <div 
          class="bg-white p-4 rounded-lg shadow transition-all duration-200 hover:shadow-md"
          in:fly={{ y: 20, duration: 300 }}
          out:fly={{ y: -20, duration: 300 }}
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <input 
                  type="checkbox" 
                  checked={todo.completed}
                  on:change={() => handleToggle(todo.id)}
                  class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span class="text-lg {todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}">
                  {todo.text}
                </span>
                <span class="px-2 py-1 text-xs rounded-full {getPriorityColor(todo.priority)}">
                  {todo.priority}
                </span>
              </div>
              
              {#if todo.tags.length > 0}
                <div class="flex flex-wrap gap-1 mb-2">
                  {#each todo.tags as tag}
                    <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {tag}
                    </span>
                  {/each}
                </div>
              {/if}
              
              <div class="text-sm text-gray-500">
                Created {formatDate(todo.createdAt)}
              </div>
            </div>
            
            <button 
              on:click={() => handleDelete(todo.id)}
              class="text-red-600 hover:text-red-800 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      {:else}
        <div class="text-center py-8 text-gray-500">
          {#if $loading}
            Loading todos...
          {:else}
            No todos found
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .animate-in {
    animation: slideIn 0.3s ease-out;
  }
  
  .animate-out {
    animation: slideOut 0.3s ease-in;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
</style>
`
