'use server'

import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'
import { logger } from '@/lib/logger'

// ============================================
// 型定義
// ============================================

export interface ReconciliationItem {
    residentId: string
    residentName: string
    itemType: string
    yorisolValue: number
    csvValue: number
    status: 'match' | 'mismatch' | 'no_csv_data' | 'no_yorisol_data'
}

export interface ReconciliationResult {
    success: boolean
    csvType: 'SSK02' | 'CKDCSV002'
    totalItems: number
    matchCount: number
    mismatchCount: number
    noCsvDataCount: number
    noYorisolDataCount: number
    items: ReconciliationItem[]
    error?: string
}

// ============================================
// CSV列マッピング（変更しやすい設定）
// ============================================

const SSK02_COLUMNS = {
    RESIDENT_ID: 0,      // A列 - 利用者番号
    SERVICE_NAME: 29,    // AD列 - サービス種類名
    QUANTITY: 32,        // AG列 - 数量
    AMOUNT: 33,          // AH列 - 金額
}

const CKDCSV002_COLUMNS = {
    RESIDENT_ID: 0,      // A列 - 利用者番号
    MONTH: 19,           // T列 - 月（Jan/Feb/...）
    SERVICE_NAME: 61,    // BJ列 - サービス種類名
    QUANTITY: 64,        // BM列 - 数量
}

// サービス名マッチングパターン
const SERVICE_PATTERNS = {
    BREAKFAST: '朝食',
    LUNCH: '昼食',
    DINNER: '夕食',
    DAY_ACTIVITY: ['日中共生', '福祉短期入所Ⅱ'],
    NIGHT_SHIFT: '夜間配置加算',
    MEDICAL_IV_1: '重度障害者等包括支援（医療連携体制加算Ⅳ）',
    MEDICAL_IV_2: '医療連携体制加算（Ⅳ）２',
    MEDICAL_IV_3: '医療連携体制加算（Ⅳ）３',
}

// 月名変換（英語→数字）
const MONTH_MAP: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

// ============================================
// CSVパース共通関数
// ============================================

function parseCSV(buffer: Buffer): string[][] {
    // Shift_JISでデコード
    const content = iconv.decode(buffer, 'Shift_JIS')

    const records = parse(content, {
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
    }) as string[][]

    return records
}

function normalizeNumber(value: string | number | undefined | null): number {
    if (value === undefined || value === null || value === '') return 0
    const num = typeof value === 'number' ? value : parseInt(String(value).replace(/,/g, ''), 10)
    return isNaN(num) ? 0 : num
}

function normalizeResidentId(id: string | number | undefined | null): string {
    if (id === undefined || id === null) return ''
    return String(id).trim().replace(/^0+/, '') // 先頭のゼロを除去
}

// ============================================
// SSK02 突合（食事：朝食・昼食・夕食）
// ============================================

interface YorisolMealData {
    residentId: string
    residentName: string
    breakfastCount: number
    lunchCount: number
    dinnerCount: number
}

export async function reconcileSSK02(
    formData: FormData
): Promise<ReconciliationResult> {
    try {
        const file = formData.get('file') as File
        const yorisolDataJson = formData.get('yorisolData') as string

        if (!file) {
            return {
                success: false,
                csvType: 'SSK02',
                totalItems: 0,
                matchCount: 0,
                mismatchCount: 0,
                noCsvDataCount: 0,
                noYorisolDataCount: 0,
                items: [],
                error: 'ファイルがありません'
            }
        }

        const yorisolData: YorisolMealData[] = JSON.parse(yorisolDataJson || '[]')

        const arrayBuffer = await file.arrayBuffer()
        const csvBuffer = Buffer.from(arrayBuffer)
        const rows = parseCSV(csvBuffer)

        if (rows.length < 2) {
            return {
                success: false,
                csvType: 'SSK02',
                totalItems: 0,
                matchCount: 0,
                mismatchCount: 0,
                noCsvDataCount: 0,
                noYorisolDataCount: 0,
                items: [],
                error: 'CSVにデータがありません'
            }
        }

        // CSVデータをマップ化（利用者番号 + サービス名 → 数量）
        const csvMap = new Map<string, number>()

        for (let i = 1; i < rows.length; i++) { // ヘッダースキップ
            const row = rows[i]
            const residentId = normalizeResidentId(row[SSK02_COLUMNS.RESIDENT_ID])
            const serviceName = String(row[SSK02_COLUMNS.SERVICE_NAME] || '').trim()
            const quantity = normalizeNumber(row[SSK02_COLUMNS.QUANTITY])

            if (residentId && serviceName) {
                const key = `${residentId}|${serviceName}`
                csvMap.set(key, quantity)
            }
        }

        const items: ReconciliationItem[] = []

        // Yorisolデータと突合
        for (const resident of yorisolData) {
            const residentId = normalizeResidentId(resident.residentId)

            // 朝食
            const breakfastKey = `${residentId}|${SERVICE_PATTERNS.BREAKFAST}`
            const csvBreakfast = csvMap.get(breakfastKey)
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '朝食',
                yorisolValue: resident.breakfastCount,
                csvValue: csvBreakfast ?? 0,
                status: csvBreakfast === undefined ? 'no_csv_data'
                    : resident.breakfastCount === csvBreakfast ? 'match' : 'mismatch'
            })

            // 昼食
            const lunchKey = `${residentId}|${SERVICE_PATTERNS.LUNCH}`
            const csvLunch = csvMap.get(lunchKey)
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '昼食',
                yorisolValue: resident.lunchCount,
                csvValue: csvLunch ?? 0,
                status: csvLunch === undefined ? 'no_csv_data'
                    : resident.lunchCount === csvLunch ? 'match' : 'mismatch'
            })

            // 夕食
            const dinnerKey = `${residentId}|${SERVICE_PATTERNS.DINNER}`
            const csvDinner = csvMap.get(dinnerKey)
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '夕食',
                yorisolValue: resident.dinnerCount,
                csvValue: csvDinner ?? 0,
                status: csvDinner === undefined ? 'no_csv_data'
                    : resident.dinnerCount === csvDinner ? 'match' : 'mismatch'
            })
        }

        const matchCount = items.filter(i => i.status === 'match').length
        const mismatchCount = items.filter(i => i.status === 'mismatch').length
        const noCsvDataCount = items.filter(i => i.status === 'no_csv_data').length

        return {
            success: true,
            csvType: 'SSK02',
            totalItems: items.length,
            matchCount,
            mismatchCount,
            noCsvDataCount,
            noYorisolDataCount: 0,
            items
        }

    } catch (e: any) {
        logger.error('SSK02 reconciliation error', e)
        return {
            success: false,
            csvType: 'SSK02',
            totalItems: 0,
            matchCount: 0,
            mismatchCount: 0,
            noCsvDataCount: 0,
            noYorisolDataCount: 0,
            items: [],
            error: e.message
        }
    }
}

// ============================================
// CKDCSV002 突合（日中活動・夜勤加配・体制Ⅳ）
// ============================================

interface YorisolAdditionData {
    residentId: string
    residentName: string
    dayActivityCount: number
    nightShiftCount: number
    medicalIV1Count: number
    medicalIV2Count: number
    medicalIV3Count: number
}

export async function reconcileCKDCSV002(
    formData: FormData
): Promise<ReconciliationResult> {
    try {
        const file = formData.get('file') as File
        const yorisolDataJson = formData.get('yorisolData') as string
        const targetYear = parseInt(formData.get('targetYear') as string, 10)
        const targetMonth = parseInt(formData.get('targetMonth') as string, 10)

        if (!file) {
            return {
                success: false,
                csvType: 'CKDCSV002',
                totalItems: 0,
                matchCount: 0,
                mismatchCount: 0,
                noCsvDataCount: 0,
                noYorisolDataCount: 0,
                items: [],
                error: 'ファイルがありません'
            }
        }

        const yorisolData: YorisolAdditionData[] = JSON.parse(yorisolDataJson || '[]')

        const arrayBuffer = await file.arrayBuffer()
        const csvBuffer = Buffer.from(arrayBuffer)
        const rows = parseCSV(csvBuffer)

        if (rows.length < 2) {
            return {
                success: false,
                csvType: 'CKDCSV002',
                totalItems: 0,
                matchCount: 0,
                mismatchCount: 0,
                noCsvDataCount: 0,
                noYorisolDataCount: 0,
                items: [],
                error: 'CSVにデータがありません'
            }
        }

        // CSVデータをマップ化
        const csvMap = new Map<string, number>()

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            const residentId = normalizeResidentId(row[CKDCSV002_COLUMNS.RESIDENT_ID])
            const monthStr = String(row[CKDCSV002_COLUMNS.MONTH] || '').trim().substring(0, 3)
            const serviceName = String(row[CKDCSV002_COLUMNS.SERVICE_NAME] || '').trim()
            const quantity = normalizeNumber(row[CKDCSV002_COLUMNS.QUANTITY])

            // 月フィルタ
            const csvMonth = MONTH_MAP[monthStr]
            if (csvMonth && csvMonth !== targetMonth) continue

            if (residentId && serviceName) {
                const key = `${residentId}|${serviceName}`
                // 同じキーがあれば加算（複数行ある場合）
                csvMap.set(key, (csvMap.get(key) || 0) + quantity)
            }
        }

        const items: ReconciliationItem[] = []

        // Yorisolデータと突合
        for (const resident of yorisolData) {
            const residentId = normalizeResidentId(resident.residentId)

            // 日中活動（日中共生 OR 福祉短期入所Ⅱ）
            let csvDayActivity = 0
            for (const pattern of SERVICE_PATTERNS.DAY_ACTIVITY) {
                for (const [key, value] of csvMap.entries()) {
                    if (key.startsWith(`${residentId}|`) && key.includes(pattern)) {
                        csvDayActivity += value
                    }
                }
            }
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '日中活動',
                yorisolValue: resident.dayActivityCount,
                csvValue: csvDayActivity,
                status: csvDayActivity === 0 && resident.dayActivityCount === 0 ? 'match'
                    : csvDayActivity === 0 ? 'no_csv_data'
                        : resident.dayActivityCount === csvDayActivity ? 'match' : 'mismatch'
            })

            // 夜勤加配
            let csvNightShift = 0
            for (const [key, value] of csvMap.entries()) {
                if (key.startsWith(`${residentId}|`) && key.includes(SERVICE_PATTERNS.NIGHT_SHIFT)) {
                    csvNightShift += value
                }
            }
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '夜勤加配',
                yorisolValue: resident.nightShiftCount,
                csvValue: csvNightShift,
                status: csvNightShift === 0 && resident.nightShiftCount === 0 ? 'match'
                    : csvNightShift === 0 ? 'no_csv_data'
                        : resident.nightShiftCount === csvNightShift ? 'match' : 'mismatch'
            })

            // 体制Ⅳ1
            let csvIV1 = 0
            for (const [key, value] of csvMap.entries()) {
                if (key.startsWith(`${residentId}|`) && key.includes(SERVICE_PATTERNS.MEDICAL_IV_1)) {
                    csvIV1 += value
                }
            }
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '体制Ⅳ1',
                yorisolValue: resident.medicalIV1Count,
                csvValue: csvIV1,
                status: csvIV1 === 0 && resident.medicalIV1Count === 0 ? 'match'
                    : csvIV1 === 0 ? 'no_csv_data'
                        : resident.medicalIV1Count === csvIV1 ? 'match' : 'mismatch'
            })

            // 体制Ⅳ2
            let csvIV2 = 0
            for (const [key, value] of csvMap.entries()) {
                if (key.startsWith(`${residentId}|`) && key.includes(SERVICE_PATTERNS.MEDICAL_IV_2)) {
                    csvIV2 += value
                }
            }
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '体制Ⅳ2',
                yorisolValue: resident.medicalIV2Count,
                csvValue: csvIV2,
                status: csvIV2 === 0 && resident.medicalIV2Count === 0 ? 'match'
                    : csvIV2 === 0 ? 'no_csv_data'
                        : resident.medicalIV2Count === csvIV2 ? 'match' : 'mismatch'
            })

            // 体制Ⅳ3
            let csvIV3 = 0
            for (const [key, value] of csvMap.entries()) {
                if (key.startsWith(`${residentId}|`) && key.includes(SERVICE_PATTERNS.MEDICAL_IV_3)) {
                    csvIV3 += value
                }
            }
            items.push({
                residentId: resident.residentId,
                residentName: resident.residentName,
                itemType: '体制Ⅳ3',
                yorisolValue: resident.medicalIV3Count,
                csvValue: csvIV3,
                status: csvIV3 === 0 && resident.medicalIV3Count === 0 ? 'match'
                    : csvIV3 === 0 ? 'no_csv_data'
                        : resident.medicalIV3Count === csvIV3 ? 'match' : 'mismatch'
            })
        }

        const matchCount = items.filter(i => i.status === 'match').length
        const mismatchCount = items.filter(i => i.status === 'mismatch').length
        const noCsvDataCount = items.filter(i => i.status === 'no_csv_data').length

        return {
            success: true,
            csvType: 'CKDCSV002',
            totalItems: items.length,
            matchCount,
            mismatchCount,
            noCsvDataCount,
            noYorisolDataCount: 0,
            items
        }

    } catch (e: any) {
        logger.error('CKDCSV002 reconciliation error', e)
        return {
            success: false,
            csvType: 'CKDCSV002',
            totalItems: 0,
            matchCount: 0,
            mismatchCount: 0,
            noCsvDataCount: 0,
            noYorisolDataCount: 0,
            items: [],
            error: e.message
        }
    }
}

// ============================================
// CSVファイル種別自動判定
// ============================================

export async function detectCsvType(filename: string): Promise<'SSK02' | 'CKDCSV002' | 'unknown'> {
    const upper = filename.toUpperCase()
    if (upper.includes('SSK02')) return 'SSK02'
    if (upper.includes('CKDCSV002') || upper.includes('CKD')) return 'CKDCSV002'
    return 'unknown'
}
