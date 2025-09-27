// Build Tools Project Example - TypeScript exercises
import webpack from 'webpack'
import { Configuration } from 'webpack'
import { defineConfig } from 'vite'
import { rollup } from 'rollup'
import { terser } from 'terser'
import { ESLint } from 'eslint'
import prettier from 'prettier'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Type definitions
interface BuildConfig {
  entry: string
  output: string
  mode: 'development' | 'production'
  sourceMap: boolean
  minify: boolean
}

interface BundleResult {
  size: number
  gzippedSize: number
  chunks: number
  assets: string[]
}

interface LintResult {
  file: string
  errors: number
  warnings: number
  messages: string[]
}

// Webpack configuration with TypeScript
const createWebpackConfig = (config: BuildConfig): Configuration => {
  return {
    mode: config.mode,
    entry: config.entry,
    output: {
      path: join(process.cwd(), config.output),
      filename: '[name].[contenthash].js',
      clean: true,
    },
    devtool: config.sourceMap ? 'source-map' : false,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                '@babel/preset-typescript',
              ],
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(config.mode),
      }),
    ],
    optimization: {
      minimize: config.minify,
      minimizer: config.minify
        ? [new (require('terser-webpack-plugin'))()]
        : [],
    },
  }
}

// Vite configuration with TypeScript
const createViteConfig = (config: BuildConfig) => {
  return defineConfig({
    build: {
      outDir: config.output,
      sourcemap: config.sourceMap,
      minify: config.minify ? 'terser' : false,
      rollupOptions: {
        input: config.entry,
        output: {
          entryFileNames: '[name].[hash].js',
          chunkFileNames: '[name].[hash].js',
          assetFileNames: '[name].[hash].[ext]',
        },
      },
    },
    plugins: [
      require('@vitejs/plugin-legacy')({
        targets: ['defaults', 'not IE 11'],
      }),
    ],
  })
}

// Rollup configuration with TypeScript
const createRollupConfig = (config: BuildConfig) => {
  return {
    input: config.entry,
    output: {
      file: join(config.output, 'bundle.js'),
      format: 'es',
      sourcemap: config.sourceMap,
    },
    plugins: [
      require('@rollup/plugin-node-resolve')(),
      require('@rollup/plugin-commonjs')(),
      require('@rollup/plugin-typescript')({
        tsconfig: './tsconfig.json',
      }),
    ],
  }
}

// Build tools class
class BuildTools {
  private config: BuildConfig
  private eslint: ESLint

  constructor(config: BuildConfig) {
    this.config = config
    this.eslint = new ESLint({
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
    })
  }

  // Webpack build
  async buildWithWebpack(): Promise<BundleResult> {
    const webpackConfig = createWebpackConfig(this.config)
    const compiler = webpack(webpackConfig)

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err || stats?.hasErrors()) {
          reject(err || new Error('Webpack build failed'))
          return
        }

        const info = stats!.toJson()
        const assets = Object.keys(info.assets || {})
        const totalSize = assets.reduce((size, asset) => {
          return size + (info.assets?.[asset]?.size || 0)
        }, 0)

        resolve({
          size: totalSize,
          gzippedSize: Math.round(totalSize * 0.3), // Approximate gzip ratio
          chunks: Object.keys(info.chunks || {}).length,
          assets,
        })
      })
    })
  }

  // Vite build
  async buildWithVite(): Promise<BundleResult> {
    const viteConfig = createViteConfig(this.config)
    const { build } = await import('vite')

    const result = await build(viteConfig)

    if (Array.isArray(result)) {
      const totalSize = result.reduce((size, chunk) => {
        return size + (chunk.output?.[0]?.code?.length || 0)
      }, 0)

      return {
        size: totalSize,
        gzippedSize: Math.round(totalSize * 0.3),
        chunks: result.length,
        assets: result
          .map((chunk) => chunk.output?.[0]?.fileName || '')
          .filter(Boolean),
      }
    }

    return {
      size: 0,
      gzippedSize: 0,
      chunks: 0,
      assets: [],
    }
  }

  // Rollup build
  async buildWithRollup(): Promise<BundleResult> {
    const rollupConfig = createRollupConfig(this.config)
    const bundle = await rollup(rollupConfig)

    const { output } = await bundle.generate(rollupConfig.output as any)

    const totalSize = output.reduce((size, chunk) => {
      if (chunk.type === 'chunk') {
        return size + chunk.code.length
      }
      return size
    }, 0)

    return {
      size: totalSize,
      gzippedSize: Math.round(totalSize * 0.3),
      chunks: output.length,
      assets: output.map((chunk) => chunk.fileName).filter(Boolean),
    }
  }

  // Lint code
  async lintFiles(files: string[]): Promise<LintResult[]> {
    const results: LintResult[] = []

    for (const file of files) {
      if (!existsSync(file)) continue

      try {
        const lintResults = await this.eslint.lintFiles(file)

        for (const result of lintResults) {
          results.push({
            file: result.filePath,
            errors: result.errorCount,
            warnings: result.warningCount,
            messages: result.messages.map(
              (msg) => `${msg.line}:${msg.column} ${msg.message}`
            ),
          })
        }
      } catch (error) {
        console.error(`Error linting ${file}:`, error)
      }
    }

    return results
  }

  // Format code with Prettier
  async formatCode(code: string, filePath: string): Promise<string> {
    try {
      const options = await prettier.resolveConfig(filePath)
      return await prettier.format(code, {
        ...options,
        filepath: filePath,
      })
    } catch (error) {
      console.error('Prettier formatting error:', error)
      return code
    }
  }

  // Minify code with Terser
  async minifyCode(code: string): Promise<string> {
    try {
      const result = await terser.minify(code, {
        compress: {
          drop_console: this.config.mode === 'production',
        },
        mangle: true,
      })

      if (result.error) {
        throw result.error
      }

      return result.code || code
    } catch (error) {
      console.error('Terser minification error:', error)
      return code
    }
  }

  // Build with all tools
  async buildAll(): Promise<{
    webpack: BundleResult
    vite: BundleResult
    rollup: BundleResult
  }> {
    console.log('Building with Webpack...')
    const webpackResult = await this.buildWithWebpack()

    console.log('Building with Vite...')
    const viteResult = await this.buildWithVite()

    console.log('Building with Rollup...')
    const rollupResult = await this.buildWithRollup()

    return {
      webpack: webpackResult,
      vite: viteResult,
      rollup: rollupResult,
    }
  }

  // Compare build results
  compareBuilds(results: {
    webpack: BundleResult
    vite: BundleResult
    rollup: BundleResult
  }): {
    fastest: string
    smallest: string
    mostChunks: string
  } {
    const builds = Object.entries(results)

    const fastest = builds.reduce((prev, current) =>
      prev[1].size < current[1].size ? prev : current
    )[0]

    const smallest = builds.reduce((prev, current) =>
      prev[1].size < current[1].size ? prev : current
    )[0]

    const mostChunks = builds.reduce((prev, current) =>
      prev[1].chunks > current[1].chunks ? prev : current
    )[0]

    return {
      fastest,
      smallest,
      mostChunks,
    }
  }
}

// Example usage
const main = async () => {
  const config: BuildConfig = {
    entry: './src/index.ts',
    output: './dist',
    mode: 'production',
    sourceMap: true,
    minify: true,
  }

  const buildTools = new BuildTools(config)

  try {
    // Build with all tools
    const results = await buildTools.buildAll()

    // Compare results
    const comparison = buildTools.compareBuilds(results)

    console.log('Build Results:')
    console.log('==============')
    Object.entries(results).forEach(([tool, result]) => {
      console.log(`${tool.toUpperCase()}:`)
      console.log(`  Size: ${(result.size / 1024).toFixed(2)} KB`)
      console.log(`  Gzipped: ${(result.gzippedSize / 1024).toFixed(2)} KB`)
      console.log(`  Chunks: ${result.chunks}`)
      console.log(`  Assets: ${result.assets.length}`)
      console.log('')
    })

    console.log('Comparison:')
    console.log(`Fastest: ${comparison.fastest}`)
    console.log(`Smallest: ${comparison.smallest}`)
    console.log(`Most Chunks: ${comparison.mostChunks}`)

    // Lint files
    const lintResults = await buildTools.lintFiles([
      './src/index.ts',
      './src/utils.ts',
      './src/components.ts',
    ])

    console.log('\nLint Results:')
    console.log('=============')
    lintResults.forEach((result) => {
      console.log(`${result.file}:`)
      console.log(`  Errors: ${result.errors}`)
      console.log(`  Warnings: ${result.warnings}`)
      if (result.messages.length > 0) {
        console.log('  Messages:')
        result.messages.forEach((msg) => console.log(`    ${msg}`))
      }
    })
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

// Export for testing
export { BuildTools, createWebpackConfig, createViteConfig, createRollupConfig }

// Run if called directly
if (require.main === module) {
  main()
}
