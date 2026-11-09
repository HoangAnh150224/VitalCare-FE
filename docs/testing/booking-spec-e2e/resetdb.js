// Fresh test DB: a copy of the dev DB, plus Saturday turns (today is a Saturday) for one doctor per clinic.
const { execFileSync } = require("child_process");
const BIN = "C:/Program Files/PostgreSQL/18/bin/";
const env = { ...process.env, PGPASSWORD: "1234" };
const run = (exe, args) => execFileSync(BIN + exe, ["-h", "localhost", "-U", "postgres", ...args], { env, encoding: "utf8" });
try { run("dropdb.exe", ["--if-exists", "vitalcare_spec"]); } catch (e) { console.log(e.message); }
run("createdb.exe", ["-T", "vitalcare", "vitalcare_spec"]);
for (const emp of [1, 6]) {
  console.log(run("psql.exe", ["-d", "vitalcare_spec", "-tAc",
    `insert into doctor_working_hours (employee_id, day_of_week, start_time, end_time, visit_minutes, created_at, version, exam_room_id)
     select employee_id, 6, '07:00', '21:00', 30, now(), 0, exam_room_id from doctor_working_hours
     where employee_id=${emp} and day_of_week=1 order by start_time limit 1 returning id`]).trim());
}
console.log("ready");
