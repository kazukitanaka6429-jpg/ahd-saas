/**
 * Repository interfaces for data access abstraction
 * This layer decouples business logic from specific database implementations
 */

import { Resident } from '@/types';

// Base repository interface
export interface Repository<T, CreateInput, UpdateInput> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(data: CreateInput): Promise<T>;
    update(id: string, data: UpdateInput): Promise<T>;
    delete(id: string): Promise<void>;
}

// Resident-specific input types
export interface CreateResidentInput {
    facility_id: string;
    unit_id?: string | null;
    display_id?: number;
    name: string;
    status: 'in_facility' | 'hospitalized' | 'home_stay' | 'left';
    care_level?: string;
    primary_insurance?: string;
    public_expense_1?: string;
    public_expense_2?: string;
    limit_application_class?: string;
    sputum_suction: boolean;
    severe_disability_addition: boolean;
    ventilator: boolean;
    table_7: boolean;
    table_8: boolean;
    start_date?: string;
    end_date?: string;
}

export interface UpdateResidentInput extends Partial<CreateResidentInput> { }

// Resident Repository Interface
export interface ResidentRepository extends Repository<Resident, CreateResidentInput, UpdateResidentInput> {
    findByFacilityId(facilityId: string): Promise<Resident[]>;
    findByUnitId(unitId: string): Promise<Resident[]>;
    findBySputumSuction(facilityId: string): Promise<Resident[]>;
}

// Staff-specific types
export interface Staff {
    id: string;
    name: string;
    role: 'admin' | 'manager' | 'staff';
    facility_id: string | null;
    organization_id: string;
    qualification_id: string | null;
    job_types: string[];
    status: 'active' | 'retired';
    user_id: string | null;
}

export interface CreateStaffInput {
    name: string;
    role: 'admin' | 'manager' | 'staff';
    facility_id: string | null;
    qualification_id: string | null;
    job_types: string[];
}

export interface UpdateStaffInput extends Partial<CreateStaffInput> {
    status?: 'active' | 'retired';
}

// Staff Repository Interface
export interface StaffRepository extends Repository<Staff, CreateStaffInput, UpdateStaffInput> {
    findByFacilityId(facilityId: string): Promise<Staff[]>;
    findByOrganizationId(organizationId: string): Promise<Staff[]>;
    findActive(): Promise<Staff[]>;
}

// Daily Record types
export interface DailyRecord {
    id: string;
    resident_id: string;
    date: string;
    data: Record<string, any>;
    hospitalization_status?: boolean;
    overnight_stay_status?: boolean;
    meal_breakfast?: boolean;
    meal_lunch?: boolean;
    meal_dinner?: boolean;
    is_gh?: boolean;
    is_gh_night?: boolean;
    is_gh_stay?: boolean;
    emergency_transport?: boolean;
    daytime_activity?: string | null;
    other_welfare_service?: string | null;
}

export interface CreateDailyRecordInput {
    resident_id: string;
    date: string;
    data: Record<string, any>;
    hospitalization_status?: boolean;
    overnight_stay_status?: boolean;
    meal_breakfast?: boolean;
    meal_lunch?: boolean;
    meal_dinner?: boolean;
    is_gh?: boolean;
    is_gh_night?: boolean;
    is_gh_stay?: boolean;
    emergency_transport?: boolean;
    daytime_activity?: string | null;
    other_welfare_service?: string | null;
}

export interface UpdateDailyRecordInput extends Partial<CreateDailyRecordInput> { }

// Daily Record Repository Interface
export interface DailyRecordRepository {
    findByResidentAndDate(residentId: string, date: string): Promise<DailyRecord | null>;
    findByFacilityAndDate(facilityId: string, date: string): Promise<DailyRecord[]>;
    upsertMany(records: CreateDailyRecordInput[]): Promise<DailyRecord[]>;
    deleteByFacilityAndDate(facilityId: string, date: string): Promise<void>;
}

// Repository Factory Interface
export interface RepositoryFactory {
    getResidentRepository(): ResidentRepository;
    getStaffRepository(): StaffRepository;
    getDailyRecordRepository(): DailyRecordRepository;
}
