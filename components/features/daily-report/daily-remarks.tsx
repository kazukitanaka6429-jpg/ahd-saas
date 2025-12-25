'use client'

import React from 'react'

export function DailyRemarks() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded-sm bg-white flex flex-col">
                <div className="bg-gray-100 p-2 text-sm font-bold border-b">
                    特記事項 (入退去・入院外泊の開始・終了日 その他請求に必要な情報のみを記入)
                </div>
                <textarea
                    className="flex-1 p-2 text-sm outline-none resize-none min-h-[100px]"
                    placeholder="入力するもの&#13;&#10;・入退去の時間&#13;&#10;・食事の内容によって金額が変わる etc"
                />
            </div>

            <div className="border rounded-sm bg-white flex flex-col">
                <div className="bg-gray-100 p-2 text-sm font-bold border-b">
                    注意事項
                </div>
                <div className="p-2 text-xs text-red-600 leading-relaxed bg-yellow-50 flex-1">
                    <p>※この業務日誌は、国保連請求・利用者実費請求の算定資料となっています。</p>
                    <p>※記入誤りは請求不備や不正請求に繋がりますので注意が必要です。</p>
                    <p>※日中活動の場合は &#10003; とサービス種別の入力が必須です。</p>
                    <p>※入院の場合は計画入院か救急搬送かの &#10003; が必須です。</p>
                </div>
            </div>
        </div>
    )
}
