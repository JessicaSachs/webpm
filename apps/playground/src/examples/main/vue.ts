// Vue.js App Example - TypeScript exercises
import { createApp, ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { createPinia } from 'pinia'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { useClipboard } from '@vueuse/core'

// Type definitions
interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: Date
}

interface Post {
  id: number
  title: string
  content: string
  authorId: number
  author?: User
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

interface CreatePostRequest {
  title: string
  content: string
  tags: string[]
}

// Pinia store with TypeScript
interface AppState {
  user: User | null
  posts: Post[]
  loading: boolean
  error: string | null
}

interface AppActions {
  setUser: (user: User | null) => void
  setPosts: (posts: Post[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addPost: (post: Post) => void
  updatePost: (id: number, post: Partial<Post>) => void
  deletePost: (id: number) => void
  fetchPosts: () => Promise<void>
  createPost: (post: CreatePostRequest) => Promise<void>
}

// Store definition
const useAppStore = defineStore('app', () => {
  // State
  const user = ref<User | null>(null)
  const posts = ref<Post[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const setUser = (newUser: User | null) => {
    user.value = newUser
  }

  const setPosts = (newPosts: Post[]) => {
    posts.value = newPosts
  }

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }

  const setError = (newError: string | null) => {
    error.value = newError
  }

  const addPost = (post: Post) => {
    posts.value.unshift(post)
  }

  const updatePost = (id: number, updatedPost: Partial<Post>) => {
    const index = posts.value.findIndex(p => p.id === id)
    if (index !== -1) {
      posts.value[index] = { ...posts.value[index], ...updatedPost }
    }
  }

  const deletePost = (id: number) => {
    posts.value = posts.value.filter(p => p.id !== id)
  }

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get<ApiResponse<Post[]>>('/api/posts')
      setPosts(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }

  const createPost = async (postData: CreatePostRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post<ApiResponse<Post>>('/api/posts', postData)
      addPost(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  // Getters
  const userPosts = computed(() => {
    if (!user.value) return []
    return posts.value.filter(post => post.authorId === user.value!.id)
  })

  const recentPosts = computed(() => {
    return posts.value
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  })

  return {
    // State
    user: readonly(user),
    posts: readonly(posts),
    loading: readonly(loading),
    error: readonly(error),
    // Actions
    setUser,
    setPosts,
    setLoading,
    setError,
    addPost,
    updatePost,
    deletePost,
    fetchPosts,
    createPost,
    // Getters
    userPosts,
    recentPosts
  }
})

// Composables with TypeScript
const useApi = <T>(url: string) => {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const execute = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await axios.get<ApiResponse<T>>(url)
      data.value = response.data.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  return { data: readonly(data), loading: readonly(loading), error: readonly(error), execute }
}

const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const storedValue = localStorage.getItem(key)
  const value = ref<T>(storedValue ? JSON.parse(storedValue) : defaultValue)

  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  }, { deep: true })

  return value
}

// Components
const UserProfile = defineComponent({
  props: {
    user: {
      type: Object as PropType<User>,
      required: true
    }
  },
  setup(props) {
    const { copy, isSupported } = useClipboard()
    const toast = useToast()

    const copyEmail = async () => {
      if (isSupported) {
        await copy(props.user.email)
        toast.success('Email copied to clipboard!')
      }
    }

    const userSince = computed(() => {
      return new Date(props.user.createdAt).toLocaleDateString()
    })

    return {
      copyEmail,
      userSince
    }
  },
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center space-x-4">
        <div class="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span class="text-2xl font-bold text-gray-600">
            {{ user.name.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-semibold text-gray-900">{{ user.name }}</h3>
          <p class="text-gray-600">{{ user.email }}</p>
          <p class="text-sm text-gray-500">User since {{ userSince }}</p>
        </div>
        <button 
          @click="copyEmail"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Copy Email
        </button>
      </div>
    </div>
  `
})

const PostCard = defineComponent({
  props: {
    post: {
      type: Object as PropType<Post>,
      required: true
    }
  },
  setup(props) {
    const store = useAppStore()
    const toast = useToast()

    const deletePost = async () => {
      if (confirm('Are you sure you want to delete this post?')) {
        try {
          await axios.delete(`/api/posts/${props.post.id}`)
          store.deletePost(props.post.id)
          toast.success('Post deleted successfully!')
        } catch (error) {
          toast.error('Failed to delete post')
        }
      }
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString()
    }

    return {
      deletePost,
      formatDate
    }
  },
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-semibold text-gray-900">{{ post.title }}</h3>
        <button 
          @click="deletePost"
          class="text-red-600 hover:text-red-800 transition-colors"
        >
          Delete
        </button>
      </div>
      <p class="text-gray-700 mb-4">{{ post.content }}</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <span 
          v-for="tag in post.tags" 
          :key="tag"
          class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
        >
          {{ tag }}
        </span>
      </div>
      <div class="text-sm text-gray-500">
        <p>Created: {{ formatDate(post.createdAt) }}</p>
        <p v-if="post.updatedAt !== post.createdAt">
          Updated: {{ formatDate(post.updatedAt) }}
        </p>
      </div>
    </div>
  `
})

const CreatePostForm = defineComponent({
  setup() {
    const store = useAppStore()
    const toast = useToast()

    const form = reactive<CreatePostRequest>({
      title: '',
      content: '',
      tags: []
    })

    const tagInput = ref('')

    const addTag = () => {
      if (tagInput.value.trim() && !form.tags.includes(tagInput.value.trim())) {
        form.tags.push(tagInput.value.trim())
        tagInput.value = ''
      }
    }

    const removeTag = (tag: string) => {
      form.tags = form.tags.filter(t => t !== tag)
    }

    const submitForm = async () => {
      if (!form.title.trim() || !form.content.trim()) {
        toast.error('Please fill in all required fields')
        return
      }

      await store.createPost(form)
      
      // Reset form
      form.title = ''
      form.content = ''
      form.tags = []
      
      toast.success('Post created successfully!')
    }

    return {
      form,
      tagInput,
      addTag,
      removeTag,
      submitForm
    }
  },
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Create New Post</h2>
      <form @submit.prevent="submitForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input 
            v-model="form.title"
            type="text" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter post title"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea 
            v-model="form.content"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter post content"
            required
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div class="flex gap-2 mb-2">
            <input 
              v-model="tagInput"
              type="text" 
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag"
              @keyup.enter="addTag"
            />
            <button 
              type="button"
              @click="addTag"
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="tag in form.tags" 
              :key="tag"
              class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-1"
            >
              {{ tag }}
              <button 
                type="button"
                @click="removeTag(tag)"
                class="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          </div>
        </div>
        
        <button 
          type="submit"
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Post
        </button>
      </form>
    </div>
  `
})

// Main App component
const App = defineComponent({
  setup() {
    const store = useAppStore()
    const router = useRouter()
    const toast = useToast()

    // Load user from localStorage on mount
    onMounted(async () => {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        store.setUser(JSON.parse(savedUser))
      }
      await store.fetchPosts()
    })

    // Watch for user changes and save to localStorage
    watch(() => store.user, (newUser) => {
      if (newUser) {
        localStorage.setItem('user', JSON.stringify(newUser))
      } else {
        localStorage.removeItem('user')
      }
    }, { deep: true })

    const login = (user: User) => {
      store.setUser(user)
      router.push('/dashboard')
      toast.success(`Welcome back, ${user.name}!`)
    }

    const logout = () => {
      store.setUser(null)
      router.push('/')
      toast.success('Logged out successfully!')
    }

    return {
      store,
      login,
      logout
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <router-link to="/" class="text-xl font-bold text-gray-900">
                Vue App
              </router-link>
            </div>
            <div v-if="store.user" class="flex items-center space-x-4">
              <span class="text-gray-700">Welcome, {{ store.user.name }}</span>
              <button 
                @click="logout"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <router-view />
    </div>
  `
})

// Routes
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: {
      template: `
        <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-gray-900 mb-8">
              Welcome to Vue App
            </h1>
            <p class="text-xl text-gray-600 mb-8">
              A modern Vue.js application with TypeScript, Pinia, and Tailwind CSS
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div 
                v-for="user in mockUsers" 
                :key="user.id"
                class="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 class="text-lg font-semibold text-gray-900">{{ user.name }}</h3>
                <p class="text-gray-600">{{ user.email }}</p>
                <button 
                  @click="login(user)"
                  class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login as {{ user.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      `,
      setup() {
        const store = useAppStore()
        const router = useRouter()

        const mockUsers: User[] = [
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            createdAt: new Date('2023-01-15')
          },
          {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'user',
            createdAt: new Date('2023-02-20')
          },
          {
            id: 3,
            name: 'Bob Johnson',
            email: 'bob@example.com',
            role: 'moderator',
            createdAt: new Date('2023-03-10')
          }
        ]

        const login = (user: User) => {
          store.setUser(user)
          router.push('/dashboard')
        }

        return {
          mockUsers,
          login
        }
      }
    }
  },
  {
    path: '/dashboard',
    component: {
      template: `
        <div v-if="store.user" class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-8">
            Dashboard
          </h1>
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Recent Posts</h2>
              <div v-if="store.loading" class="text-center py-8">
                <div class="text-gray-500">Loading posts...</div>
              </div>
              <div v-else-if="store.error" class="text-center py-8">
                <div class="text-red-500">{{ store.error }}</div>
              </div>
              <div v-else class="space-y-4">
                <PostCard 
                  v-for="post in store.recentPosts" 
                  :key="post.id"
                  :post="post"
                />
              </div>
            </div>
            
            <div class="space-y-6">
              <UserProfile :user="store.user" />
              <CreatePostForm />
            </div>
          </div>
        </div>
        <div v-else class="text-center py-12">
          <p class="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      `,
      components: {
        PostCard,
        CreatePostForm,
        UserProfile
      },
      setup() {
        const store = useAppStore()
        return { store }
      }
    }
  }
]

// App setup
const app = createApp(App)
const pinia = createPinia()
const router = createRouter({
  history: createWebHistory(),
  routes
})

app.use(pinia)
app.use(router)
app.use(useToast())

// Mock API setup for development
if (import.meta.env.DEV) {
  // Mock axios responses
  axios.interceptors.request.use((config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  })
}

export default app
