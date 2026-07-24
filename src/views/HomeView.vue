<script setup lang="ts"></script>

<template>
  <div class="min-h-screen bg-[#F3F4F6] font-sans text-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
        <header class="bg-[#111827] text-white p-6 relative overflow-hidden text-center">
          <div class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-emerald-500"></div>
          <div class="mx-auto w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl mb-3">
            🔗
          </div>
          <h1 class="text-lg font-bold">RigePay</h1>
        </header>

        <div class="p-8 text-center">
          <h2 class="text-base font-bold text-slate-900 mb-2">Payment Link Required</h2>
          <p class="text-sm text-slate-500 leading-relaxed mb-6">
            To complete a transaction, you'll need the specific payment link shared with you by the
            organization or branch.
          </p>

          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left flex gap-3">
            <span class="text-lg shrink-0">💡</span>
            <p class="text-xs text-slate-500 leading-relaxed">
              <strong class="font-semibold text-slate-800">Where to check?</strong> Look for a link sent in your
              invoice, email, or message — usually formatted as
              <span class="font-mono text-blue-600">pay.rigepay.co.ke/&lt;code&gt;</span>.
            </p>
          </div>
        </div>

        <footer class="px-8 pb-6">
          <div class="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <svg class="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
            Secured by RigePay
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>
