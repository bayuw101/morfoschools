package authctx

type Permission string

const (
	ManageTenants       Permission = "tenants:manage"
	ManageUsers         Permission = "users:manage"
	ManageStudents      Permission = "students:manage"
	ManageClasses       Permission = "classes:manage"
	ManageSubjectGroups Permission = "subject_groups:manage"
	ManageCourses       Permission = "courses:manage"
	ManageExams         Permission = "exams:manage"
	TakeExams           Permission = "exams:take"
	ViewExamResults     Permission = "exam_results:view"
)

var permissionsByRole = map[string]map[Permission]struct{}{
	"owner": {
		ManageTenants:       {},
		ManageUsers:         {},
		ManageStudents:      {},
		ManageClasses:       {},
		ManageSubjectGroups: {},
		ManageCourses:       {},
		ManageExams:         {},
		ViewExamResults:     {},
	},
	"admin": {
		ManageUsers:         {},
		ManageStudents:      {},
		ManageClasses:       {},
		ManageSubjectGroups: {},
		ManageCourses:       {},
		ManageExams:         {},
		ViewExamResults:     {},
	},
	"teacher": {
		ManageCourses:   {},
		ManageExams:     {},
		ViewExamResults: {},
	},
	"student": {
		TakeExams:       {},
		ViewExamResults: {},
	},
}

func Can(role string, permission Permission) bool {
	permissions, ok := permissionsByRole[role]
	if !ok {
		return false
	}
	_, ok = permissions[permission]
	return ok
}
