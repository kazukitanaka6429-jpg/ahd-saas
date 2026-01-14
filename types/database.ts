export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string
                    name: string
                    code: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    code: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    code?: string
                    created_at?: string
                }
            }
            facilities: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    code: string
                    provider_number: string | null
                    settings: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    code: string
                    provider_number?: string | null
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    code?: string
                    provider_number?: string | null
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            staffs: {
                Row: {
                    id: string
                    organization_id: string
                    facility_id: string | null
                    auth_user_id: string | null
                    name: string
                    email: string | null
                    role: 'admin' | 'manager' | 'staff'
                    status: 'active' | 'retired'
                    qualification_id: string | null
                    qualifications_text: string | null
                    job_types: string[] | null
                    invite_token: string | null
                    join_date: string | null
                    leave_date: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    facility_id?: string | null
                    auth_user_id?: string | null
                    name: string
                    email?: string | null
                    role?: 'admin' | 'manager' | 'staff'
                    status?: 'active' | 'retired'
                    qualification_id?: string | null
                    qualifications_text?: string | null
                    job_types?: string[] | null
                    invite_token?: string | null
                    join_date?: string | null
                    leave_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    facility_id?: string | null
                    auth_user_id?: string | null
                    name?: string
                    email?: string | null
                    role?: 'admin' | 'manager' | 'staff'
                    status?: 'active' | 'retired'
                    qualification_id?: string | null
                    qualifications_text?: string | null
                    job_types?: string[] | null
                    invite_token?: string | null
                    join_date?: string | null
                    leave_date?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            residents: {
                Row: {
                    id: string
                    facility_id: string
                    name: string
                    status: 'in_facility' | 'hospitalized' | 'home_stay' | 'left'
                    care_level: string | null
                    primary_insurance: string | null
                    public_expense_1: string | null
                    public_expense_2: string | null
                    limit_application_class: string | null
                    sputum_suction: boolean
                    severe_disability_addition: boolean
                    ventilator: boolean
                    table_7: boolean
                    table_8: boolean
                    start_date: string | null
                    end_date: string | null
                    display_id: number | null
                    unit_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    facility_id: string
                    name: string
                    status?: 'in_facility' | 'hospitalized' | 'home_stay' | 'left'
                    care_level?: string | null
                    primary_insurance?: string | null
                    public_expense_1?: string | null
                    public_expense_2?: string | null
                    limit_application_class?: string | null
                    sputum_suction?: boolean
                    severe_disability_addition?: boolean
                    ventilator?: boolean
                    table_7?: boolean
                    table_8?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    display_id?: number | null
                    organization_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    facility_id?: string
                    name?: string
                    status?: 'in_facility' | 'hospitalized' | 'home_stay' | 'left'
                    care_level?: string | null
                    primary_insurance?: string | null
                    public_expense_1?: string | null
                    public_expense_2?: string | null
                    limit_application_class?: string | null
                    sputum_suction?: boolean
                    severe_disability_addition?: boolean
                    ventilator?: boolean
                    table_7?: boolean
                    table_8?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    display_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            daily_records: {
                Row: {
                    id: string
                    organization_id: string
                    facility_id: string
                    resident_id: string
                    date: string
                    data: Json
                    evening_staff_ids: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    facility_id: string
                    resident_id: string
                    date: string
                    data?: Json
                    evening_staff_ids?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    facility_id?: string
                    resident_id?: string
                    date?: string
                    data?: Json
                    evening_staff_ids?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            daily_shifts: {
                Row: {
                    id: string
                    facility_id: string
                    date: string
                    day_staff_ids: string[] | null
                    night_staff_ids: string[] | null
                    night_shift_plus: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    facility_id: string
                    date: string
                    day_staff_ids?: string[] | null
                    night_staff_ids?: string[] | null
                    night_shift_plus?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    facility_id?: string
                    date?: string
                    day_staff_ids?: string[] | null
                    night_staff_ids?: string[] | null
                    night_shift_plus?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            medical_coord_v_daily: {
                Row: {
                    id: string
                    facility_id: string
                    date: string
                    nurse_count: number
                    calculated_units: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    facility_id: string
                    date: string
                    nurse_count?: number
                    calculated_units?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    facility_id?: string
                    date?: string
                    nurse_count?: number
                    calculated_units?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            external_billing_imports: {
                Row: {
                    id: number
                    facility_id: string
                    target_month: string
                    resident_name: string
                    item_name: string
                    quantity: number
                    amount: number
                    created_at: string
                }
                Insert: {
                    id?: number
                    facility_id: string
                    target_month: string
                    resident_name: string
                    item_name: string
                    quantity: number
                    amount?: number
                    created_at?: string
                }
                Update: {
                    id?: number
                    facility_id?: string
                    target_month?: string
                    resident_name?: string
                    item_name?: string
                    quantity?: number
                    amount?: number
                    created_at?: string
                }
            }
            medical_cooperation_records: {
                Row: {
                    id: string
                    facility_id: string
                    resident_id: string
                    date: string
                    staff_id: string | null
                    medical_coord_v_daily_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    facility_id: string
                    resident_id: string
                    date: string
                    staff_id?: string | null
                    medical_coord_v_daily_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    facility_id?: string
                    resident_id?: string
                    date?: string
                    staff_id?: string | null
                    medical_coord_v_daily_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            qualifications: {
                Row: {
                    id: string
                    name: string
                    is_medical_coord_iv_target: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    is_medical_coord_iv_target?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    is_medical_coord_iv_target?: boolean
                    created_at?: string
                }
            }
            short_stay_records: {
                Row: {
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
                Insert: {
                    id?: string
                    facility_id: string
                    date: string
                    resident_id?: string | null
                    period_note?: string | null
                    meal_breakfast?: boolean
                    meal_lunch?: boolean
                    meal_dinner?: boolean
                    is_gh?: boolean
                    is_gh_night?: boolean
                    meal_provided_lunch?: boolean
                    daytime_activity?: string | null
                    other_welfare_service?: string | null
                    entry_time?: string | null
                    exit_time?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    facility_id?: string
                    date?: string
                    resident_id?: string | null
                    period_note?: string | null
                    meal_breakfast?: boolean
                    meal_lunch?: boolean
                    meal_dinner?: boolean
                    is_gh?: boolean
                    is_gh_night?: boolean
                    meal_provided_lunch?: boolean
                    daytime_activity?: string | null
                    other_welfare_service?: string | null
                    entry_time?: string | null
                    exit_time?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            medical_coord_v_records: {
                Row: {
                    id: string
                    organization_id: string
                    facility_id: string
                    resident_id: string
                    staff_id: string
                    date: string
                    start_time: string | null
                    end_time: string | null
                    duration_minutes: number | null
                    care_contents: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    facility_id: string
                    resident_id: string
                    staff_id: string
                    date: string
                    start_time?: string | null
                    end_time?: string | null
                    duration_minutes?: number | null
                    care_contents?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    facility_id?: string
                    resident_id?: string
                    staff_id?: string
                    date?: string
                    start_time?: string | null
                    end_time?: string | null
                    duration_minutes?: number | null
                    care_contents?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            medical_coord_iv_records: {
                Row: {
                    id: string
                    organization_id: string
                    facility_id: string
                    staff_id: string
                    date: string
                    assigned_resident_count: number
                    classification: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    facility_id: string
                    staff_id: string
                    date: string
                    assigned_resident_count?: number
                    classification?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    facility_id?: string
                    staff_id?: string
                    date?: string
                    assigned_resident_count?: number
                    classification?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            staff_role: 'admin' | 'manager' | 'staff'
            staff_status: 'active' | 'retired'
            resident_status: 'in_facility' | 'hospitalized' | 'home_stay' | 'left'
        }
    }
}
