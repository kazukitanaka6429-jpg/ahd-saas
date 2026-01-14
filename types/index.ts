import { Database } from './database'

// Database Aliases
export type DbTables = Database['public']['Tables']
export type DbEnums = Database['public']['Enums']

export type Organization = DbTables['organizations']['Row']
export type Facility = DbTables['facilities']['Row']
export type Qualification = DbTables['qualifications']['Row']

export type Staff = DbTables['staffs']['Row'] & {
    // UI Helpers (Optional joins)
    qualification_name?: string
}

export type StaffWithFacility = Staff & {
    facilities: {
        name: string
    } | null
}

export type StaffWithRelations = Staff & {
    facilities: {
        name: string
    } | null
    qualifications: {
        name: string
    } | null
}

export type Resident = DbTables['residents']['Row']

// Daily Record (with Typed Data JSONB)
export interface DailyRecordData {
    daytime_activity?: string | boolean | null
    other_welfare_service?: string | null

    // Meals
    meal_breakfast?: boolean
    meal_lunch?: boolean
    meal_dinner?: boolean

    // Status Flags
    is_gh?: boolean
    is_gh_night?: boolean
    is_gh_stay?: boolean
    emergency_transport?: boolean
    hospitalization_status?: boolean
    overnight_stay_status?: boolean

    // Vitals
    temp?: number
    bp_systolic?: number
    bp_diastolic?: number
    pulse?: number
    spo2?: number

    // Care
    care_notes?: string

    // Medical Manual Override
    medical_manual_level?: number | null // 1, 2, 3
}

export type DailyRecord = DbTables['daily_records']['Row'] & {
    data: DailyRecordData
} & Partial<DailyRecordData> // Allow top-level access to data fields for convenience

export type MedicalCooperationRecord = DbTables['medical_cooperation_records']['Row']
export type ShortStayRecord = DbTables['short_stay_records']['Row']
export type ExternalBillingImport = DbTables['external_billing_imports']['Row']

// Custom Types for App Logic
export type DailyShift = DbTables['daily_shifts']['Row']

// Finding Comments (for daily records, medical records, short stay records)
export interface FindingComment {
    id: string
    daily_record_id?: string
    medical_record_id?: string
    short_stay_record_id?: string
    json_path: string
    comment: string
    content: string
    author_name: string
    is_resolved: boolean
    created_at: string
    updated_at: string
}

// Feedback Comments (for daily report feedback)
export interface FeedbackComment {
    id: string
    record_id: string
    author_id: string
    author_name: string
    content: string
    is_resolved: boolean
    created_at: string
}

// Validation Types
export interface ValidationError {
    id: string
    residentId: string
    residentName: string
    field: string
    message: string
}

export interface ValidationWarning {
    id: string
    residentId: string
    residentName: string
    field: string
    message: string
}

export interface ValidationResult {
    errors: ValidationError[]
    warnings: ValidationWarning[]
    isValid: boolean
}

// HQ Matrix Types
export type HqMatrixRow = {
    key: string
    label: string
    dailyValues: boolean[]
    saasCount: number
    csvCount: number
    status: 'match' | 'mismatch' | 'no_data'
}

export type ResidentMatrixData = {
    resident: Resident
    rows: HqMatrixRow[]
}
// Stay Management Types
export type StayPeriod = {
    start: string | null
    end: string | null
    type: 'hospitalization' | 'overnight_stay' | 'overnight'
}

export type ResidentStayData = {
    residentId: string
    residentName: string
    facilityName: string
    enrollmentDays: number
    periods: (StayPeriod | null)[]
}

export interface ShortStayRow {
    residentId: string
    residentName: string
    records: Record<string, ShortStayRecord | null>
}
