<template>
  <div class="h-screen flex flex-col">
    <div
      id="filesystem"
      class="flex-1 min-h-0"
    >
      <ClientOnly>
        <FilesystemViewer />
      </ClientOnly>
    </div>
  </div>
</template>
