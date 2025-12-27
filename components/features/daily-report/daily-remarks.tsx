'use client'

import React from 'react'

export function DailyRemarks() {
    return (
        <div className="flex flex-col md:flex-row gap-4 mt-6 h-[200px]">
            {/* Left: 70% */}
            <div className="border border-black rounded-sm bg-white flex flex-col flex-[7]">
                <div className="bg-gray-100 p-2 text-sm font-bold border-b border-black">
                    特記事項 (入退去・入院外泊の開始・終了日 その他請求に必要な情報のみを記入)
                </div>
                <textarea
                    className="flex-1 p-2 text-sm outline-none resize-none"
                    placeholder="入力するもの&#13;&#10;・入退去の時間&#13;&#10;・食事の内容によって金額が変わる etc&#13;&#10;※請求金額に係る事案を記載してください。"
                />
            </div>

            {/* Right: 30% */}
            <div className="border border-black rounded-sm bg-white flex flex-col flex-[3]">
                <div className="bg-gray-100 p-2 text-sm font-bold border-b border-black">
                    注意事項
                </div>
                <div className="p-2 text-xs text-red-600 leading-relaxed bg-yellow-50 flex-1 overflow-y-auto">
                    <p>※この業務日誌は、国保連請求・利用者実費請求の算定資料となっています。</p>
                    <p>※記入誤りは請求不備や不正請求に繋がりますので注意が必要です。</p>
                    <p>※日中活動の場合は &#10003; とサービス種別の入力が必須です。</p>
                    <p>※入院の場合は計画入院か救急搬送かの &#10003; が必須です。</p>
                </div>
            </div>
        </div>
    )
}
