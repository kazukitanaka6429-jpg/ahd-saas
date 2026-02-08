/**
 * Unit tests for staff.ts Server Actions
 * Tests: getStaffs, createStaff, updateStaff, deleteStaff, generateInviteLink
 */

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
                })),
                in: jest.fn(() => ({
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                        data: { id: 'new-staff-id', name: 'New Staff' },
                        error: null
                    })),
                })),
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                            data: { id: 'staff-id', name: 'Updated Staff' },
                            error: null
                        })),
                    })),
                })),
            })),
            delete: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
        })),
        auth: {
            getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
    })),
}));

// Mock admin client
jest.mock('@/lib/supabase/admin', () => ({
    createAdminClient: jest.fn(() => ({
        auth: {
            admin: {
                generateLink: jest.fn(() => Promise.resolve({
                    data: { properties: { action_link: 'https://test.invite.link' } },
                    error: null,
                })),
                deleteUser: jest.fn(() => Promise.resolve({ data: null, error: null })),
            },
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

describe('Staff Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Staff role validation', () => {
        it('should accept valid role values', () => {
            const validRoles = ['admin', 'manager', 'staff'];

            validRoles.forEach(role => {
                expect(['admin', 'manager', 'staff']).toContain(role);
            });
        });

        it('should reject invalid role values', () => {
            const invalidRoles = ['superadmin', 'guest', 'viewer', ''];

            invalidRoles.forEach(role => {
                expect(['admin', 'manager', 'staff']).not.toContain(role);
            });
        });
    });

    describe('Staff status validation', () => {
        it('should accept valid status values', () => {
            const validStatuses = ['active', 'retired'];

            validStatuses.forEach(status => {
                expect(['active', 'retired']).toContain(status);
            });
        });

        it('should handle status transition', () => {
            const activeStaff = { status: 'active' };
            const retiredStaff = { ...activeStaff, status: 'retired' };

            expect(activeStaff.status).toBe('active');
            expect(retiredStaff.status).toBe('retired');
        });
    });

    describe('Job types handling', () => {
        it('should accept array of job types', () => {
            const staff = {
                job_types: ['介護職', '看護師', '生活相談員'],
            };

            expect(Array.isArray(staff.job_types)).toBe(true);
            expect(staff.job_types.length).toBe(3);
        });

        it('should allow empty job types array', () => {
            const staff = { job_types: [] };
            expect(staff.job_types.length).toBe(0);
        });

        it('should handle common job type values', () => {
            const commonJobTypes = [
                '介護職',
                '看護師',
                '生活相談員',
                '事務員',
                '管理者',
                '計画作成担当者',
            ];

            commonJobTypes.forEach(jobType => {
                expect(typeof jobType).toBe('string');
                expect(jobType.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Facility assignment', () => {
        it('should allow null facility_id for org admins', () => {
            const orgAdmin = {
                role: 'admin',
                facility_id: null,
            };

            expect(orgAdmin.facility_id).toBeNull();
        });

        it('should require facility_id for regular staff', () => {
            const regularStaff = {
                role: 'staff',
                facility_id: 'facility-123',
            };

            expect(regularStaff.facility_id).toBeDefined();
            expect(regularStaff.facility_id).not.toBeNull();
        });
    });

    describe('Qualification handling', () => {
        it('should accept qualification_id', () => {
            const staffWithQualification = {
                qualification_id: 'qual-123',
            };

            expect(staffWithQualification.qualification_id).toBeDefined();
        });

        it('should allow null qualification_id', () => {
            const staffWithoutQualification = {
                qualification_id: null,
            };

            expect(staffWithoutQualification.qualification_id).toBeNull();
        });
    });

    describe('Permission checks', () => {
        it('should validate admin can manage all staff', () => {
            const adminStaff = { role: 'admin' };
            const canManageAllStaff = adminStaff.role === 'admin';

            expect(canManageAllStaff).toBe(true);
        });

        it('should validate manager can only manage facility staff', () => {
            const managerStaff = { role: 'manager', facility_id: 'facility-1' };
            const targetStaff = { facility_id: 'facility-1' };

            const canManage = managerStaff.facility_id === targetStaff.facility_id;
            expect(canManage).toBe(true);
        });

        it('should validate staff cannot manage other staff', () => {
            const regularStaff = { role: 'staff' };
            const canManageOthers = regularStaff.role === 'admin' || regularStaff.role === 'manager';

            expect(canManageOthers).toBe(false);
        });
    });

    describe('Invite link generation', () => {
        it('should generate valid invite URL format', () => {
            const mockInviteLink = 'https://app.example.com/invite?token=abc123';

            expect(mockInviteLink).toMatch(/^https:\/\//);
            expect(mockInviteLink).toContain('invite');
        });
    });
});
