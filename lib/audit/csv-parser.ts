import { parse } from 'csv-parse/sync'
import { SpotJobRecord, VisitingNursingRecord, AttendanceRecord } from '@/types/audit'

// Type helpers
type RawCsvRow = Record<string, string>

// --- Spot Job Parser (Kaitekku) ---
// Headers: 案件応募ID, 案件ID, 勤務予定日, 出勤時刻_実労働, 退勤時刻_実労働, ワーカーの名前, ...
export function parseSpotJobCsv(content: string, facilityId: string): Omit<SpotJobRecord, 'id' | 'created_at' | 'updated_at'>[] {
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as RawCsvRow[]

    return records.map(row => {
        // Validation / Cleanup
        const workDate = row['勤務予定日']?.replace(/\//g, '-') // Ensure YYYY-MM-DD

        // Time columns: prefer Actual > Scheduled
        let startTime = row['出勤時刻_実労働']
        if (!startTime || startTime === '0:00' || startTime === '') startTime = row['出勤予定時刻']

        let endTime = row['退勤時刻_実労働']
        if (!endTime || endTime === '0:00' || endTime === '') endTime = row['退勤予定時刻']

        // Cleanup times (remove date part if exists, though CSV sample showed '2025/12/14 16:20')
        // Expected DB format: TIME (HH:MM:SS) or HH:MM
        // If "2025/12/14 16:20", extract "16:20"
        const extractTime = (val: string) => {
            if (!val) return '00:00'
            if (val.includes(' ')) return val.split(' ')[1]
            return val
        }

        // 休憩時間 (Spot job usually includes break, but for simple audit we use start/end. 
        // Logic: Audit calculates Total presence? Or logic subtracts break?
        // Spot Job CSV has '休憩時間(分)' column.
        // For now, schema doesn't have break_time for spot job, assuming generic.
        // User didn't request specific break subtraction for spot job yet, but "Spot Job Time" adds to base.
        // We'll stick to Start/End.

        return {
            facility_id: facilityId,
            job_apply_id: row['案件応募ID'] || null,
            job_id: row['案件ID'] || null,
            work_date: workDate,
            start_time: extractTime(startTime),
            end_time: extractTime(endTime),
            staff_name: row['ワーカーの名前'],
            provider: 'Kaitekku'
        }
    }).filter(r => r.work_date && r.staff_name) // Filter invalid
}

// --- Visiting Nursing Parser ---
// Headers: 訪問日, 利用者名, 開始時間, 終了時間, 主訪問者, 副訪問者①...
export function parseNursingCsv(content: string, facilityId: string): Omit<VisitingNursingRecord, 'id' | 'created_at' | 'updated_at'>[] {
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as RawCsvRow[]

    if (records.length > 0) {
        console.log(`Debug: CSV Headers: ${Object.keys(records[0]).join(', ')}`)
    }

    return records.map(row => {
        const visitDate = row['訪問日']?.replace(/\//g, '-')

        if (!visitDate || !row['主訪問者']) {
            // Log only first few failures to avoid spam
            // console.log("Debug: Row skipped", JSON.stringify(row))
        }

        return {
            facility_id: facilityId,
            resident_name: row['利用者名'] || null,
            visit_date: visitDate,
            start_time: row['開始時間'] || '00:00',
            end_time: row['終了時間'] || '00:00',
            nursing_staff_name: row['主訪問者'],
            secondary_nursing_staff_name_1: row['副訪問者①'] || null,
            secondary_nursing_staff_name_2: row['副訪問者②'] || null,
            secondary_nursing_staff_name_3: row['副訪問者③'] || null,
            service_type: row['サービス内容'] || null
        }
    }).filter(r => r.visit_date && r.nursing_staff_name)
}

// --- Attendance Parser (Generic) ---
// Headers: 日付, 氏名, 開始時刻, 終了時刻 (Flexible)
export function parseAttendanceCsv(content: string, facilityId: string): Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>[] {
    const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as RawCsvRow[]

    return records.map(row => {
        // Try to find columns
        const dateKey = Object.keys(row).find(k => k.includes('日') || k.toLowerCase().includes('date'))
        const nameKey = Object.keys(row).find(k => k.includes('氏名') || k.includes('名前') || k.toLowerCase().includes('name'))
        const startKey = Object.keys(row).find(k => k.includes('開始') || k.includes('出勤') || k.toLowerCase().includes('start'))
        const endKey = Object.keys(row).find(k => k.includes('終了') || k.includes('退勤') || k.toLowerCase().includes('end'))
        const breakKey = Object.keys(row).find(k => k.includes('休憩'))

        if (!dateKey || !nameKey) return null

        return {
            facility_id: facilityId,
            work_date: row[dateKey].replace(/\//g, '-'),
            staff_name: row[nameKey],
            start_time: startKey ? row[startKey] : '00:00',
            end_time: endKey ? row[endKey] : '00:00',
            break_time_minutes: breakKey ? parseInt(row[breakKey]) || 60 : 60
        }
    }).filter((r): r is Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> => r !== null)
}
