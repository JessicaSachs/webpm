// MkStack CLI Example - TypeScript exercises
import { Command } from 'commander'

interface CliOptions {
  verbose?: boolean
  config?: string
}

class StackCLI {
  private program: Command

  constructor() {
    this.program = new Command()
    this.setupCommands()
  }

  private setupCommands(): void {
    this.program
      .name('mkstack')
      .description('Modern stack CLI tool')
      .version('1.0.0')

    this.program
      .command('init')
      .description('Initialize a new stack')
      .option('-c, --config <path>', 'Config file path')
      .action(this.handleInit.bind(this))

    this.program
      .command('deploy')
      .description('Deploy the stack')
      .option('-v, --verbose', 'Verbose output')
      .action(this.handleDeploy.bind(this))
  }

  private handleInit(options: CliOptions): void {
    console.log('Initializing stack...')
    if (options.config) {
      console.log(`Using config: ${options.config}`)
    }
  }

  private handleDeploy(options: CliOptions): void {
    console.log('Deploying stack...')
    if (options.verbose) {
      console.log('Verbose mode enabled')
    }
  }

  run(): void {
    this.program.parse()
  }
}

// Usage
const cli = new StackCLI()
cli.run()
