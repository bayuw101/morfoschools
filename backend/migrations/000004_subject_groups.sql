-- Subject groups support academic grouping across administrative class sections.
-- Useful for lintas minat, remedial, enrichment, or flexible exam/course targeting.

CREATE TABLE IF NOT EXISTS subject_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    term TEXT NOT NULL CHECK (term IN ('ganjil', 'genap', 'full_year')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, subject_id, name, academic_year, term)
);

CREATE INDEX IF NOT EXISTS ix_subject_groups_tenant_year_subject
    ON subject_groups (tenant_id, academic_year, subject_id);

CREATE TABLE IF NOT EXISTS subject_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES subject_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, group_id, student_id)
);

CREATE INDEX IF NOT EXISTS ix_subject_group_members_tenant_student
    ON subject_group_members (tenant_id, student_id)
    WHERE status = 'active';
