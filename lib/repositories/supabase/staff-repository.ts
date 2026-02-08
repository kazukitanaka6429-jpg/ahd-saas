/**
 * Supabase implementation of StaffRepository
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    StaffRepository,
    Staff,
    CreateStaffInput,
    UpdateStaffInput
} from '../interfaces';

export class SupabaseStaffRepository implements StaffRepository {
    constructor(private client: SupabaseClient) { }

    async findById(id: string): Promise<Staff | null> {
        const { data, error } = await this.client
            .from('staffs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async findAll(): Promise<Staff[]> {
        const { data, error } = await this.client
            .from('staffs')
            .select('*')
            .order('name', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async findByFacilityId(facilityId: string): Promise<Staff[]> {
        const { data, error } = await this.client
            .from('staffs')
            .select('*')
            .eq('facility_id', facilityId)
            .order('name', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async findByOrganizationId(organizationId: string): Promise<Staff[]> {
        const { data, error } = await this.client
            .from('staffs')
            .select('*')
            .eq('organization_id', organizationId)
            .order('name', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async findActive(): Promise<Staff[]> {
        const { data, error } = await this.client
            .from('staffs')
            .select('*')
            .eq('status', 'active')
            .order('name', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async create(data: CreateStaffInput): Promise<Staff> {
        const { data: result, error } = await this.client
            .from('staffs')
            .insert(data)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create staff: ${error.message}`);
        }
        return result;
    }

    async update(id: string, data: UpdateStaffInput): Promise<Staff> {
        const { data: result, error } = await this.client
            .from('staffs')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update staff: ${error.message}`);
        }
        return result;
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.client
            .from('staffs')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete staff: ${error.message}`);
        }
    }
}
