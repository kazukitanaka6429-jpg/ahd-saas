import * as XLSX from 'xlsx'
import { VisitingNursingRecord } from '@/types/audit'
import { format, parse } from 'date-fns'

/* 
 * Helper to normalize headers and find data start
 * Excel often has header on row 1, or row 2...
 */
function findHeaderRow(sheet: XLSX.WorkSheet): unknown[] | null {
    // Simple approach: Convert to JSON array of arrays (header: 1)
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    // Find row containing "訪問日" or "利用者名"
    for (const row of json) {
        if (Array.isArray(row)) {
            const rowStr = row.map(c => String(c)).join(' ')
            if (rowStr.includes('訪問日') && rowStr.includes('利用者名')) {
                return row
            }
        }
    }
    return null
}

export function parseNursingExcel(buffer: ArrayBuffer, facilityId: string): Omit<VisitingNursingRecord, 'id' | 'created_at' | 'updated_at'>[] {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Convert to JSON with headers
    // Optimization: If we assume standard format, just use sheet_to_json.
    // If format is variable, we might need `findHeaderRow`.
    // Let's use sheet_to_json directly first, if it fails, maybe user has title rows?
    // Let's safe-guess: usually header is within first 5 rows.

    // We'll trust strict header matching isn't needed if we assume standard tabular data.
    // But excel often has "Title" in A1.
    // Let's extract raw data and filter.
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[]

    // If keys don't look like headers, maybe headers are on row 2?
    // Check first row keys.
    const firstRowKeys = Object.keys(rawData[0] || {})
    const looksLikeHeader = firstRowKeys.some(k => k.includes('訪問日') || k.includes('利用者'))

    let data = rawData
    if (!looksLikeHeader) {
        // Try range option if needed, but `sheet_to_json` usually picks top row as header.
        // If A1 is "Title", keys will be "Title", "__EMPTY"...
        // In that case, we need to find header row index.
        const headerRowArr = findHeaderRow(sheet)
        // If we found a range... managing range in XLSX is diff.
        // Alternative: Just simple mapping.
        // Let's assume standard table for now or robust mapping.
    }

    // Mapping Logic
    // We need: 訪問日, 利用者名, 開始時間, 終了時間, 主訪問者

    const results: Omit<VisitingNursingRecord, 'id' | 'created_at' | 'updated_at'>[] = []

    // Helper: Excel Dates are serial numbers usually.
    // XLSX parsed dates? usually raw numbers or strings depending on options.
    // If we rely on default, we might get numbers.
    // Better to use `raw: false` to get formatted strings? Or handle numbers.
    // Let's try parsing whatever comes.

    for (const row of data) {
        // Find keys loosely
        const keys = Object.keys(row)
        const keyDate = keys.find(k => k.includes('訪問日'))
        const keyName = keys.find(k => k.includes('利用者'))
        const keyStart = keys.find(k => k.includes('開始'))
        const keyEnd = keys.find(k => k.includes('終了'))
        const keyStaff = keys.find(k => k.includes('主訪問') || k.includes('担当')) // check '主' (Primary)
        const keyStaffSub1 = keys.find(k => k.includes('副訪問') && k.includes('1')) || keys.find(k => k.includes('副') && k.includes('①'))

        if (!keyDate || !keyName || !keyStaff) continue // Skip invalid rows

        let dateStr = row[keyDate]
        // Handle Excel Serial Date if number
        if (typeof dateStr === 'number') {
            // XLSX helper? or simple conversion.
            // (n - 25569) * 86400 * 1000
            const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000))
            dateStr = format(dateObj, 'yyyy-MM-dd')
        } else {
            // Normalize string 2025/1/1 -> 2025-01-01
            dateStr = String(dateStr).replace(/\//g, '-')
        }

        const startTime = String(row[keyStart] || "00:00")
        const endTime = String(row[keyEnd] || "00:00")

        // Formatting Time? If number (0.5 = 12:00), convert.
        const formatExcelTime = (val: any) => {
            if (typeof val === 'number') {
                // Fraction of day
                const totalMins = Math.round(val * 24 * 60)
                const h = Math.floor(totalMins / 60)
                const m = totalMins % 60
                return `${h}:${String(m).padStart(2, '0')}`
            }
            return String(val)
        }

        results.push({
            facility_id: facilityId,
            visit_date: dateStr,
            resident_name: row[keyName],
            start_time: formatExcelTime(row[keyStart]),
            end_time: formatExcelTime(row[keyEnd]),
            nursing_staff_name: row[keyStaff],
            secondary_nursing_staff_name_1: keyStaffSub1 ? row[keyStaffSub1] : null,
            secondary_nursing_staff_name_2: null,
            secondary_nursing_staff_name_3: null,
            service_type: '訪問看護' // default
        })
    }

    return results
}
