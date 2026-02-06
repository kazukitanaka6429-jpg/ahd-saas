import iconv from 'iconv-lite'

// Helper to handle encoding (Shift-JIS vs UTF-8)
export async function decodeCsvFile(file: File, expectedKeywords: string[]): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Try UTF-8 first (standard)
    const utf8Content = iconv.decode(buffer, 'utf-8')
    if (expectedKeywords.some(k => utf8Content.includes(k))) {
        return utf8Content
    }

    // 2. Try Shift-JIS (Excel Japan default)
    const sjisContent = iconv.decode(buffer, 'Shift_JIS')
    if (expectedKeywords.some(k => sjisContent.includes(k))) {
        return sjisContent
    }

    // 3. Fallback to UTF-8 if neither matches strongly
    return utf8Content
}

// Simple CSV Parser
export function parseCsvContent(content: string): Record<string, string>[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const data = lines.slice(1).map(line => {
        // Handle quotes simply (not full RFC4180 complient but enough for simple exports)
        // If complex parsing needed, better to use a library like 'csv-parse/sync'
        // For now, simple split is likely assuming Excel CSV
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, i) => {
            row[h] = values[i] || ''
        })
        return row
    })
    return data
}
