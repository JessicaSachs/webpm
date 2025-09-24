// Next.js App Example - TypeScript exercises
import { NextPage, GetServerSideProps, GetStaticProps } from 'next'
import { AppProps } from 'next/app'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { LucideIcon, Home, User, Settings, Search, Heart, Share2 } from 'lucide-react'

// Type definitions
interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: string
}

interface Post {
  id: number
  title: string
  content: string
  excerpt: string
  authorId: number
  author?: User
  createdAt: string
  updatedAt: string
  tags: string[]
  likes: number
  isLiked: boolean
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

// Custom hooks with TypeScript
const useApi = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<T> = await response.json()
      setData(result.data)
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

const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

// Utility functions
const cn = (...inputs: (string | undefined | null | boolean)[]): string => {
  return clsx(inputs)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Components with TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  className
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
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
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

interface PostCardProps {
  post: Post
  onLike?: (postId: number) => void
  onShare?: (postId: number) => void
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onShare }) => {
  const handleLike = () => {
    onLike?.(post.id)
  }

  const handleShare = () => {
    onShare?.(post.id)
  }

  return (
    <article className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            <Link href={`/posts/${post.id}`} className="hover:text-blue-600 transition-colors">
              {post.title}
            </Link>
          </h2>
          <p className="text-gray-600 text-sm">
            By {post.author?.name || 'Unknown'} • {formatDate(post.createdAt)}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleLike}
            className={cn(
              'p-2 rounded-full transition-colors',
              post.isLiked 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            )}
          >
            <Heart className={cn('w-5 h-5', post.isLiked && 'fill-current')} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">{post.excerpt}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{post.likes} likes</span>
        <Link 
          href={`/posts/${post.id}`}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          Read more →
        </Link>
      </div>
    </article>
  )
}

interface NavigationProps {
  user?: User | null
  onLogout?: () => void
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const router = useRouter()

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Posts', href: '/posts', icon: Search },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings }
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Next.js App
            </Link>
            <div className="hidden md:flex space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      router.pathname === item.href
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name}</span>
              <Button variant="ghost" onClick={onLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push('/login')}>
                Login
              </Button>
              <Button onClick={() => router.push('/register')}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

// Page components
interface HomePageProps {
  posts: Post[]
  user?: User | null
}

const HomePage: NextPage<HomePageProps> = ({ posts, user }) => {
  const [likedPosts, setLikedPosts] = useLocalStorage<number[]>('liked-posts', [])
  const [loading, setLoading] = useState(false)

  const handleLike = async (postId: number) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setLikedPosts(prev => 
        prev.includes(postId) 
          ? prev.filter(id => id !== postId)
          : [...prev, postId]
      )
    } catch (error) {
      console.error('Failed to like post:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (postId: number) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post',
          url: `/posts/${postId}`
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`)
    }
  }

  const postsWithLikes = posts.map(post => ({
    ...post,
    isLiked: likedPosts.includes(post.id)
  }))

  return (
    <>
      <Head>
        <title>Next.js App - Home</title>
        <meta name="description" content="A modern Next.js application with TypeScript" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        
        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Next.js App
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A modern Next.js application with TypeScript, Tailwind CSS, and Lucide React icons
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {postsWithLikes.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onShare={handleShare}
              />
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

// Server-side props
export const getServerSideProps: GetServerSideProps<HomePageProps> = async (context) => {
  // Simulate API call
  const mockPosts: Post[] = [
    {
      id: 1,
      title: 'Getting Started with Next.js',
      content: 'Learn how to build modern web applications with Next.js...',
      excerpt: 'Learn how to build modern web applications with Next.js and TypeScript.',
      authorId: 1,
      author: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        createdAt: '2023-01-15'
      },
      createdAt: '2023-12-01',
      updatedAt: '2023-12-01',
      tags: ['nextjs', 'react', 'typescript'],
      likes: 42,
      isLiked: false
    },
    {
      id: 2,
      title: 'TypeScript Best Practices',
      content: 'Discover the best practices for writing maintainable TypeScript code...',
      excerpt: 'Discover the best practices for writing maintainable TypeScript code.',
      authorId: 2,
      author: {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        createdAt: '2023-02-20'
      },
      createdAt: '2023-11-28',
      updatedAt: '2023-11-28',
      tags: ['typescript', 'javascript', 'development'],
      likes: 38,
      isLiked: false
    },
    {
      id: 3,
      title: 'Building Responsive UIs',
      content: 'Learn how to create beautiful, responsive user interfaces...',
      excerpt: 'Learn how to create beautiful, responsive user interfaces with Tailwind CSS.',
      authorId: 1,
      author: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        createdAt: '2023-01-15'
      },
      createdAt: '2023-11-25',
      updatedAt: '2023-11-25',
      tags: ['css', 'tailwind', 'ui', 'design'],
      likes: 29,
      isLiked: false
    }
  ]

  // Simulate user authentication
  const user: User | null = null // In real app, get from session/auth

  return {
    props: {
      posts: mockPosts,
      user
    }
  }
}

export default HomePage
