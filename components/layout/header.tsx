'use client'

import Image from 'next/image'
import { NotificationBell } from '@/components/features/notifications/notification-bell'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'

export function Header({ role, facilityName }: { role?: string, facilityName?: string }) {
    return (
        <header className="flex h-16 w-full items-center justify-between border-b bg-white px-4 md:px-6">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
                <MobileSidebar role={role} facilityName={facilityName} />
                <div className="relative h-12 w-32 md:w-48">
                    <Image
                        src="/logo.png"
                        alt="ヨリソル"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <NotificationBell />
                {/* Future: User Profile Dropdown? */}
            </div>
        </header>
    )
}
