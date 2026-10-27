# School Clinic Management System — XAMPP / MySQL edition

This is your original app, converted from browser `localStorage` to a real
**MySQL database**, read and written through **PHP**. The HTML/CSS/JS UI is
unchanged — only the storage layer is different now.

## Folder contents

```
school-clinic/
├── index.html          ← the app (open this in your browser)
├── api/
│   ├── config.php       ← MySQL connection settings
│   └── data.php         ← the API the front-end talks to (load / save)
└── database/
    └── schema.sql        ← run this once to create the database & tables
```

## 1. Install into XAMPP

Copy the whole `school-clinic` folder into your XAMPP `htdocs` directory, e.g.:

- Windows: `C:\xampp\htdocs\school-clinic`
- macOS: `/Applications/XAMPP/htdocs/school-clinic`
- Linux: `/opt/lampp/htdocs/school-clinic`

## 2. Start Apache and MySQL

Open the **XAMPP Control Panel** and click **Start** next to both
**Apache** and **MySQL**.

## 3. Create the database

1. Go to `http://localhost/phpmyadmin`
2. Click **Import**
3. Choose the file `database/schema.sql` from this folder
4. Click **Go**

This creates a database named `school_clinic` with all the tables the app
needs (users, students, daily health checks, BMI records, referrals,
assessments, recommendations, medicines, medicine logs, notifications,
activity logs, settings).

If you gave MySQL's `root` user a password in XAMPP, open
`api/config.php` and put it in `$DB_PASS`.

## 4. Open the app

Go to:

```
http://localhost/school-clinic/index.html
```

The first time it loads, it will notice the database is empty and
automatically seed it with the same demo accounts as before:

| Role          | Username  | Password    |
|---------------|-----------|-------------|
| Administrator | admin     | admin123    |
| Adviser (G3)  | adviser1  | teacher123  |
| Adviser (G5)  | adviser2  | teacher123  |
| Clinic Nurse  | nurse1    | clinic123   |

From then on, everything you do in the app — adding students, daily
checks, BMI entries, referrals, assessments, medicine stock, new
accounts, etc. — is saved to the `school_clinic` MySQL database instead
of the browser.

## How it works, briefly

- `index.html` loads all data from `api/data.php?action=load` once, on
  startup (you'll see a short "Connecting to database…" screen).
- Every time the app used to write to `localStorage`, it now calls
  `api/data.php?action=save&key=...`, which upserts the rows into the
  matching MySQL table via PDO.
- The **Admin → Backup & Restore** panel now exports/imports the MySQL
  data instead of `localStorage`.

## BMI and teacher reports

- BMI is still computed as `weight / height²`, but the nutritional status
  now uses the **WHO BMI-for-age** reference (ages 5–19, separate for boys
  and girls) based on the student's age and sex. Old BMI records are
  re-checked and corrected in MySQL when the app loads.
- Teachers now have a **Print Reports** page with a printable class BMI
  report (including age and sex) and a class health monitoring report for
  their advisory class.
- Age and sex are read from the existing `students` table, so no database
  upgrade is needed for an existing installation.

## Notes

- Passwords are stored in plain text in the `users` table, matching how
  the original demo worked. That's fine for a local school project on
  XAMPP, but don't expose this to the public internet as-is — for a real
  deployment you'd want to hash passwords (e.g. `password_hash()`) and
  move authentication to the server side.
- Multiple people on the same network can now use the app at once and
  share the same data, since it's a real shared database rather than
  each browser's own local storage.
- If you ever want to start over, just re-import `database/schema.sql`
  (or `TRUNCATE` the tables) and reload the page — it will reseed itself.
