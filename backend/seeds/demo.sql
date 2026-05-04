-- Demo data for LMS Morfosis local evaluation.
-- Idempotent: safe to re-run after all migrations 000001-000010 are applied.

BEGIN;

-- Stable demo IDs exported by scripts/smoke_demo.sh.
INSERT INTO tenants (id, name, slug, province, plan, status, student_cap)
VALUES ('00000000-0000-4000-8000-000000000001', 'SMA Morfosis Demo', 'morfosis-demo-school', 'DKI Jakarta', 'Low Spec VPS', 'active', 500)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, status='active', updated_at=now();

-- password_hash = bcrypt('morfosis123') for all demo users
INSERT INTO users (id, email, name, status, password_hash) VALUES
('00000000-0000-4000-8000-000000000101', 'admin@morfosis.demo', 'Admin Demo', 'active', '$2a$10$B9x0K1HbCUn.61/DeZPVHeQwSA7moOJ2nWKACRPmZnLMK3Ozt9TRe'),
('00000000-0000-4000-8000-000000000102', 'guru.biologi@morfosis.demo', 'Ibu Ratna Biologi', 'active', '$2a$10$B9x0K1HbCUn.61/DeZPVHeQwSA7moOJ2nWKACRPmZnLMK3Ozt9TRe'),
('00000000-0000-4000-8000-000000000201', 'alya@morfosis.demo', 'Alya Putri', 'active', '$2a$10$B9x0K1HbCUn.61/DeZPVHeQwSA7moOJ2nWKACRPmZnLMK3Ozt9TRe'),
('00000000-0000-4000-8000-000000000202', 'bima@morfosis.demo', 'Bima Pratama', 'active', '$2a$10$B9x0K1HbCUn.61/DeZPVHeQwSA7moOJ2nWKACRPmZnLMK3Ozt9TRe')
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, status='active', password_hash=EXCLUDED.password_hash, updated_at=now();

INSERT INTO tenant_users (tenant_id, user_id, role) VALUES
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','admin'),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102','teacher'),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000201','student'),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000202','student')
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role=EXCLUDED.role;

INSERT INTO students (id, tenant_id, user_id, nisn, name, status, guardian_name, guardian_contact) VALUES
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000201','0012345678','Alya Putri','active','Orang Tua Alya','081200000001'),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000202','0012345679','Bima Pratama','active','Orang Tua Bima','081200000002')
ON CONFLICT (tenant_id, nisn) DO UPDATE SET name=EXCLUDED.name, status='active', updated_at=now();

INSERT INTO class_sections (id, tenant_id, name, grade_level, academic_year, homeroom_teacher_id, status)
VALUES ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000001','X IPA 1','10','2026/2027','00000000-0000-4000-8000-000000000102','active')
ON CONFLICT (tenant_id, name, academic_year) DO UPDATE SET status='active', updated_at=now();

INSERT INTO student_class_enrollments (tenant_id, student_id, class_section_id, academic_year, active) VALUES
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2026/2027',true),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000401','2026/2027',true)
ON CONFLICT (tenant_id, student_id, academic_year) WHERE active DO UPDATE SET class_section_id=EXCLUDED.class_section_id;

INSERT INTO subjects (id, tenant_id, code, name, group_name, status)
VALUES ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001','BIO-X','Biologi','MIPA','active')
ON CONFLICT (tenant_id, code) DO UPDATE SET name=EXCLUDED.name, status='active', updated_at=now();

INSERT INTO course_offerings (id, tenant_id, subject_id, class_section_id, academic_year, term, status)
VALUES ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000401','2026/2027','ganjil','active')
ON CONFLICT (tenant_id, subject_id, class_section_id, academic_year, term) DO UPDATE SET status='active', updated_at=now();

INSERT INTO teaching_assignments (id, tenant_id, course_offering_id, teacher_id, role, status)
VALUES ('00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000102','primary','active')
ON CONFLICT (tenant_id, course_offering_id, teacher_id) DO UPDATE SET role='primary', status='active', updated_at=now();

INSERT INTO courses (id, tenant_id, course_offering_id, title, description, status)
VALUES ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000601','Biologi X - Sel dan Jaringan','Materi demo metadata-only untuk uji LMS Morfosis.','published')
ON CONFLICT (tenant_id, course_offering_id, title) DO UPDATE SET status='published', updated_at=now();

INSERT INTO course_modules (id, tenant_id, course_id, title, position, status)
VALUES ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000701','Struktur Sel',1,'published')
ON CONFLICT (tenant_id, course_id, position) DO UPDATE SET title=EXCLUDED.title, status='published', updated_at=now();

INSERT INTO course_resources (id, tenant_id, module_id, resource_type, title, external_url, provider, position, status)
VALUES ('00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000702','video','Video Struktur Sel','https://youtube.com/watch?v=demo','youtube',1,'active')
ON CONFLICT (tenant_id, module_id, position) DO UPDATE SET title=EXCLUDED.title, status='active', updated_at=now();

INSERT INTO course_progress_events (id, tenant_id, course_id, module_id, resource_id, student_id, event_type, metadata)
VALUES ('00000000-0000-4000-8000-000000000704','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000301','completed','{"source":"demo_seed"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO exams (id, tenant_id, title, subject_name, status, duration_minutes, security_mode, created_by)
VALUES ('00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000001','Ulangan Biologi: Sel','Biologi','running',60,'secure_required','00000000-0000-4000-8000-000000000102')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, status='running', updated_at=now();

INSERT INTO exam_questions (id, tenant_id, exam_id, question_type, prompt, position, points, options, rubric, answer_key) VALUES
('00000000-0000-4000-8000-000000000811','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','multiple_choice','Organel penghasil energi pada sel adalah...',1,5,'[{"id":"a","label":"Mitokondria"},{"id":"b","label":"Ribosom"}]'::jsonb,'','{"correctOptionIds":["a"]}'::jsonb),
('00000000-0000-4000-8000-000000000812','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','essay','Jelaskan fungsi membran sel secara singkat.',2,5,'[]'::jsonb,'Nilai kelengkapan konsep dan kejelasan jawaban.','{}'::jsonb)
ON CONFLICT (tenant_id, exam_id, position) DO UPDATE SET prompt=EXCLUDED.prompt, points=EXCLUDED.points, options=EXCLUDED.options, rubric=EXCLUDED.rubric, answer_key=EXCLUDED.answer_key, updated_at=now();

INSERT INTO exam_targets (id, tenant_id, exam_id, target_type, target_id)
VALUES ('00000000-0000-4000-8000-000000000821','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','class_section','00000000-0000-4000-8000-000000000401')
ON CONFLICT (tenant_id, exam_id, target_type, target_id) DO NOTHING;

INSERT INTO exam_gate_windows (id, tenant_id, exam_id, target_type, target_id, publishes_at, opens_at, closes_at, password)
VALUES ('00000000-0000-4000-8000-000000000831','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','global',NULL,now() - interval '10 minutes',now() - interval '5 minutes',now() + interval '1 day','demo123')
ON CONFLICT (id) DO UPDATE SET opens_at=EXCLUDED.opens_at, closes_at=EXCLUDED.closes_at, password=EXCLUDED.password;

INSERT INTO exam_prerequisites (id, tenant_id, exam_id, prerequisite_type, required_id)
VALUES ('00000000-0000-4000-8000-000000000841','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','course_completed','00000000-0000-4000-8000-000000000701')
ON CONFLICT (tenant_id, exam_id, prerequisite_type, required_id) DO NOTHING;

INSERT INTO exam_eligible_students (tenant_id, exam_id, student_id, eligibility_status, blocking_reasons)
VALUES
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000301','eligible','[]'::jsonb),
('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000302','blocked','["course_not_completed"]'::jsonb)
ON CONFLICT (tenant_id, exam_id, student_id) DO UPDATE SET eligibility_status=EXCLUDED.eligibility_status, blocking_reasons=EXCLUDED.blocking_reasons, calculated_at=now();

INSERT INTO exam_attempts (id, tenant_id, exam_id, student_id, status, submitted_at)
VALUES ('00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000301','waiting_for_grading',now())
ON CONFLICT (id) DO UPDATE SET status='waiting_for_grading', submitted_at=now();

-- Seed a final submission + receipt + grade queue item so the manual grading dashboard can be tested immediately.
INSERT INTO exam_submission_inbox (id, tenant_id, exam_id, attempt_id, student_id, receipt_id, submission_kind, payload, received_at, relayed_at)
VALUES (9001,'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000911','final_submit','{"studentId":"00000000-0000-4000-8000-000000000301","answers":[{"questionId":"00000000-0000-4000-8000-000000000811","selectedOptionIds":["a"]},{"questionId":"00000000-0000-4000-8000-000000000812","text":"Membran sel mengatur keluar masuk zat."}]}'::jsonb,now(),now())
ON CONFLICT DO NOTHING;

INSERT INTO exam_submission_receipts (receipt_id, tenant_id, exam_id, attempt_id, student_id, received_at, inbox_id)
SELECT '00000000-0000-4000-8000-000000000911','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000301', received_at, id
FROM exam_submission_inbox
WHERE id=9001 AND receipt_id='00000000-0000-4000-8000-000000000911'
ON CONFLICT (receipt_id) DO NOTHING;

INSERT INTO exam_grade_results (tenant_id, exam_id, attempt_id, student_id, receipt_id, status, auto_score, max_score, requires_manual_grading, question_results, manual_score, final_score)
VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000911','waiting_for_grading',5,10,true,'[{"questionId":"00000000-0000-4000-8000-000000000811","score":5,"maxPoints":5},{"questionId":"00000000-0000-4000-8000-000000000812","score":0,"maxPoints":5,"requiresManualGrading":true}]'::jsonb,0,5)
ON CONFLICT (tenant_id, attempt_id, receipt_id) DO UPDATE SET status='waiting_for_grading', auto_score=5, max_score=10, requires_manual_grading=true, question_results=EXCLUDED.question_results, manual_score=0, final_score=5, feedback='', graded_by='', graded_at=now();

INSERT INTO exam_security_events (id, tenant_id, exam_id, attempt_id, student_id, event_type, severity, metadata, occurred_at)
VALUES (9001,'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000301','fullscreen_exit','warning','{"source":"demo_seed"}'::jsonb,now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
