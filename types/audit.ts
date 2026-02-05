export interface AttendanceRecord {
    id: string
    facility_id: string
    staff_name: string
    work_date: string
    start_time: string
    end_time: string
    break_time_minutes: number
    created_at: string
    updated_at: string
}

export interface SpotJobRecord {
    id: string
    facility_id: string
    job_apply_id: string | null
    job_id: string | null
    staff_name: string
    provider: string
    work_date: string
    start_time: string
    end_time: string
    created_at: string
    updated_at: string
}

export interface VisitingNursingRecord {
    id: string
    facility_id: string
    resident_name: string | null
    visit_date: string
    start_time: string
    end_time: string
    nursing_staff_name: string
    secondary_nursing_staff_name_1: string | null
    secondary_nursing_staff_name_2: string | null
    secondary_nursing_staff_name_3: string | null
    service_type: string | null
    created_at: string
    updated_at: string
}

export interface ManualWorkRecord {
    id: string
    facility_id: string
    staff_id: string | null
    target_date: string
    start_time: string
    end_time: string
    is_night_shift: boolean
    note: string | null
    created_at: string
    updated_at: string
}

export interface ManualDeduction {
    id: string
    facility_id: string
    staff_id: string | null
    target_date: string
    start_time: string
    end_time: string
    reason: string | null
    created_at: string
    updated_at: string
}
