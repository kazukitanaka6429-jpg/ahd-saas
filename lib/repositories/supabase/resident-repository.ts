/**
 * Supabase implementation of ResidentRepository
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Resident } from '@/types';
import {
    ResidentRepository,
    CreateResidentInput,
    UpdateResidentInput
} from '../interfaces';

export class SupabaseResidentRepository implements ResidentRepository {
    constructor(private client: SupabaseClient) { }

    async findById(id: string): Promise<Resident | null> {
        const { data, error } = await this.client
            .from('residents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async findAll(): Promise<Resident[]> {
        const { data, error } = await this.client
            .from('residents')
            .select('*')
            .order('display_id', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async findByFacilityId(facilityId: string): Promise<Resident[]> {
        const { data, error } = await this.client
            .from('residents')
            .select('*')
            .eq('facility_id', facilityId)
            .order('display_id', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async findByUnitId(unitId: string): Promise<Resident[]> {
        const { data, error } = await this.client
            .from('residents')
            .select('*')
            .eq('unit_id', unitId)
            .order('display_id', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async findBySputumSuction(facilityId: string): Promise<Resident[]> {
        const { data, error } = await this.client
            .from('residents')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('sputum_suction', true)
            .order('display_id', { ascending: true });

        if (error) return [];
        return data || [];
    }

    async create(data: CreateResidentInput): Promise<Resident> {
        const { data: result, error } = await this.client
            .from('residents')
            .insert(data)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create resident: ${error.message}`);
        }
        return result;
    }

    async update(id: string, data: UpdateResidentInput): Promise<Resident> {
        const { data: result, error } = await this.client
            .from('residents')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update resident: ${error.message}`);
        }
        return result;
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.client
            .from('residents')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete resident: ${error.message}`);
        }
    }
}
