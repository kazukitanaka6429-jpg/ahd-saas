import { createClient } from '@/lib/supabase/server'
import { DailyRecord, DbTables } from '@/types'
import { SupabaseClient } from '@supabase/supabase-js'

export type DailyRecordInput = {
    organization_id: string
    facility_id: string
    resident_id: string
    date: string
    data: Record<string, any>
    evening_staff_ids?: any
    updated_at?: string
}

export interface IDailyRecordRepository {
    findById(id: string): Promise<DailyRecord | null>
    findByDateAndFacility(facilityId: string, date: string): Promise<DailyRecord[]>
    findByDateRange(facilityId: string, startDate: string, endDate: string): Promise<DailyRecord[]>
    findByResidentAndDateRange(residentId: string, startDate: string, endDate: string): Promise<DailyRecord[]>
    findMostRecentByResident(residentId: string): Promise<DailyRecord | null>
    upsert(records: DailyRecordInput[]): Promise<void>
    deleteByDateAndFacility(facilityId: string, date: string): Promise<void>
}

export class SupabaseDailyRecordRepository implements IDailyRecordRepository {
    private getClient(): Promise<SupabaseClient> {
        return createClient()
    }

    async findById(id: string): Promise<DailyRecord | null> {
        const supabase = await this.getClient()
        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('DailyRecordRepository.findById error:', error)
            return null
        }
        return data as DailyRecord
    }

    async findByDateAndFacility(facilityId: string, date: string): Promise<DailyRecord[]> {
        const supabase = await this.getClient()
        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('date', date)

        if (error) throw error
        return (data || []) as DailyRecord[]
    }

    async findByDateRange(facilityId: string, startDate: string, endDate: string): Promise<DailyRecord[]> {
        const supabase = await this.getClient()
        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('facility_id', facilityId)
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) throw error
        return (data || []) as DailyRecord[]
    }

    async findByResidentAndDateRange(residentId: string, startDate: string, endDate: string): Promise<DailyRecord[]> {
        const supabase = await this.getClient()
        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('resident_id', residentId)
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) throw error
        return (data || []) as DailyRecord[]
    }

    async findMostRecentByResident(residentId: string): Promise<DailyRecord | null> {
        const supabase = await this.getClient()
        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('resident_id', residentId)
            .order('date', { ascending: false })
            .limit(1)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // No rows found
            throw error
        }
        return data as DailyRecord
    }

    async upsert(records: DailyRecordInput[]): Promise<void> {
        if (records.length === 0) return

        const supabase = await this.getClient()
        const { error } = await supabase
            .from('daily_records')
            .upsert(records, { onConflict: 'resident_id, date' })

        if (error) throw error
    }

    async deleteByDateAndFacility(facilityId: string, date: string): Promise<void> {
        const supabase = await this.getClient()
        const { error } = await supabase
            .from('daily_records')
            .delete()
            .eq('facility_id', facilityId)
            .eq('date', date)

        if (error) throw error
    }
}
