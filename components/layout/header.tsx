'use client'

import Image from 'next/image'
import { NotificationBell } from '@/components/features/notifications/notification-bell'

export function Header() {
    return (
        <header className="flex h-16 w-full items-center justify-between border-b bg-white px-6">
            {/* Logo Section */}
            <div className="flex items-center">
                <div className="relative h-12 w-48">
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
