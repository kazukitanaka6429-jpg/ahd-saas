/**
 * Repository Factory for Supabase
 * Creates and returns repository instances with the current Supabase client
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    RepositoryFactory,
    ResidentRepository,
    StaffRepository,
    DailyRecordRepository,
} from '../interfaces';
import { SupabaseResidentRepository } from './resident-repository';
import { SupabaseStaffRepository } from './staff-repository';

export class SupabaseRepositoryFactory implements RepositoryFactory {
    constructor(private client: SupabaseClient) { }

    getResidentRepository(): ResidentRepository {
        return new SupabaseResidentRepository(this.client);
    }

    getStaffRepository(): StaffRepository {
        return new SupabaseStaffRepository(this.client);
    }

    getDailyRecordRepository(): DailyRecordRepository {
        // TODO: Implement SupabaseDailyRecordRepository
        throw new Error('DailyRecordRepository not yet implemented');
    }
}

// Helper function to create a repository factory from a Supabase client
export function createRepositoryFactory(client: SupabaseClient): RepositoryFactory {
    return new SupabaseRepositoryFactory(client);
}
