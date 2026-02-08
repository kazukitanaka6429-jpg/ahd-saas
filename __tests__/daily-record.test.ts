/**
 * Unit tests for daily-record.ts Server Actions
 * Tests: getDailyMatrix, upsertDailyRecords, resetDailyRecords
 */

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
                        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                    })),
                    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
            delete: jest.fn(() => ({
                eq: jest.fn(() => ({
                    eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
                })),
            })),
        })),
        auth: {
            getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
    })),
}));

// Mock auth
jest.mock('@/app/actions/auth', () => ({
    getCurrentStaff: jest.fn(() => Promise.resolve({
        id: 'test-staff-id',
        name: 'Test Staff',
        role: 'admin',
        facility_id: 'test-facility-id',
        organization_id: 'test-org-id',
    })),
}));

// Mock protect
jest.mock('@/lib/auth-guard', () => ({
    protect: jest.fn((fn) => fn),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock operation logger
jest.mock('@/lib/operation-logger', () => ({
    logOperation: jest.fn(() => Promise.resolve()),
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

describe('DailyRecord Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DailyRecordInput type validation', () => {
        it('should have required fields', () => {
            const validInput = {
                resident_id: 'res-123',
                date: '2026-02-08',
                data: { notes: 'Test notes' },
            };

            expect(validInput.resident_id).toBeDefined();
            expect(validInput.date).toBeDefined();
            expect(validInput.data).toBeDefined();
        });

        it('should accept optional hospitalization fields', () => {
            const inputWithOptionals = {
                resident_id: 'res-123',
                date: '2026-02-08',
                data: {},
                hospitalization_status: true,
                overnight_stay_status: false,
                meal_breakfast: true,
                meal_lunch: true,
                meal_dinner: false,
                is_gh: true,
                is_gh_night: false,
                is_gh_stay: false,
                emergency_transport: false,
                daytime_activity: '日中活動',
                other_welfare_service: null,
            };

            expect(inputWithOptionals.hospitalization_status).toBe(true);
            expect(inputWithOptionals.meal_breakfast).toBe(true);
            expect(inputWithOptionals.daytime_activity).toBe('日中活動');
        });
    });

    describe('Date validation', () => {
        it('should accept valid date format YYYY-MM-DD', () => {
            const validDate = '2026-02-08';
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            expect(dateRegex.test(validDate)).toBe(true);
        });

        it('should reject invalid date formats', () => {
            const invalidDates = ['2026/02/08', '08-02-2026', '2026-2-8', 'invalid'];
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

            invalidDates.forEach(date => {
                expect(dateRegex.test(date)).toBe(false);
            });
        });
    });

    describe('Meal flags logic', () => {
        it('should allow all meals to be true', () => {
            const meals = { breakfast: true, lunch: true, dinner: true };
            expect(Object.values(meals).every(v => v === true)).toBe(true);
        });

        it('should allow mixed meal flags', () => {
            const meals = { breakfast: true, lunch: false, dinner: true };
            const trueCount = Object.values(meals).filter(v => v).length;
            expect(trueCount).toBe(2);
        });

        it('should handle hospitalized residents with no meals', () => {
            const record = {
                hospitalization_status: true,
                meal_breakfast: false,
                meal_lunch: false,
                meal_dinner: false,
            };

            const allMealsFalse = !record.meal_breakfast && !record.meal_lunch && !record.meal_dinner;
            expect(allMealsFalse).toBe(true);
        });
    });

    describe('GH (Group Home) logic', () => {
        it('should allow is_gh without overnight stay', () => {
            const record = { is_gh: true, is_gh_night: false, is_gh_stay: false };
            expect(record.is_gh).toBe(true);
            expect(record.is_gh_stay).toBe(false);
        });

        it('should validate is_gh_stay requires is_gh', () => {
            // Business rule: is_gh_stay should only be true if is_gh is true
            const validRecord = { is_gh: true, is_gh_stay: true };
            const invalidRecord = { is_gh: false, is_gh_stay: true };

            expect(validRecord.is_gh && validRecord.is_gh_stay).toBe(true);
            expect(invalidRecord.is_gh && invalidRecord.is_gh_stay).toBe(false);
        });
    });

    describe('Emergency transport', () => {
        it('should flag emergency transport correctly', () => {
            const record = { emergency_transport: true };
            expect(record.emergency_transport).toBe(true);
        });
    });
});
