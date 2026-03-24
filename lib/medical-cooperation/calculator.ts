
export type Visit = {
    staffId: string
    residentId: string
}

export type StaffQualification = {
    staffId: string
    isMedicalTarget: boolean // 'is_medical_target' qualification
}

/**
 * Calculate Medical Cooperation IV Unit Category for a single nurse on a specific day via their visits.
 * 
 * Rules:
 * - Nurse must have specific qualification (is_medical_target = true)
 * - Count unique residents visited by this nurse
 * - 1 resident -> IV 1
 * - 2 residents -> IV 2
 * - 3-8 residents -> IV 3 (Assumption: >8 is error or capped at 3? User said "3人以上8人以下")
 * 
 * @returns 'IV 1' | 'IV 2' | 'IV 3' | null (not eligible)
 */
export function calculateMedicalCooperationCategory(
    visits: Visit[],
    staffId: string,
    qualifications: StaffQualification[]
): 'IV 1' | 'IV 2' | 'IV 3' | null {
    // 1. Check Qualification
    const qual = qualifications.find(q => q.staffId === staffId)
    if (!qual || !qual.isMedicalTarget) {
        return null
    }

    // 2. Count Unique Residents for this Staff
    const residentsVisited = new Set<string>()
    visits.forEach(v => {
        if (v.staffId === staffId) {
            residentsVisited.add(v.residentId)
        }
    })

    const count = residentsVisited.size

    // 3. Determine Category
    if (count === 1) return 'IV 1'
    if (count === 2) return 'IV 2'
    if (count >= 3 && count <= 8) return 'IV 3'

    // Fallback: If 0 or >8 (Is >8 possible? User said "3人以上8人以下", so >8 might be strict exclusion or just falls into IV 3 logically?)
    // For now strict interpretation: 3-8. If >8, maybe return null or IV 3?
    // Usually heavily loaded nurse is still IV 3 (capped).
    // But user specifically said "3人以上8人以下". If 9 people, maybe it's invalid?
    // I will return null for >8 as per strict reading, but usually 8 is a legal cap for 1 nurse?
    // Let's assume strict for now based on user prompt.
    if (count > 8) return null

    return null
}
