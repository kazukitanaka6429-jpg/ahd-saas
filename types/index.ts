export type Facility = {
    id: string
    name: string
    code: string
    settings: Record<string, any>
    created_at: string
    updated_at: string
}

export type Staff = {
    id: string
    facility_id: string
    auth_user_id: string | null
    name: string
    role: 'admin' | 'manager' | 'staff'
    status: 'active' | 'retired'
    join_date: string | null
    leave_date: string | null
    job_types: string[] | null
    qualifications: string | null
    created_at: string
    updated_at: string
}

export type Resident = {
    id: string
    facility_id: string
    name: string
    care_level: string | null
    status: 'in_facility' | 'hospitalized' | 'home_stay'
    start_date: string
    direct_debit_start_date: string | null
    primary_insurance: string | null
    limit_application_class: string | null
    public_expense_1: string | null
    public_expense_2: string | null
    table_7: boolean
    table_8: boolean
    ventilator: boolean
    classification: string | null
    severe_disability_addition: boolean
    sputum_suction: boolean
    created_at: string
    updated_at: string
}

export type FeedbackComment = {
    id: string
    report_date: string
    facility_id: string
    content: string
    author_name: string
    is_resolved: boolean
    created_at: string
}

export type FindingComment = {
    id: string

    daily_record_id?: string
    medical_record_id?: string
    json_path: string | null
    content: string
    author_name: string
    is_resolved: boolean
    created_at: string
}

export type ShortStayRecord = {
    id: string
    facility_id: string
    date: string
    resident_id: string | null
    period_note: string | null
    meal_breakfast: boolean
    meal_lunch: boolean
    meal_dinner: boolean
    is_gh: boolean
    is_gh_night: boolean
    meal_provided_lunch: boolean
    daytime_activity: string | null
    other_welfare_service: string | null
    entry_time: string | null
    exit_time: string | null
    created_at: string
    updated_at: string
}

export type DailyShift = {
    id: string
    facility_id: string
    date: string
    day_staff_ids: string[]
    evening_staff_ids: string[]
    night_staff_ids: string[]
    night_shift_plus: boolean
    created_at: string
    updated_at: string
}

export type ReportEntry = {
    id: string
    facility_id: string
    date: string
    resident_id: string
    measurement_time: string | null
    blood_pressure_systolic: number | null
    blood_pressure_diastolic: number | null
    pulse: number | null
    temperature: number | null
    meal_morning: number | null
    meal_lunch: number | null
    meal_dinner: number | null
    medication_morning: string | null
    medication_lunch: string | null
    medication_dinner: string | null
    bath_type: string | null
    bowel_movement_count: string | null
    urination_count: string | null
    created_at: string
    updated_at: string
}

export type MedicalCooperationRecord = {
    id: string
    facility_id: string
    resident_id: string
    staff_id: string | null
    date: string
    created_at: string
    updated_at: string
}

export type DailyRecord = {
    id: string
    facility_id: string
    resident_id: string
    date: string
    hospitalization_status: boolean
    overnight_stay_status: boolean
    data: Record<string, any> // JSONB
    created_at: string
    updated_at: string
}
