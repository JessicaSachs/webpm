// React App Example - TypeScript exercises
import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { create } from 'zustand'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Type definitions for the React app
interface User {
  id: number
  name: string
  email: string
  avatar?: string
}

interface Post {
  id: number
  title: string
  content: string
  authorId: number
  createdAt: Date
}

interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

// Zustand store with TypeScript
interface AppState {
  user: User | null
  posts: Post[]
  loading: boolean
  setUser: (user: User | null) => void
  setPosts: (posts: Post[]) => void
  setLoading: (loading: boolean) => void
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => void
}

const useAppStore = create<AppState>((set) => ({
  user: null,
  posts: [],
  loading: false,
  setUser: (user) => set({ user }),
  setPosts: (posts) => set({ posts }),
  setLoading: (loading) => set({ loading }),
  addPost: (post) => set((state) => ({
    posts: [...state.posts, { ...post, id: Date.now(), createdAt: new Date() }]
  }))
}))

// Custom hooks with TypeScript
const useApi = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get<ApiResponse<T>>(url)
      setData(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Utility function with proper typing
const cn = (...inputs: (string | undefined | null | boolean)[]): string => {
  return twMerge(clsx(inputs))
}

// Component props with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Main App component
const App: React.FC = () => {
  const { user, posts, loading, setUser, setPosts, setLoading } = useAppStore()
  const { data: users, loading: usersLoading } = useApi<User[]>('/api/users')
  const navigate = useNavigate()

  const handleLogin = (selectedUser: User) => {
    setUser(selectedUser)
    navigate('/dashboard')
  }

  const handleLogout = () => {
    setUser(null)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900">
                React App
              </Link>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user.name}</span>
                <Button variant="secondary" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">
                Welcome to React App
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                A modern React application with TypeScript, Zustand, and Tailwind CSS
              </p>
              {usersLoading ? (
                <div className="text-gray-500">Loading users...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {users?.map((user) => (
                    <div key={user.id} className="bg-white p-6 rounded-lg shadow-md">
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <Button 
                        className="mt-4 w-full" 
                        onClick={() => handleLogin(user)}
                      >
                        Login as {user.name}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        } />
        
        <Route path="/dashboard" element={
          user ? (
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">
                Dashboard
              </h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Posts</h2>
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="border-b pb-4">
                        <h3 className="font-medium text-gray-900">{post.title}</h3>
                        <p className="text-gray-600 text-sm">{post.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {post.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">User Info</h2>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    {user.avatar && (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Please log in to access the dashboard.</p>
            </div>
          )
        } />
      </Routes>
    </div>
  )
}

// Root component with router
const RootApp: React.FC = () => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

export default RootApp
