import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignPackageUseCase } from './assign-package.use-case.js';
import { ok } from '../../../shared/result.js';

describe('AssignPackageUseCase', () => {
  let useCase: AssignPackageUseCase;
  let mockRepo: any;
  let mockBillingRepo: any;
  let mockPatientRepo: any;
  let mockSmsUseCase: any;

  beforeEach(() => {
    mockRepo = {
      findPlanById: vi.fn(),
      getActivePackage: vi.fn(),
      assignPackage: vi.fn(),
    };
    mockBillingRepo = {
      nextBillNo: vi.fn().mockResolvedValue(101),
      create: vi.fn().mockResolvedValue({ id: 500 }),
    };
    mockPatientRepo = {
      getUnifiedCaseData: vi.fn(),
    };
    mockSmsUseCase = {
      sendPackageAssignment: vi.fn().mockResolvedValue(ok({ success: true })),
    };

    useCase = new AssignPackageUseCase(
      mockRepo,
      mockBillingRepo,
      mockPatientRepo,
      mockSmsUseCase
    );
  });

  it('should assign package, create bill, and trigger SMS', async () => {
    const dto = {
      regid: 1001,
      packageId: 1,
      patientId: 55,
      startDate: '2026-05-05',
      startFrom: 'today' as const,
    };

    mockRepo.findPlanById.mockResolvedValue({
      id: 1,
      name: 'Diamond Plan',
      price: 5000,
      durationDays: 90,
      isActive: true,
    });

    mockPatientRepo.getUnifiedCaseData.mockResolvedValue({
      medicalCase: {
        patientName: 'Test Patient',
        mobile: '9876543210',
      }
    });

    const result = await useCase.execute(dto);

    expect(result.success).toBe(true);
    expect(mockBillingRepo.create).toHaveBeenCalled();
    expect(mockRepo.assignPackage).toHaveBeenCalled();
    
    // Check if SMS was triggered (async, so we wait a bit or check if it was called)
    // In our implementation we don't await, but for test we can check
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockSmsUseCase.sendPackageAssignment).toHaveBeenCalledWith(expect.objectContaining({
      patientName: 'Test Patient',
      packageName: 'Diamond Plan',
    }));
  });
});
