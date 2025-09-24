<template>
  <UApp class="h-screen w-full">
    <UDashboardGroup class="grid md:flex">
      <UDashboardSidebar class="h-full flex flex-row overflow-hidden">
        <Logo class="mt-2 hidden md:block md:text-lg truncate" />
        <UIcon name="lucide:package" :size="28" class="min-w-7 min-h-7 mt-2 ml-2 md:hidden" />
        <UColorModeButton class="mt-auto w-min ml-1 mb-2" size="md" />
      </UDashboardSidebar>
      <UDashboardPanel>
        <template #header>
          <UDashboardNavbar title="Playground">
          </UDashboardNavbar>
        </template>
        <template #body>
          <RouterView />
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Logo from './components/Logo.vue';

const collapsed = ref(false);
</script>
