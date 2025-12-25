import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">ダッシュボード</h1>
      <p>ようこそ、{user?.email}さん</p>
      <div className="mt-4 p-4 border rounded shadow bg-white">
        <h2 className="text-xl font-semibold mb-2">現在のステータス</h2>
        <p>システムは正常に稼働しています。</p>
        {/* 今後ここにメニューやウィジェットを追加 */}
      </div>
    </div>
  )
}
