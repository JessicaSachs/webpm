// Deno App Example - TypeScript exercises
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { serveFile } from 'https://deno.land/std@0.177.0/http/file_server.ts'
import { join } from 'https://deno.land/std@0.177.0/path/mod.ts'
import { exists } from 'https://deno.land/std@0.177.0/fs/exists.ts'
import { z } from 'https://deno.land/x/zod@v3.20.6/mod.ts'

// Type definitions
interface User {
  id: number
  name: string
  email: string
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
  tags: string[]
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface CreatePostRequest {
  title: string
  content: string
  tags: string[]
}

// Zod schemas for validation
const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).default([]),
})

const UpdatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  tags: z.array(z.string()).optional(),
})

// In-memory storage (in production, use a database)
const users: User[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    createdAt: new Date('2023-01-15'),
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user',
    createdAt: new Date('2023-02-20'),
  },
]

const posts: Post[] = [
  {
    id: 1,
    title: 'Getting Started with Deno',
    content: 'Deno is a modern runtime for JavaScript and TypeScript...',
    authorId: 1,
    createdAt: new Date('2023-12-01'),
    tags: ['deno', 'javascript', 'typescript'],
  },
  {
    id: 2,
    title: 'TypeScript Best Practices',
    content: 'Here are some best practices for writing TypeScript code...',
    authorId: 2,
    createdAt: new Date('2023-11-28'),
    tags: ['typescript', 'development'],
  },
]

// Utility functions
const createResponse = <T>(data: T, status: number = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

const createErrorResponse = (error: string, status: number = 400): Response => {
  return createResponse<ApiResponse<null>>(
    {
      success: false,
      error,
    },
    status
  )
}

const parseJson = async <T>(request: Request): Promise<T> => {
  const text = await request.text()
  return JSON.parse(text)
}

const findUserById = (id: number): User | undefined => {
  return users.find((user) => user.id === id)
}

const findPostById = (id: number): Post | undefined => {
  return posts.find((post) => post.id === id)
}

// Route handlers
const handleGetPosts = (): Response => {
  const postsWithAuthors = posts.map((post) => ({
    ...post,
    author: findUserById(post.authorId),
  }))

  return createResponse<ApiResponse<Post[]>>({
    success: true,
    data: postsWithAuthors,
    message: 'Posts retrieved successfully',
  })
}

const handleGetPost = (id: number): Response => {
  const post = findPostById(id)

  if (!post) {
    return createErrorResponse('Post not found', 404)
  }

  const postWithAuthor = {
    ...post,
    author: findUserById(post.authorId),
  }

  return createResponse<ApiResponse<Post>>({
    success: true,
    data: postWithAuthor,
    message: 'Post retrieved successfully',
  })
}

const handleCreatePost = async (request: Request): Promise<Response> => {
  try {
    const body = await parseJson<CreatePostRequest>(request)
    const validatedData = CreatePostSchema.parse(body)

    const newPost: Post = {
      id: Math.max(...posts.map((p) => p.id), 0) + 1,
      title: validatedData.title,
      content: validatedData.content,
      authorId: 1, // In real app, get from auth
      createdAt: new Date(),
      tags: validatedData.tags,
    }

    posts.unshift(newPost)

    const postWithAuthor = {
      ...newPost,
      author: findUserById(newPost.authorId),
    }

    return createResponse<ApiResponse<Post>>(
      {
        success: true,
        data: postWithAuthor,
        message: 'Post created successfully',
      },
      201
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors.map((e) => e.message).join(', '))
    }

    console.error('Create post error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

const handleUpdatePost = async (
  id: number,
  request: Request
): Promise<Response> => {
  try {
    const post = findPostById(id)

    if (!post) {
      return createErrorResponse('Post not found', 404)
    }

    const body = await parseJson<Partial<CreatePostRequest>>(request)
    const validatedData = UpdatePostSchema.parse(body)

    const updatedPost = {
      ...post,
      ...validatedData,
    }

    const index = posts.findIndex((p) => p.id === id)
    posts[index] = updatedPost

    const postWithAuthor = {
      ...updatedPost,
      author: findUserById(updatedPost.authorId),
    }

    return createResponse<ApiResponse<Post>>({
      success: true,
      data: postWithAuthor,
      message: 'Post updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors.map((e) => e.message).join(', '))
    }

    console.error('Update post error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

const handleDeletePost = (id: number): Response => {
  const post = findPostById(id)

  if (!post) {
    return createErrorResponse('Post not found', 404)
  }

  const index = posts.findIndex((p) => p.id === id)
  posts.splice(index, 1)

  return createResponse<ApiResponse<null>>({
    success: true,
    message: 'Post deleted successfully',
  })
}

const handleGetUsers = (): Response => {
  return createResponse<ApiResponse<User[]>>({
    success: true,
    data: users,
    message: 'Users retrieved successfully',
  })
}

const handleGetUser = (id: number): Response => {
  const user = findUserById(id)

  if (!user) {
    return createErrorResponse('User not found', 404)
  }

  return createResponse<ApiResponse<User>>({
    success: true,
    data: user,
    message: 'User retrieved successfully',
  })
}

// Static file handler
const handleStaticFile = async (pathname: string): Promise<Response> => {
  const filePath = join(Deno.cwd(), 'public', pathname)

  if (await exists(filePath)) {
    return await serveFile(new Request(`file://${filePath}`), filePath)
  }

  return createErrorResponse('File not found', 404)
}

// Main request handler
const handleRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const pathname = url.pathname
  const method = request.method

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Health check
  if (pathname === '/health') {
    return createResponse<
      ApiResponse<{ status: string; timestamp: string; uptime: number }>
    >({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: performance.now(),
      },
      message: 'Server is running',
    })
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.replace('/api', '')

    // Posts routes
    if (apiPath === '/posts' && method === 'GET') {
      return handleGetPosts()
    }

    if (apiPath.startsWith('/posts/') && method === 'GET') {
      const id = parseInt(apiPath.split('/')[2])
      if (isNaN(id)) {
        return createErrorResponse('Invalid post ID')
      }
      return handleGetPost(id)
    }

    if (apiPath === '/posts' && method === 'POST') {
      return await handleCreatePost(request)
    }

    if (apiPath.startsWith('/posts/') && method === 'PUT') {
      const id = parseInt(apiPath.split('/')[2])
      if (isNaN(id)) {
        return createErrorResponse('Invalid post ID')
      }
      return await handleUpdatePost(id, request)
    }

    if (apiPath.startsWith('/posts/') && method === 'DELETE') {
      const id = parseInt(apiPath.split('/')[2])
      if (isNaN(id)) {
        return createErrorResponse('Invalid post ID')
      }
      return handleDeletePost(id)
    }

    // Users routes
    if (apiPath === '/users' && method === 'GET') {
      return handleGetUsers()
    }

    if (apiPath.startsWith('/users/') && method === 'GET') {
      const id = parseInt(apiPath.split('/')[2])
      if (isNaN(id)) {
        return createErrorResponse('Invalid user ID')
      }
      return handleGetUser(id)
    }

    // 404 for API routes
    return createErrorResponse('API endpoint not found', 404)
  }

  // Static files
  if (pathname.startsWith('/static/')) {
    return await handleStaticFile(pathname.replace('/static/', ''))
  }

  // Default route - serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    return await handleStaticFile('index.html')
  }

  // 404
  return createErrorResponse('Route not found', 404)
}

// Error handling
const handleError = (error: Error): Response => {
  console.error('Unhandled error:', error)
  return createErrorResponse('Internal server error', 500)
}

// Start server
const port = 8000
console.log(`Deno server running on http://localhost:${port}`)

try {
  await serve(handleRequest, { port })
} catch (error) {
  console.error('Server error:', error)
  Deno.exit(1)
}
