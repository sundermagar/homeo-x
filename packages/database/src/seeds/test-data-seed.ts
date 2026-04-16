import { sql } from 'drizzle-orm';
import * as schema from '../schema';
import type { DbClient } from '../client';

export async function seedTestData(db: DbClient) {
  console.log('[Seed] Seeding expanded clinical test data...');

  // Helper to get columns for a table
  const getCols = async (table: string) => {
    const res = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = ${table} AND table_schema = CURRENT_SCHEMA()
    `);
    return (res as any[]).map(c => c.column_name);
  };

  const patientCols = await getCols('case_datas');
  const apptCols = await getCols('appointments');
  const tokenCols = await getCols('tokens');

  // 1. Seed Patients (case_datas)
  const names = [
    { f: 'Manoj', s: 'Patel', g: 'Male', age: 56, dob: '1968-05-12' },
    { f: 'Priya', s: 'Sharma', g: 'Female', age: 29, dob: '1995-08-22' },
    { f: 'Rajesh', s: 'Kumar', g: 'Male', age: 44, dob: '1980-01-01' },
    { f: 'Meena', s: 'Iyer', g: 'Female', age: 61, dob: '1963-11-05' },
    { f: 'Vikram', s: 'Das', g: 'Male', age: 35, dob: '1989-03-15' },
    { f: 'Sunita', s: 'Rao', g: 'Female', age: 42, dob: '1982-12-10' },
    { f: 'Amit', s: 'Singh', g: 'Male', age: 28, dob: '1996-07-20' },
    { f: 'Anjali', s: 'Gupta', g: 'Female', age: 31, dob: '1993-02-28' },
    { f: 'Suresh', s: 'Reddy', g: 'Male', age: 52, dob: '1972-09-14' },
    { f: 'Kavita', s: 'Nair', g: 'Female', age: 38, dob: '1986-06-05' }
  ];

  const todayStr = new Date().toISOString().split('T')[0]!;
  // Make Rajesh's birthday today for verification
  names[2]!.dob = todayStr;

  const maxIdRes = await db.execute(sql`SELECT COALESCE(MAX(id), 0) as max_id FROM case_datas`);
  let currentId = Number((maxIdRes[0] as any)?.max_id || 0);

  for (let i = 0; i < names.length; i++) {
    currentId++;
    const n = names[i];
    if (!n) continue;

    const p: any = {
      id: currentId,
      regid: 10001 + i,
      first_name: n.f,
      surname: n.s,
      gender: n.g,
      dob: n.dob,
      phone: `987654321${i}`,
      mobile1: `987654321${i}`,
    };

    // Defensive column checks
    if (patientCols.includes('age')) p.age = n.age;
    if (patientCols.includes('coupon')) p.coupon = '';

    const cols = Object.keys(p);
    const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
    
    // Construct raw SQL so Drizzle doesn't strip 'coupon' when it exists
    await db.execute(sql.raw(`
      INSERT INTO case_datas (${cols.join(', ')}) 
      VALUES (${cols.map(c => typeof p[c] === 'string' ? `'${p[c]}'` : p[c]).join(', ')}) 
      ON CONFLICT (regid) DO NOTHING
    `));
  }

  const patientRows = await db.select({ id: schema.patients.id, regid: schema.patients.regid }).from(schema.patients);
  const pMap = new Map(patientRows.map(r => [r.regid, r.id]));

  // Because the demo UI explicitly bypasses auth using Dr. Demo (ID: 101), we MUST assign to 101
  const targetDoctorId = 101;

  // 2. Seed Appointments  // Test scheduling statuses
  const statuses = ['Completed', 'Consultation', 'Waitlist', 'Waitlist', 'Pending', 'Absent'];
  const times = ['09:30 AM', '10:15 AM', '11:00 AM', '11:45 AM', '12:30 PM', '02:00 PM'];

  for (let i = 0; i < 6; i++) {
    const regid = 10001 + i;
    const pId = pMap.get(regid);
    const n = names[i];
    if (!pId || !n) continue;

    const appt: any = {
      patientId: pId,
      patientName: `${n.f} ${n.s}`,
      bookingDate: todayStr,
      bookingTime: times[i],
      status: statuses[i],
      tokenNo: i + 1,
    };

    if (apptCols.includes('clinic_id')) appt.clinicId = 1;
    if (apptCols.includes('assistant_doctor')) appt.assistantDoctor = targetDoctorId.toString();
    if (apptCols.includes('doctor_id')) appt.doctorId = targetDoctorId;

    const [inserted] = await db.insert(schema.appointments).values(appt).returning({ id: schema.appointments.id });
    if (!inserted) continue;

    // Seed Token
    const token: any = {
      appointmentId: inserted.id,
      patientId: pId,
      tokenNo: i + 1,
      date: todayStr,
      status: statuses[i] === 'CONSULTATION' ? 'active' : (statuses[i] === 'COMPLETED' ? 'completed' : 'queued')
    };
    if (tokenCols.includes('doctor_id')) token.doctorId = targetDoctorId;

    await db.insert(schema.tokens).values(token).onConflictDoNothing();

    // Seed Vitals for the first few
    try {
      if (i < 3) {
        await db.insert(schema.vitalsLegacy).values({
          visitId: inserted.id,
          heightCm: (160 + i * 5).toString(),
          weightKg: (65 + i * 3).toString(),
          temperatureF: '98.6',
          pulseRate: '72',
          systolicBp: '120',
          diastolicBp: '80',
          recordedAt: new Date(),
        } as any);
      }
    } catch (e) { }
  }

  // 3. Seed Reminders (if table exists)
  try {
    const demoReminders = [
      {
        patientId: pMap.get(10001),
        patientName: 'Manoj Patel',
        heading: 'Checkup Follow-up',
        comments: 'Review test results.',
        startDate: todayStr,
        status: 'pending',
        endDate: todayStr,
        remindTime: '09:00 AM',
        remindAfter: '0'
      },
      {
        patientId: pMap.get(10005),
        patientName: 'Vikram Das',
        heading: 'Lab Results',
        comments: 'Check lipid profile.',
        startDate: todayStr,
        status: 'pending',
        endDate: todayStr,
        remindTime: '10:00 AM',
        remindAfter: '0'
      }
    ];

    for (const rem of demoReminders) {
      if (rem.patientId) await db.insert(schema.caseReminderLegacy).values(rem as any);
    }
    console.log('[Seed] Reminders seeded.');
  } catch (err) { }

  // 4. Seed Revenue Fallback (if table exists)
  try {
    const revenueTablesRes = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_name IN ('receipt', 'bills') AND table_schema = CURRENT_SCHEMA()`);
    const revTableName = (revenueTablesRes as any[])[0]?.table_name;

    if (revTableName) {
      console.log(`[Seed] Seeding revenue into ${revTableName}...`);
      const revCols = await getCols(revTableName);

      for (let i = 0; i < 12; i++) {
        const amount = (2000 + Math.random() * 8000).toFixed(0);
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        // Explicitly set to noon to avoid any day-wrap issues
        date.setHours(12, 0, 0, 0);

        if (revTableName === 'receipt') {
          await db.insert(schema.receiptLegacy).values({
            regid: 10001 + (i % 5),
            amount: amount,
            mode: 'Cash',
            createdAt: date,
          } as any);
        } else if (revTableName === 'bills') {
          const sets = [`regid = ${10001 + (i % 5)}`, `charges = '${amount}'`, `received = '${amount}'`, `created_at = '${date.toISOString()}'`, `bill_date = '${date.toISOString()}'`];
          if (revCols.includes('mode')) sets.push(`mode = 'Cash'`);
          await db.execute(sql`INSERT INTO bills (regid, charges, received, created_at, bill_date ${sql.raw(revCols.includes('mode') ? ', mode' : '')}) VALUES (${10001 + (i % 5)}, ${amount}, ${amount}, ${date.toISOString()}, ${date.toISOString()} ${sql.raw(revCols.includes('mode') ? ", 'Cash'" : '')})`);
        }
      }
      console.log(`[Seed] Revenue seeded in ${revTableName}.`);
    }
  } catch (err) {
    console.error('[Seed] Revenue seeding failed:', err);
  }

  console.log('[Seed] Test data seeding completed.');
}
