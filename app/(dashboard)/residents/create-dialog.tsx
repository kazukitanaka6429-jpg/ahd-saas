'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Loader2 } from 'lucide-react'
import { createResident } from './actions'
import { toast } from "sonner"
import { createClient } from '@/lib/supabase/client'
import { Facility } from '@/types'

export function CreateResidentDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])

  useEffect(() => {
    const fetchFacilities = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('facilities').select('*')
      if (data) setFacilities(data)
    }
    if (open) fetchFacilities()
  }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await createResident(formData)

    if (result.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      setOpen(false)
      toast.success('新しい利用者を登録しました。')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          利用者を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しい利用者を登録</DialogTitle>
            <DialogDescription>
              必要な情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <Input id="name" name="name" required placeholder="例: 田中 トメ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">入居日</Label>
                <Input id="start_date" name="start_date" type="date" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_insurance">主保険</Label>
                <Select name="primary_insurance">
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="国保">国保</SelectItem>
                    <SelectItem value="社保">社保</SelectItem>
                    <SelectItem value="生保単独">生保単独</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit_application_class">限度額適用区分</Label>
                <Select name="limit_application_class">
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ア">ア</SelectItem>
                    <SelectItem value="イ">イ</SelectItem>
                    <SelectItem value="ウ">ウ</SelectItem>
                    <SelectItem value="エ">エ</SelectItem>
                    <SelectItem value="オ">オ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="public_expense_1">第1公費</Label>
                <Select name="public_expense_1">
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="難病">難病</SelectItem>
                    <SelectItem value="小慢">小慢</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="public_expense_2">第2公費</Label>
                <Select name="public_expense_2">
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="有(償還払い無)">有(償還払い無)</SelectItem>
                    <SelectItem value="有(償還払い有)">有(償還払い有)</SelectItem>
                    <SelectItem value="有(自己負担無)">有(自己負担無)</SelectItem>
                    <SelectItem value="有(自己負担有)">有(自己負担有)</SelectItem>
                    <SelectItem value="無">無</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classification">区分</Label>
                <Select name="classification">
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Re-adding Care Level for completeness logic though user list removed it, keeping standard fields is safer */}
              <div className="space-y-2">
                <Label htmlFor="status">状況</Label>
                <Select name="status" defaultValue="in_facility">
                  <SelectTrigger>
                    <SelectValue placeholder="状況を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_facility">入所中</SelectItem>
                    <SelectItem value="hospitalized">入院中</SelectItem>
                    <SelectItem value="home_stay">外泊中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>加算・特記事項</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="table_7" name="table_7" />
                  <label htmlFor="table_7" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">別表7</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="table_8" name="table_8" />
                  <label htmlFor="table_8" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">別表8</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="ventilator" name="ventilator" />
                  <label htmlFor="ventilator" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">人工呼吸器</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="severe_disability_addition" name="severe_disability_addition" />
                  <label htmlFor="severe_disability_addition" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">重度加算</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sputum_suction" name="sputum_suction" />
                  <label htmlFor="sputum_suction" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">喀痰吸引</label>
                </div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
