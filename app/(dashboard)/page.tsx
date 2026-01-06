import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationWidget } from '@/components/dashboard/NotificationWidget'
import { FacilityNotificationWidget } from '@/components/dashboard/FacilityNotificationWidget'

import { getCurrentStaff } from '@/lib/auth-helpers'
import { DebugToggle } from '@/components/common/debug-toggle'

import { DebugStatus } from '@/components/common/debug-status'

// Dashboard Home Component
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch staff role using helper to support multi-tenancy
  const staff = await getCurrentStaff()

  const isHQ = staff?.role === 'admin'

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">ダッシュボード</h1>
        <p className="text-gray-500">ようこそ、{user?.email}さん</p>
      </div>

      {isHQ ? (
        <div className="w-full">
          <NotificationWidget />
        </div>
      ) : (
        <div className="w-full">
          <FacilityNotificationWidget />
        </div>
      )}

      <DebugStatus user={user} staff={staff} isHQ={isHQ} />

      <DebugToggle />
    </div>
  )
}
