<script setup lang="ts">
// Zero extra setup required — standard inline SVGs included below.
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between items-center px-4 py-10 relative overflow-hidden font-sans">
    
    <!-- Decorative Ambient Glow -->
    <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

    <!-- Brand Header -->
    <header class="z-10 flex items-center gap-2 mt-4">
      <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
        R
      </div>
      <span class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">RigePay</span>
    </header>

    <!-- Central Card -->
    <main class="z-10 my-auto w-full max-w-md">
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800/80 text-center relative">
        
        <!-- Icon Badge -->
        <div class="mx-auto w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>

        <!-- Heading & Message -->
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Payment Link Required
        </h1>

        <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
          To complete a transaction, you'll need to use the specific link shared with you by the business or organization.
        </p>

        <!-- Guidance Box -->
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-left mb-6">
          <div class="flex gap-3 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-normal">
              <strong class="font-semibold text-slate-800 dark:text-slate-200">Where to check?</strong> Look for a link sent in your invoice, email, or message, typically formatted as <span class="font-mono text-blue-600 dark:text-blue-400">pay.rigepay.co.ke/...</span>
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <a
            href="/"
            class="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    </main>

    <footer class="z-10 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>256-Bit SSL Encryption • Powered by RigePay</span>
    </footer>

  </div>
</template>