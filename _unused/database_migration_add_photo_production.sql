-- Migration: Add Photo Production business type
-- Description: Adds "Photo Production" to the organization_job_type enum
-- Date: 2025-01-16

-- Add the new Photo Production value to the enum
ALTER TYPE organization_job_type ADD VALUE IF NOT EXISTS 'Photo Production';

-- Verification query (optional, comment out in production)
-- SELECT enum_range(NULL::organization_job_type);
