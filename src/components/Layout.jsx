import React from 'react';
import { cn } from '../lib/utils';

/**
 * macOS Sequoia-style Layout Component
 *
 * Architecture:
 * - Left Zone: Compact toolbar (72px) + Layer Panel (280px) with glassmorphism
 * - Center: Main canvas with thick material backdrop
 * - Right: Properties panel with sidebar material
 *
 * Z-index layering: Sidebars (10) > Main (5) > Background (0)
 */
export function Layout({ children, toolbar, layerPanel, properties }) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] dark:from-[#1a1a1a] dark:to-[#0a0a0a] p-3 gap-3">
            {/* Left Zone: Toolbar + Layer Panel */}
            <div className="flex gap-3 flex-shrink-0">
                {/* Compact Toolbar - Thin Material */}
                <aside
                    className="w-[72px] flex-shrink-0 flex flex-col items-center py-4 gap-3
                               bg-white/60 dark:bg-[#1e1e1e]/60
                               backdrop-blur-2xl backdrop-saturate-150
                               rounded-[14px]
                               shadow-[0px_0px_1px_rgba(0,0,0,0.4),0px_8px_24px_-4px_rgba(0,0,0,0.15)]
                               border border-black/[0.05] dark:border-white/10
                               shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]"
                    style={{
                        /* Subtle noise texture for aluminum feel */
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.015\'/%3E%3C/svg%3E")'
                    }}
                >
                    {toolbar}
                </aside>

                {/* Layer Panel - Sidebar Material */}
                <aside
                    className="w-[280px] flex-shrink-0 flex flex-col
                               bg-white/70 dark:bg-[#1e1e1e]/70
                               backdrop-blur-3xl backdrop-saturate-150
                               rounded-[14px]
                               shadow-[0px_0px_1px_rgba(0,0,0,0.4),0px_12px_32px_-6px_rgba(0,0,0,0.18)]
                               border border-black/[0.05] dark:border-white/10
                               shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]
                               overflow-hidden"
                    style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.015\'/%3E%3C/svg%3E")'
                    }}
                >
                    {layerPanel}
                </aside>
            </div>

            {/* Main Content - Thick Material Canvas */}
            <main
                className="flex-1 relative flex flex-col
                           bg-white/80 dark:bg-[#282828]/70
                           backdrop-blur-3xl
                           rounded-[14px]
                           shadow-[0px_0px_1px_rgba(0,0,0,0.3),0px_16px_48px_-8px_rgba(0,0,0,0.2)]
                           border border-black/[0.05] dark:border-white/10
                           shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]
                           overflow-hidden"
            >
                {children}
            </main>

            {/* Right Sidebar - Properties Panel */}
            <aside
                className="w-[360px] flex-shrink-0 flex flex-col
                           bg-white/70 dark:bg-[#1e1e1e]/70
                           backdrop-blur-3xl backdrop-saturate-150
                           rounded-[14px]
                           shadow-[0px_0px_1px_rgba(0,0,0,0.4),0px_12px_32px_-6px_rgba(0,0,0,0.18)]
                           border border-black/[0.05] dark:border-white/10
                           shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]
                           overflow-y-auto"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.015\'/%3E%3C/svg%3E")'
                }}
            >
                {properties}
            </aside>
        </div>
    );
}
