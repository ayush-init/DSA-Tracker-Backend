-- RemoveEnrollmentIdUniqueConstraint
-- This migration removes the unique constraint from enrollment_id field in Student table

-- Drop the unique constraint
ALTER TABLE "public"."Student" DROP CONSTRAINT "Student_enrollment_id_key";

-- Re-add the constraint without unique requirement
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_enrollment_id_key" 
CHECK (char_length(enrollment_id, 1) >= 0 OR enrollment_id IS NULL);
