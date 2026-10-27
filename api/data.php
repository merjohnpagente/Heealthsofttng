<?php
require __DIR__ . '/config.php';

/**
 * Maps each localStorage key used by the front-end to a MySQL table and
 * the JSON-field <-> DB-column pairs for that table.
 * types: string | int | float | bool  (controls how values are cast on load)
 */
$TABLE_MAP = [
    'scm_users' => [
        'table' => 'users',
        'fields' => [
            ['json' => 'id',       'db' => 'id',       'type' => 'string'],
            ['json' => 'name',     'db' => 'name',     'type' => 'string'],
            ['json' => 'username', 'db' => 'username', 'type' => 'string'],
            ['json' => 'password', 'db' => 'password', 'type' => 'string'],
            ['json' => 'role',     'db' => 'role',     'type' => 'string'],
            ['json' => 'active',   'db' => 'active',   'type' => 'bool'],
            ['json' => 'grade',    'db' => 'grade',    'type' => 'string'],
            ['json' => 'section',  'db' => 'section',  'type' => 'string'],
        ],
    ],
    'scm_students' => [
        'table' => 'students',
        'fields' => [
            ['json' => 'id',        'db' => 'id',         'type' => 'string'],
            ['json' => 'name',      'db' => 'name',       'type' => 'string'],
            ['json' => 'age',       'db' => 'age',        'type' => 'int'],
            ['json' => 'sex',       'db' => 'sex',        'type' => 'string'],
            ['json' => 'grade',     'db' => 'grade',      'type' => 'string'],
            ['json' => 'section',   'db' => 'section',    'type' => 'string'],
            ['json' => 'adviserId', 'db' => 'adviser_id', 'type' => 'string'],
        ],
    ],
    'scm_daily' => [
        'table' => 'daily_checks',
        'fields' => [
            ['json' => 'id',          'db' => 'id',          'type' => 'string'],
            ['json' => 'studentId',   'db' => 'student_id',  'type' => 'string'],
            ['json' => 'date',        'db' => 'date',        'type' => 'string'],
            ['json' => 'time',        'db' => 'time',        'type' => 'string'],
            ['json' => 'temperature', 'db' => 'temperature', 'type' => 'float'],
            ['json' => 'symptoms',    'db' => 'symptoms',    'type' => 'string'],
            ['json' => 'remarks',     'db' => 'remarks',     'type' => 'string'],
            ['json' => 'teacherId',   'db' => 'teacher_id',  'type' => 'string'],
            ['json' => 'status',      'db' => 'status',      'type' => 'string'],
        ],
    ],
    'scm_bmi' => [
        'table' => 'bmi_records',
        'fields' => [
            ['json' => 'id',         'db' => 'id',          'type' => 'string'],
            ['json' => 'studentId',  'db' => 'student_id',  'type' => 'string'],
            ['json' => 'schoolYear', 'db' => 'school_year', 'type' => 'string'],
            ['json' => 'period',     'db' => 'period',      'type' => 'string'],
            ['json' => 'height',     'db' => 'height',      'type' => 'float'],
            ['json' => 'weight',     'db' => 'weight',      'type' => 'float'],
            ['json' => 'bmi',        'db' => 'bmi',         'type' => 'float'],
            ['json' => 'status',     'db' => 'status',      'type' => 'string'],
            ['json' => 'date',       'db' => 'date',        'type' => 'string'],
            ['json' => 'teacherId',  'db' => 'teacher_id',  'type' => 'string'],
        ],
    ],
    'scm_referrals' => [
        'table' => 'referrals',
        'fields' => [
            ['json' => 'id',        'db' => 'id',         'type' => 'string'],
            ['json' => 'dailyId',   'db' => 'daily_id',   'type' => 'string'],
            ['json' => 'studentId', 'db' => 'student_id', 'type' => 'string'],
            ['json' => 'teacherId', 'db' => 'teacher_id', 'type' => 'string'],
            ['json' => 'date',      'db' => 'date',       'type' => 'string'],
            ['json' => 'status',    'db' => 'status',     'type' => 'string'],
        ],
    ],
    'scm_assessments' => [
        'table' => 'assessments',
        'fields' => [
            ['json' => 'id',          'db' => 'id',          'type' => 'string'],
            ['json' => 'referralId',  'db' => 'referral_id', 'type' => 'string'],
            ['json' => 'nurseId',     'db' => 'nurse_id',    'type' => 'string'],
            ['json' => 'date',        'db' => 'date',        'type' => 'string'],
            ['json' => 'time',        'db' => 'time',        'type' => 'string'],
            ['json' => 'vitalTemp',   'db' => 'vital_temp',  'type' => 'float'],
            ['json' => 'findings',    'db' => 'findings',    'type' => 'string'],
            ['json' => 'treatment',   'db' => 'treatment',   'type' => 'string'],
            ['json' => 'notes',       'db' => 'notes',       'type' => 'string'],
            ['json' => 'disposition', 'db' => 'disposition', 'type' => 'string'],
        ],
    ],
    'scm_recs' => [
        'table' => 'recommendations',
        'fields' => [
            ['json' => 'id',           'db' => 'id',             'type' => 'string'],
            ['json' => 'referralId',   'db' => 'referral_id',    'type' => 'string'],
            ['json' => 'reason',       'db' => 'reason',         'type' => 'string'],
            ['json' => 'condition',    'db' => 'condition_text', 'type' => 'string'],
            ['json' => 'instructions', 'db' => 'instructions',   'type' => 'string'],
            ['json' => 'returnNote',   'db' => 'return_note',    'type' => 'string'],
            ['json' => 'createdDate',  'db' => 'created_date',   'type' => 'string'],
            ['json' => 'nurseId',      'db' => 'nurse_id',       'type' => 'string'],
        ],
    ],
    'scm_medicines' => [
        'table' => 'medicines',
        'fields' => [
            ['json' => 'id',      'db' => 'id',      'type' => 'string'],
            ['json' => 'name',    'db' => 'name',    'type' => 'string'],
            ['json' => 'purpose', 'db' => 'purpose', 'type' => 'string'],
            ['json' => 'stock',   'db' => 'stock',   'type' => 'int'],
        ],
    ],
    'scm_medlogs' => [
        'table' => 'medicine_logs',
        'fields' => [
            ['json' => 'id',           'db' => 'id',            'type' => 'string'],
            ['json' => 'assessmentId', 'db' => 'assessment_id', 'type' => 'string'],
            ['json' => 'medicineId',   'db' => 'medicine_id',   'type' => 'string'],
            ['json' => 'medicineName', 'db' => 'medicine_name', 'type' => 'string'],
            ['json' => 'dosage',       'db' => 'dosage',        'type' => 'string'],
            ['json' => 'timeGiven',    'db' => 'time_given',    'type' => 'string'],
            ['json' => 'remarks',      'db' => 'remarks',       'type' => 'string'],
        ],
    ],
    'scm_notifications' => [
        'table' => 'notifications',
        'fields' => [
            ['json' => 'id',        'db' => 'id',         'type' => 'string'],
            ['json' => 'teacherId', 'db' => 'teacher_id', 'type' => 'string'],
            ['json' => 'type',      'db' => 'type',       'type' => 'string'],
            ['json' => 'message',   'db' => 'message',    'type' => 'string'],
            ['json' => 'date',      'db' => 'date',       'type' => 'string'],
            ['json' => 'read',      'db' => 'is_read',    'type' => 'bool'],
        ],
    ],
    'scm_logs' => [
        'table' => 'activity_logs',
        'fields' => [
            ['json' => 'id',     'db' => 'id',        'type' => 'string'],
            ['json' => 'date',   'db' => 'date',      'type' => 'string'],
            ['json' => 'time',   'db' => 'time',      'type' => 'string'],
            ['json' => 'user',   'db' => 'user_name', 'type' => 'string'],
            ['json' => 'action', 'db' => 'action',    'type' => 'string'],
        ],
    ],
];

function castOut($value, $type) {
    if ($value === null) return null;
    switch ($type) {
        case 'bool':  return (bool) $value;
        case 'int':   return (int) $value;
        case 'float': return (float) $value;
        default:      return (string) $value;
    }
}

function loadEntity(PDO $pdo, array $def): array {
    $stmt = $pdo->query("SELECT * FROM `{$def['table']}`");
    $rows = $stmt->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $obj = [];
        foreach ($def['fields'] as $f) {
            $obj[$f['json']] = castOut($row[$f['db']] ?? null, $f['type']);
        }
        $out[] = $obj;
    }
    return $out;
}

/** Upsert every row of $items into the table described by $def. No deletes:
 *  the app never removes records, only adds and edits them. */
function saveEntity(PDO $pdo, array $def, array $items): void {
    if (empty($items)) return;
    $dbCols = array_map(fn($f) => $f['db'], $def['fields']);
    $placeholders = '(' . implode(',', array_fill(0, count($dbCols), '?')) . ')';
    $updateClause = implode(',', array_map(fn($c) => "`$c`=VALUES(`$c`)", array_filter($dbCols, fn($c) => $c !== 'id')));
    $sql = "INSERT INTO `{$def['table']}` (`" . implode('`,`', $dbCols) . "`) VALUES $placeholders "
         . "ON DUPLICATE KEY UPDATE $updateClause";
    $stmt = $pdo->prepare($sql);
    // Relaxed for this request only: several entities can be saved back-to-back (e.g. first-run
    // seeding) and arrival order at the server isn't guaranteed, so a child row referencing a
    // parent that hasn't been upserted yet must not fail. Data stays consistent once all saves land.
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    try {
        foreach ($items as $item) {
            $values = [];
            foreach ($def['fields'] as $f) {
                $v = $item[$f['json']] ?? null;
                if ($f['type'] === 'bool') { $v = $v ? 1 : 0; }
                elseif ($v === '' && ($f['type'] === 'int' || $f['type'] === 'float' || stripos($f['json'], 'date') !== false)) { $v = null; }
                $values[] = $v;
            }
            $stmt->execute($values);
        }
    } finally {
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }
}

function loadSettings(PDO $pdo) {
    $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1");
    $row = $stmt->fetch();
    if (!$row) return null;
    return [
        'schoolYear'  => $row['school_year'],
        'schoolYears' => json_decode($row['school_years'], true) ?: [$row['school_year']],
    ];
}

function saveSettings(PDO $pdo, array $data): void {
    $stmt = $pdo->prepare(
        "INSERT INTO settings (id, school_year, school_years) VALUES (1, ?, ?) "
      . "ON DUPLICATE KEY UPDATE school_year = VALUES(school_year), school_years = VALUES(school_years)"
    );
    $stmt->execute([
        $data['schoolYear'] ?? '',
        json_encode($data['schoolYears'] ?? []),
    ]);
}

$action = $_GET['action'] ?? '';

try {
    if ($action === 'load' && $_SERVER['REQUEST_METHOD'] === 'GET') {

        $result = [];
        foreach ($TABLE_MAP as $key => $def) {
            $result[$key] = loadEntity($pdo, $def);
        }
        $result['scm_settings'] = loadSettings($pdo);
        echo json_encode($result);

    } elseif ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {

        $key = $_GET['key'] ?? '';
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if ($key === 'scm_settings') {
            if (!is_array($data)) throw new Exception('Invalid settings payload');
            saveSettings($pdo, $data);
        } elseif (isset($TABLE_MAP[$key])) {
            if (!is_array($data)) throw new Exception('Invalid payload for ' . $key);
            saveEntity($pdo, $TABLE_MAP[$key], $data);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Unknown key: ' . $key]);
            exit;
        }
        echo json_encode(['ok' => true]);

    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown or missing action']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
