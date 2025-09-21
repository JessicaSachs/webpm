<template>
  <div class="package-manager">
    <div class="package-manager-header">
      <h3 class="panel-title">
        <span class="title-icon">📦</span>
        Package Manager
      </h3>
      <div class="package-status">
        <span v-if="isInstalling" class="installing-indicator">
          <span class="spinner"></span>
          Installing...
        </span>
        <span v-else class="status-text">
          {{ installedPackages.length }} {{ installedPackages.length === 1 ? 'package' : 'packages' }} installed
        </span>
      </div>
    </div>
    
    <div class="package-manager-content">
      <div class="install-section">
        <div class="input-group">
          <input 
            v-model="packageName" 
            placeholder="Package name (e.g., lodash, vue, react)"
            class="package-input"
            @keyup.enter="installPackage"
            :disabled="isInstalling"
          />
          <input 
            v-model="packageVersion" 
            placeholder="Version (e.g., latest, ^4.17.21)"
            class="version-input"
            @keyup.enter="installPackage"
            :disabled="isInstalling"
          />
          <button 
            @click="installPackage" 
            :disabled="isInstalling || !packageName.trim()"
            class="install-button"
          >
            {{ isInstalling ? 'Installing...' : 'Install' }}
          </button>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div v-if="installResult" class="install-result">
          <h4>Installation Complete</h4>
          <div class="timing-info">
            <div class="timing-item">
              <strong>Total Time:</strong> {{ formatTime(installResult.timings.totalTime) }}
            </div>
            <div class="timing-item">
              <strong>Packages:</strong> {{ installResult.totalPackages }}
            </div>
            <div class="timing-item">
              <strong>Files:</strong> {{ installResult.totalFiles }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="installed-packages">
        <h4>Installed Packages</h4>
        <div v-if="installedPackages.length === 0" class="no-packages">
          <p>No packages installed yet. Install a package to see it here.</p>
        </div>
        <div v-else class="packages-list">
          <div
            v-for="pkg in installedPackages"
            :key="pkg.name"
            class="package-item"
          >
            <div class="package-info">
              <span class="package-name">{{ pkg.name }}</span>
              <span class="package-version">{{ pkg.version }}</span>
            </div>
            <div class="package-files">
              {{ pkg.files }} files
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { webpm } from '@webpm/webpm';
import type { FetchedDependencyTree, FetchedPackage } from '@webpm/webpm';

interface InstalledPackage {
  name: string;
  version: string;
  files: number;
}

interface Props {
  onPackageInstalled?: (packages: FetchedPackage[]) => void;
}

const props = defineProps<Props>();

// Reactive state
const packageName = ref('lodash');
const packageVersion = ref('^4.17.21');
const isInstalling = ref(false);
const error = ref('');
const installResult = ref<FetchedDependencyTree | null>(null);
const installedPackages = ref<InstalledPackage[]>([]);

// Methods
const installPackage = async () => {
  if (!packageName.value.trim()) {
    error.value = 'Please enter a package name';
    return;
  }

  // Clear previous results
  error.value = '';
  installResult.value = null;
  isInstalling.value = true;

  try {
    // Validate package name format
    if (!webpm.validatePackageName(packageName.value)) {
      throw new Error('Invalid package name format');
    }

    const result = await webpm.installAndFetch(packageName.value, {
      version: packageVersion.value,
      onResult: (fetchedTree: FetchedDependencyTree) => {
        // This callback is called when the installation is complete
        console.log(`Installed package tree with ${fetchedTree.totalPackages} packages`);
        
        // Notify parent component about the installed packages
        if (props.onPackageInstalled && fetchedTree.allFetchedPackages) {
          const packages = Array.from(fetchedTree.allFetchedPackages.values());
          props.onPackageInstalled(packages);
        }
      }
    });

    if (result) {
      installResult.value = result;
      
      // Update installed packages list
      const newPackages: InstalledPackage[] = [];
      if (result.allFetchedPackages) {
        result.allFetchedPackages.forEach((pkg: FetchedPackage) => {
          if (pkg.extractedFiles.manifest) {
            const manifest = pkg.extractedFiles.manifest as Record<string, any>;
            newPackages.push({
              name: manifest.name || 'unknown',
              version: manifest.version || 'unknown',
              files: pkg.extractedFiles.files.length
            });
          }
        });
      }
      
      // Merge with existing packages (avoid duplicates)
      const existingNames = new Set(installedPackages.value.map(p => p.name));
      const uniqueNewPackages = newPackages.filter(p => !existingNames.has(p.name));
      installedPackages.value.push(...uniqueNewPackages);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred';
  } finally {
    isInstalling.value = false;
  }
};

const formatTime = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};
</script>

<style scoped>
.package-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

.package-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f0f6fc;
}

.title-icon {
  font-size: 1.1rem;
}

.package-status {
  font-size: 0.9rem;
  color: #7d8590;
}

.installing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #30363d;
  border-top: 2px solid #58a6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.package-manager-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.install-section {
  background: #161b22;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #30363d;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.package-input {
  flex: 2;
  padding: 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 0.9rem;
}

.package-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
}

.version-input {
  flex: 1;
  padding: 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 0.9rem;
}

.version-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
}

.install-button {
  padding: 0.75rem 1rem;
  background: #238636;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.install-button:hover:not(:disabled) {
  background: #2ea043;
}

.install-button:disabled {
  background: #484f58;
  cursor: not-allowed;
}

.error-message {
  padding: 0.75rem;
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid #f85149;
  border-radius: 6px;
  color: #f85149;
  font-size: 0.9rem;
}

.install-result {
  background: rgba(56, 139, 253, 0.1);
  border: 1px solid #388bfd;
  border-radius: 6px;
  padding: 1rem;
}

.install-result h4 {
  margin: 0 0 0.75rem 0;
  color: #58a6ff;
  font-size: 1rem;
}

.timing-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timing-item {
  font-size: 0.9rem;
  color: #e6edf3;
}

.timing-item strong {
  color: #f0f6fc;
}

.installed-packages {
  background: #161b22;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #30363d;
}

.installed-packages h4 {
  margin: 0 0 1rem 0;
  color: #f0f6fc;
  font-size: 1rem;
}

.no-packages {
  text-align: center;
  color: #7d8590;
  font-size: 0.9rem;
  padding: 1rem;
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.package-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #0d1117;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.package-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.package-name {
  font-weight: 500;
  color: #f0f6fc;
  font-size: 0.9rem;
}

.package-version {
  font-size: 0.8rem;
  color: #7d8590;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.package-files {
  font-size: 0.8rem;
  color: #7d8590;
}

/* Scrollbar styling */
.package-manager-content::-webkit-scrollbar {
  width: 6px;
}

.package-manager-content::-webkit-scrollbar-track {
  background: #0d1117;
}

.package-manager-content::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

.package-manager-content::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
</style>
