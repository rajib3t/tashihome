import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-pulse">
      <!-- Quick Status / Operations Strip Skeleton -->
      <div class="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 p-3.5">
            <div class="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700/60 shrink-0"></div>
            <div class="space-y-1.5 flex-1">
              <div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700/60"></div>
              <div class="h-5 w-12 rounded bg-slate-300 dark:bg-slate-700"></div>
            </div>
          </div>
        }
      </div>

      <!-- KPI Metrics Cards Row -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
              <div class="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <div class="space-y-2 pt-1">
              <div class="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800"></div>
              <div class="h-7 w-36 rounded bg-slate-300 dark:bg-slate-700"></div>
            </div>
            <div class="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800/60 pt-1"></div>
          </div>
        }
      </div>

      <!-- Charts & Visual Analytics Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Chart Card -->
        <div class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="h-4 w-44 rounded bg-slate-200 dark:bg-slate-800"></div>
              <div class="h-3 w-64 rounded bg-slate-100 dark:bg-slate-800/60"></div>
            </div>
            <div class="h-8 w-28 rounded-xl bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          </div>
          <!-- Simulated Chart Bars -->
          <div class="h-56 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 dark:border-slate-800">
            @for (h of [35, 60, 45, 80, 55, 90, 70, 85, 50, 75, 95, 65]; track $index) {
              <div class="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div class="w-full max-w-[28px] rounded-t-lg bg-slate-200 dark:bg-slate-800 transition-all" [style.height]="h + '%'"></div>
                <div class="h-2.5 w-4 rounded bg-slate-100 dark:bg-slate-800/60"></div>
              </div>
            }
          </div>
        </div>

        <!-- Secondary Breakdown Card -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-6">
          <div class="space-y-2">
            <div class="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800"></div>
            <div class="h-3 w-48 rounded bg-slate-100 dark:bg-slate-800/60"></div>
          </div>
          <!-- Circular Ring Skeleton -->
          <div class="flex items-center justify-center py-4">
            <div class="h-40 w-40 rounded-full border-8 border-slate-200 dark:border-slate-800 border-t-slate-300 dark:border-t-slate-700"></div>
          </div>
          <!-- Legend Lines -->
          <div class="space-y-2.5 pt-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2"><div class="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700"></div><div class="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800"></div></div>
              <div class="h-3 w-10 rounded bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2"><div class="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700"></div><div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800"></div></div>
              <div class="h-3 w-10 rounded bg-slate-200 dark:bg-slate-800"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Table Preview Skeleton -->
      <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800"></div>
          <div class="h-7 w-24 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-800/60">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="flex items-center justify-between p-4 gap-4">
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
                <div class="space-y-1">
                  <div class="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800"></div>
                  <div class="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-850"></div>
                </div>
              </div>
              <div class="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
              <div class="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class DashboardSkeletonComponent {}
