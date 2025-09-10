<template>
  <div class="container">
    <h1 class="title">
      Hello World <br />
      <span>Vue App</span>
    </h1>
    <p class="description">
      Built With
      <a href="https://turborepo.com" target="_blank" rel="noopener noreferrer">
        Turborepo
      </a>
      and
      <a href="https://vitejs.dev/" target="_blank" rel="noopener noreferrer">
        Vite
      </a>
    </p>

    <SomeComponent/>
    
    <div class="npm-fetcher">
      <h2>NPM Package Fetcher</h2>
      <div class="input-group">
        <input 
          v-model="packageName" 
          placeholder="Enter npm package name (e.g., vue, react, lodash)"
          class="package-input"
          @keyup.enter="fetchPackageInfo"
        />
        <button 
          @click="fetchPackageInfo" 
          :disabled="loading || !packageName.trim()"
          class="fetch-button"
        >
          {{ loading ? 'Fetching...' : 'Fetch Package' }}
        </button>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-if="packageInfo" class="package-info">
        <h3>{{ packageInfo.name }}</h3>
        <p class="package-description">{{ packageInfo.description }}</p>
        <div class="package-details">
          <span class="detail-item">
            <strong>Version:</strong> {{ packageInfo.version }}
          </span>
          <span class="detail-item">
            <strong>License:</strong> {{ packageInfo.license }}
          </span>
          <span v-if="packageInfo.author" class="detail-item">
            <strong>Author:</strong> {{ packageInfo.author.name }}
          </span>
          <span v-if="packageInfo.homepage" class="detail-item">
            <strong>Homepage:</strong> 
            <a :href="packageInfo.homepage" target="_blank" rel="noopener noreferrer">
              {{ packageInfo.homepage }}
            </a>
          </span>
        </div>
        <div v-if="packageInfo.keywords && packageInfo.keywords.length > 0" class="keywords">
          <strong>Keywords:</strong>
          <span v-for="keyword in packageInfo.keywords.slice(0, 10)" :key="keyword" class="keyword">
            {{ keyword }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SomeComponent from './SomeComponent.vue';
import { webpm, type PackageInfo } from '@webpm/webpm';

// Reactive state
const packageName = ref('');
const packageInfo = ref<PackageInfo | null>(null);
const loading = ref(false);
const error = ref('');

// Methods
const fetchPackageInfo = async () => {
  if (!packageName.value.trim()) {
    error.value = 'Please enter a package name';
    return;
  }

  // Clear previous results
  error.value = '';
  packageInfo.value = null;
  loading.value = true;

  try {
    // Validate package name format
    if (!webpm.validatePackageName(packageName.value)) {
      throw new Error('Invalid package name format');
    }

    const result = await webpm.getPackageInfo(packageName.value);
    packageInfo.value = result;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  max-width: 100%;
  margin: 0 auto;
  padding: 0 16px;
  text-align: center;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
}

.title span {
  display: inline-block;
  background-image: linear-gradient(to right, #42b883, #35495e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.description {
  color: #9ca3af;
  font-weight: 500;
}

.description a {
  color: #42b883;
  text-decoration: none;
}

.description a:hover {
  text-decoration: underline;
}

.npm-fetcher {
  margin-top: 2rem;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  max-width: 600px;
  width: 100%;
}

.npm-fetcher h2 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.package-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.package-input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.fetch-button {
  padding: 0.75rem 1.5rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.fetch-button:hover:not(:disabled) {
  background: #369870;
}

.fetch-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.error-message {
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 1rem;
}

.package-info {
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.package-info h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.package-description {
  color: #6b7280;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.package-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: block;
  color: #374151;
  font-size: 0.9rem;
}

.detail-item a {
  color: #42b883;
  text-decoration: none;
}

.detail-item a:hover {
  text-decoration: underline;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.keyword {
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}
</style>
