# Database Schema & Configuration Issues - Comprehensive Fix

## Critical Issues Found

### 1. Database Schema Mismatches

#### Students Table
- **Current Schema**: `name`, `arabicName`, `challenge`
- **Required Schema**: `id`, `name`, `classGrade`, `parentPhone`, `challenge`, `avatar`
- **Issue**: Missing `classGrade`, `parentPhone`, `avatar` fields

#### Daily Records Table
- **Current Schema**: `id`, `date`, `teacher`, `studentId`, `status`, `notes`
- **Required Schema**: `id`, `studentId`, `date`, `attendance`, `participation`, `homework`, `behavior`, `notes`
- **Issue**: Completely wrong schema - missing all status fields

#### Schedule Table
- **Current Schema**: `id`, `teacher`, `time`, `day`, `students[]`
- **Required Schema**: `id`, `day`, `period`, `subject`, `classRoom`, `teacher`
- **Issue**: Wrong fields - should have `period`, `subject`, `classRoom` instead of `time`, `students[]`

#### Chat Messages Table
- **Current Schema**: `sender`, `message`
- **Required Schema**: `sender`, `text` (not `message`)
- **Issue**: Column name mismatch

#### Logs Table
- **Current Schema**: `user`, `action`, `timestamp`
- **Required Schema**: `id`, `user`, `action`, `details`, `timestamp`
- **Issue**: Missing `details` field

#### Substitutions Table
- **Current Schema**: `id`, `originalTeacher`, `substituteTeacher`, `date`, `reason`
- **Required Schema**: `id`, `date`, `scheduleItemId`, `substituteTeacher`, `reason`
- **Issue**: Wrong fields - should have `scheduleItemId` instead of `originalTeacher`

#### Settings Table
- **Current Schema**: Only `id`, `name`, `created_at`, `updated_at`
- **Required Schema**: All fields from `SchoolSettings` type
- **Issue**: Missing many fields: `logoUrl`, `ministry`, `region`, `slogan`, `whatsappPhone`, `reportGeneralMessage`, `reportLink`

### 2. API Function Bugs

#### updateUsers (Line 212)
- **Issue**: Incorrect delete query syntax using string interpolation
- **Current**: `.delete().not('id', 'in', \`(${ids.map(id => \`'${id}'\`).join(',')})\`)`
- **Should be**: Proper Supabase `.in()` method or `.not('id', 'in', ids)`

#### saveDailyRecords
- **Issue**: Records might not have `id` field, causing update failures
- **Fix needed**: Generate IDs for records without them

### 3. RLS Policy Issues

- Missing update/delete policies for `daily_records`
- Missing read policy for `logs` (can't read logs)
- Missing update/delete policies for `substitutions`
- Missing update policy for `settings`

## Complete Database Setup Script

See `sql/complete_schema.sql` for the corrected schema.

