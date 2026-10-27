/* ================================================================
   DATA LAYER
   ================================================================ */
const API_URL = 'api/data.php';
const DB_CACHE = {};
const DB = {
  get: k => { const v = DB_CACHE[k]; return v !== undefined && v !== null ? v : []; },
  set: (k,v) => {
    DB_CACHE[k] = v;
    fetch(`${API_URL}?action=save&key=${encodeURIComponent(k)}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(v)
    }).then(r=>r.json()).then(res=>{
      if(res && res.error){ console.error(res.error); showToast('Save failed: '+res.error,'error'); }
    }).catch(err=>{ console.error('Save failed for', k, err); showToast('Could not reach the database (is XAMPP MySQL running?).','error'); });
  },
  getOne: (k,id) => DB.get(k).find(x=>x.id===id),
};
async function loadDatabase(){
  const res = await fetch(`${API_URL}?action=load`);
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data = await res.json();
  if(data.error) throw new Error(data.error);
  Object.assign(DB_CACHE, data);
}
const KEY = {
  users:'scm_users', students:'scm_students', daily:'scm_daily', bmi:'scm_bmi',
  referrals:'scm_referrals', assessments:'scm_assessments', recs:'scm_recs',
  medicines:'scm_medicines', medlogs:'scm_medlogs', notifications:'scm_notifications',
  settings:'scm_settings', logs:'scm_logs',
};
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function nowHM(){ return new Date().toTimeString().slice(0,5); }
function fmtDate(d){ if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}); }
function getSettings(){ const s=DB.get(KEY.settings); return (s && s.schoolYear) ? s : { schoolYear:'2025-2026', schoolYears:['2025-2026'] }; }
function currentSY(){ return getSettings().schoolYear; }

function calcBMI(h,w){ const m=h/100; if(!m) return 0; return +(w/(m*m)).toFixed(1); }
/* WHO 2007 BMI-for-age LMS values (ages 5–19) — status depends on age and sex,
   unlike the adult BMI cut-offs this app used before. */
const WHO_BMI_LMS = {
  Male: {
    5:[-0.7387,15.2641,0.08390], 6:[-0.9921,15.3062,0.08682], 7:[-1.2460,15.4832,0.09068],
    8:[-1.4629,15.7368,0.09526], 9:[-1.6318,16.0490,0.10038], 10:[-1.7407,16.4433,0.10566],
    11:[-1.7862,16.9392,0.11070], 12:[-1.7751,17.5334,0.11522], 13:[-1.7168,18.2330,0.11898],
    14:[-1.6211,19.0050,0.12191], 15:[-1.4961,19.7744,0.12412], 16:[-1.3529,20.4951,0.12579],
    17:[-1.1962,21.1423,0.12715], 18:[-1.0260,21.7077,0.12836], 19:[-0.8419,22.1883,0.12948],
  },
  Female: {
    5:[-0.8886,15.2441,0.09692], 6:[-1.0794,15.2697,0.10195], 7:[-1.2565,15.4036,0.10746],
    8:[-1.3880,15.6810,0.11291], 9:[-1.4650,16.0964,0.11816], 10:[-1.4864,16.6133,0.12307],
    11:[-1.4606,17.2459,0.12748], 12:[-1.4006,17.9966,0.13129], 13:[-1.3195,18.8012,0.13445],
    14:[-1.2266,19.5647,0.13700], 15:[-1.1311,20.2125,0.13904], 16:[-1.0368,20.7008,0.14070],
    17:[-0.9423,21.0367,0.14208], 18:[-0.8462,21.2603,0.14330], 19:[-0.7496,21.4269,0.14441],
  },
};
function bmiSexKey(sex){
  const s=String(sex||'').toLowerCase();
  return s.startsWith('m')?'Male':s.startsWith('f')?'Female':'';
}
function bmiZScore(bmi, age, sex){
  const row=WHO_BMI_LMS[bmiSexKey(sex)]?.[Math.round(+age)];
  if(!row) return null;
  const [L,M,S]=row;
  return L===0 ? Math.log(bmi/M)/S : ((Math.pow(bmi/M,L)-1)/(L*S));
}
function nutritionLabel(bmi, age, sex){
  const z=bmiZScore(bmi, age, sex);
  if(z!==null){
    if(z<-3) return 'Severely Wasted';
    if(z<-2) return 'Wasted';
    if(z<=1) return 'Normal';
    if(z<=2) return 'Overweight';
    return 'Obese';
  }
  // Fallback for records with no age/sex (adult cut-offs)
  if(bmi<14) return 'Severely Wasted';
  if(bmi<18.5) return 'Wasted';
  if(bmi<25) return 'Normal';
  if(bmi<30) return 'Overweight';
  return 'Obese';
}
// Self-check: known WHO reference values for a 9-year-old.
console.assert(Math.abs(bmiZScore(23.5,9,'Male')-2.83)<0.02,'WHO BMI-for-age check failed (male)');
console.assert(Math.abs(bmiZScore(13.2,9,'Female')+1.95)<0.02,'WHO BMI-for-age check failed (female)');
function nutritionBadgeClass(status){
  return { 'Severely Wasted':'badge-severelywasted','Wasted':'badge-wasted','Normal':'badge-normal','Overweight':'badge-overweight','Obese':'badge-obese' }[status] || 'badge-normal';
}
function nutritionBadge(status){ return `<span class="badge ${nutritionBadgeClass(status)}">${status}</span>`; }
const ICON_EYE=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_EYE_OFF=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.93 10.93 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.94 13.94 0 0 0 2 12s3 7 10 7a9.59 9.59 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;
const ICON_EDIT=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_PRINT=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`;
const ICON_DOWNLOAD=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_UPLOAD=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
const ICON_WARNING=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const ICON_RETURNED=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>`;
const ICON_CLIPBOARD=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`;
const ICON_CHECK=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
function isFever(t){ return t!=='' && t!==null && t!==undefined && +t>=37.5; }
const URGENT_SYMPTOMS = ['vomit','vomiting','difficulty breathing','severe','faint','fainting','bleeding','seizure','allergic reaction','unconscious','convulsion'];
function needsClinicAttention(temp, symptoms){
  if(isFever(temp)) return true;
  const s=(symptoms||'').toLowerCase();
  return URGENT_SYMPTOMS.some(k=>s.includes(k));
}
function dispositionBadge(d){
  const map={ 'Return to Class':'badge-return-class','Under Observation':'badge-observation','Send Home':'badge-sendhome','Refer to RHU/Hospital':'badge-refer' };
  return `<span class="badge ${map[d]||'badge-none'}">${d}</span>`;
}
function logActivity(action){
  const logs=DB.get(KEY.logs);
  logs.push({ id:uid(), date:todayISO(), time:nowHM(), user: currentUser?currentUser.name:'System', action });
  DB.set(KEY.logs, logs.slice(-200));
}
function downloadCSV(rows, filename){
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
}

/* ================================================================
   SEED DATA
   ================================================================ */
function seedData(){
  if(DB.get(KEY.users).length) return;
  DB.set(KEY.settings, { schoolYear:'2025-2026', schoolYears:['2025-2026'] });

  const users = [
    { id:'u-admin', name:'Administrator', username:'admin', password:'admin123', role:'admin', active:true },
    { id:'u-t1', name:'Ms. Carla Reyes', username:'adviser1', password:'teacher123', role:'teacher', active:true, grade:'Grade 3', section:'Section A' },
    { id:'u-t2', name:'Mr. Ramon Cruz', username:'adviser2', password:'teacher123', role:'teacher', active:true, grade:'Grade 5', section:'Section B' },
    { id:'u-c1', name:'Nurse Ana Lopez', username:'nurse1', password:'clinic123', role:'clinic', active:true },
  ];
  DB.set(KEY.users, users);

  const students = [
    { id:'MES-0001', name:'Maria Santos', age:9, sex:'Female', grade:'Grade 3', section:'Section A', adviserId:'u-t1' },
    { id:'MES-0002', name:'Juan dela Cruz', age:9, sex:'Male', grade:'Grade 3', section:'Section A', adviserId:'u-t1' },
    { id:'MES-0003', name:'Ana Reyes', age:9, sex:'Female', grade:'Grade 3', section:'Section A', adviserId:'u-t1' },
    { id:'MES-0004', name:'Pedro Gomez', age:11, sex:'Male', grade:'Grade 5', section:'Section B', adviserId:'u-t2' },
    { id:'MES-0005', name:'Luisa Flores', age:11, sex:'Female', grade:'Grade 5', section:'Section B', adviserId:'u-t2' },
  ];
  DB.set(KEY.students, students);

  const bmi = [
    { sid:'MES-0001', period:'Beginning', h:120, w:19, date:'2025-06-10' },
    { sid:'MES-0002', period:'Beginning', h:122, w:35, date:'2025-06-10' },
    { sid:'MES-0004', period:'Beginning', h:138, w:28, date:'2025-06-11' },
  ].map(r=>{ const b=calcBMI(r.h,r.w); const s=students.find(x=>x.id===r.sid); return { id:uid(), studentId:r.sid, schoolYear:'2025-2026', period:r.period, height:r.h, weight:r.w, bmi:b, status:nutritionLabel(b, s?.age, s?.sex), date:r.date, teacherId: (r.sid==='MES-0004')?'u-t2':'u-t1' }; });
  DB.set(KEY.bmi, bmi);

  const today=todayISO();
  const daily1={ id:uid(), studentId:'MES-0002', date:today, time:'08:15', temperature:38.2, symptoms:'Fever, headache', remarks:'Flushed and warm to touch.', teacherId:'u-t1', status:'Referred' };
  const daily2={ id:uid(), studentId:'MES-0003', date:today, time:'09:00', temperature:36.5, symptoms:'None', remarks:'Feeling well.', teacherId:'u-t1', status:'Recorded' };
  DB.set(KEY.daily, [daily1, daily2]);

  const referral1={ id:uid(), dailyId:daily1.id, studentId:daily1.studentId, teacherId:'u-t1', date:today, status:'Pending' };
  DB.set(KEY.referrals, [referral1]);

  DB.set(KEY.assessments, []);
  DB.set(KEY.recs, []);
  DB.set(KEY.medlogs, []);
  DB.set(KEY.notifications, []);
  DB.set(KEY.logs, []);

  DB.set(KEY.medicines, [
    { id:uid(), name:'Paracetamol 250mg', purpose:'Fever / pain reliever', stock:40 },
    { id:uid(), name:'Amoxicillin 250mg', purpose:'Antibiotic — bacterial infections', stock:8 },
    { id:uid(), name:'Cetirizine', purpose:'Antihistamine — allergic reactions', stock:20 },
    { id:uid(), name:'Betadine Antiseptic', purpose:'Wound cleaning / disinfection', stock:15 },
    { id:uid(), name:'Oral Rehydration Salts', purpose:'Diarrhea / dehydration', stock:25 },
    { id:uid(), name:'Salbutamol Inhaler', purpose:'Asthma / difficulty breathing', stock:4 },
  ]);
}
/* seedData() is now called after loadDatabase() succeeds — see INIT section at the bottom. */

/* ================================================================
   AUTH
   ================================================================ */
let currentUser=null;
function doLogin(){
  const un=document.getElementById('inp-username').value.trim();
  const pw=document.getElementById('inp-password').value;
  const err=document.getElementById('login-error');
  err.classList.remove('show');
  if(!un||!pw){ err.textContent='Please fill in all required fields.'; err.classList.add('show'); return; }
  const user=DB.get(KEY.users).find(u=>u.username===un && u.password===pw);
  if(!user){ err.textContent='Invalid username or password.'; err.classList.add('show'); return; }
  if(user.active===false){ err.textContent='This account has been deactivated. Contact the administrator.'; err.classList.add('show'); return; }
  currentUser=user;
  sessionStorage.setItem('scm_session', JSON.stringify(user));
  logActivity('Logged in');
  showApp();
}

/* ================================================================
   SELF-REGISTRATION (Create Account, from the login page)
   ================================================================ */
function openRegisterModal(){
  ['reg-name','reg-username','reg-password','reg-section'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('reg-role').value='';
  document.getElementById('reg-grade').value='';
  document.getElementById('reg-teacher-fields').style.display='none';
  openModal('modal-register');
}
function toggleRegisterRoleFields(){
  document.getElementById('reg-teacher-fields').style.display = document.getElementById('reg-role').value==='teacher' ? 'grid' : 'none';
}
function registerAccount(){
  const name=document.getElementById('reg-name').value.trim();
  const username=document.getElementById('reg-username').value.trim();
  const password=document.getElementById('reg-password').value;
  const role=document.getElementById('reg-role').value;
  if(!name||!username||!password||!role){ showToast('Please fill in all required fields.','error'); return; }
  let grade='', section='';
  if(role==='teacher'){
    grade=document.getElementById('reg-grade').value; section=document.getElementById('reg-section').value.trim();
    if(!grade||!section){ showToast('Please select your assigned grade and section.','error'); return; }
  }
  const users=DB.get(KEY.users);
  if(users.find(u=>u.username===username)){ showToast('Username already taken. Please choose another.','error'); return; }
  const newUser={ id:uid(), name, username, password, role, active:true, grade, section };
  users.push(newUser);
  DB.set(KEY.users,users);
  logActivity(`New ${roleLabel(role)} account self-registered: ${name}`);
  closeModal('modal-register');
  showToast('Account created! Logging you in…','success');
  currentUser=newUser;
  sessionStorage.setItem('scm_session', JSON.stringify(newUser));
  logActivity('Logged in');
  showApp();
}

function doLogout(){
  logActivity('Logged out');
  currentUser=null;
  sessionStorage.removeItem('scm_session');
  document.getElementById('app').classList.remove('active');
  document.getElementById('login-page').style.display='flex';
  document.getElementById('inp-username').value=''; document.getElementById('inp-password').value='';
  document.getElementById('login-error').classList.remove('show');
  resetPasswordToggles();
}
function openLogoutConfirm(){ openModal('modal-logout'); }
function confirmLogout(){ closeModal('modal-logout'); doLogout(); }
function togglePassword(fieldId='inp-password'){
  const inp=document.getElementById(fieldId);
  if(!inp) return;
  const field=inp.closest('.password-field');
  if(!field) return;
  const eye=field.querySelector('.icon-eye');
  const eyeOff=field.querySelector('.icon-eye-off');
  const btn=field.querySelector('.password-toggle');
  if(!eye||!eyeOff) return;
  const isHidden=inp.type==='password';
  inp.type=isHidden?'text':'password';
  eye.style.display=isHidden?'block':'none';
  eyeOff.style.display=isHidden?'none':'block';
  if(btn){ btn.setAttribute('aria-label', isHidden?'Hide password':'Show password'); btn.setAttribute('aria-pressed', isHidden?'true':'false'); }
}
function resetPasswordToggles(){
  document.querySelectorAll('.password-field').forEach(field=>{
    const inp=field.querySelector('input'); const eye=field.querySelector('.icon-eye'); const eyeOff=field.querySelector('.icon-eye-off'); const btn=field.querySelector('.password-toggle');
    if(inp) inp.type='password'; if(eye) eye.style.display='none'; if(eyeOff) eyeOff.style.display='block'; if(btn){ btn.setAttribute('aria-label','Show password'); btn.setAttribute('aria-pressed','false'); }
  });
}
function showApp(){
  document.getElementById('login-page').style.display='none';
  document.getElementById('app').classList.add('active');
  document.getElementById('sb-role').textContent=roleLabel(currentUser.role);
  document.getElementById('sb-name').textContent=currentUser.name;
  document.getElementById('topbar-date').textContent=new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  buildNav();
  loadPanel(defaultPanel(currentUser.role));
}
function roleLabel(r){ return { admin:'Administrator', teacher:'Adviser / Teacher', clinic:'School Clinic (Nurse)' }[r] || r; }
function defaultPanel(r){ return { admin:'a-dash', teacher:'t-dash', clinic:'c-dash' }[r]; }

/* ================================================================
   NAVIGATION
   ================================================================ */
const NAV_TEACHER=[
  {id:'t-dash',label:'Dashboard'},{id:'t-mystudents',label:'My Students'},
  {id:'t-daily',label:'Daily Health Monitoring'},{id:'t-bmi',label:'BMI Monitoring'},
  {id:'t-healthrecords',label:'Health Monitoring Records'},{id:'t-bmirecords',label:'BMI Records'},
  {id:'t-reports',label:'Print Reports'},
  {id:'t-feedback',label:'Clinic Feedback'},{id:'t-profile',label:'Profile'},
];
const NAV_CLINIC=[
  {id:'c-dash',label:'Dashboard'},{id:'c-pending',label:'Pending Referrals'},{id:'c-observation',label:'Students Under Observation'},
  {id:'c-healthreports',label:'Health Monitoring Reports'},{id:'c-bmireports',label:'BMI Reports'},
  {id:'c-recforms',label:'Recommendation Forms'},{id:'c-medicine',label:'Medicine Inventory'},
  {id:'c-print',label:'Print Reports'},{id:'c-profile',label:'Profile'},
];
const NAV_ADMIN=[
  {id:'a-dash',label:'Dashboard'},{id:'a-allstudents',label:'View All Students'},{id:'a-teacherrecords',label:'View Teacher Records'},
  {id:'a-clinicrecords',label:'View Clinic Records'},{id:'a-healthreports',label:'View Health Monitoring Reports'},
  {id:'a-bmireports',label:'View BMI Reports'},{id:'a-feedingreports',label:'View Feeding Program Reports'},
  {id:'a-users',label:'Manage Users'},{id:'a-backup',label:'Backup &amp; Restore Database'},{id:'a-settings',label:'System Settings'},
];
function pendingBadgeCount(id){
  if(!currentUser) return 0;
  if(id==='t-feedback') return DB.get(KEY.notifications).filter(n=>n.teacherId===currentUser.id && !n.read).length;
  if(id==='c-pending') return DB.get(KEY.referrals).filter(r=>r.status==='Pending').length;
  return 0;
}
function buildNav(){
  const map={ admin:NAV_ADMIN, teacher:NAV_TEACHER, clinic:NAV_CLINIC };
  const items=map[currentUser.role]||[];
  document.getElementById('sidebar-nav').innerHTML = items.map(n=>{
    const cnt=pendingBadgeCount(n.id);
    return `<div class="nav-item" data-id="${n.id}" onclick="loadPanel('${n.id}')"><span>${n.label}</span>${cnt?`<span class="nav-dot"></span>`:''}</div>`;
  }).join('') + `<div class="nav-item logout" onclick="openLogoutConfirm()"><span>Logout</span></div>`;
}
let currentPanel='';
const TITLES=Object.fromEntries([...NAV_TEACHER,...NAV_CLINIC,...NAV_ADMIN].map(n=>[n.id,n.label]));
function loadPanel(id){
  currentPanel=id;
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active', el.dataset.id===id));
  document.getElementById('topbar-title').textContent=TITLES[id]||id;
  document.getElementById('content-area').innerHTML=buildPanel(id);
  initPanel(id);
}
function buildPanel(id){
  const fn=PANEL_BUILDERS[id];
  return fn ? fn() : '<p>Panel not found.</p>';
}
function initPanel(id){
  const fn=PANEL_INITS[id];
  if(fn) fn();
  buildNav();
}

/* ================================================================
   SHARED HELPERS: student scope, tables
   ================================================================ */
function myStudents(){ return DB.get(KEY.students).filter(s=>s.adviserId===currentUser.id); }
function studentMap(){ return Object.fromEntries(DB.get(KEY.students).map(s=>[s.id,s])); }
function userMap(){ return Object.fromEntries(DB.get(KEY.users).map(u=>[u.id,u])); }
/* Old BMI records were labelled with adult cut-offs. Re-check them against
   the student's age/sex and save the corrected status to MySQL once. */
function refreshBmiStatuses(){
  const sMap=studentMap();
  const bmi=DB.get(KEY.bmi);
  let changed=false;
  bmi.forEach(r=>{
    const s=sMap[r.studentId];
    const status=nutritionLabel(r.bmi, s?.age, s?.sex);
    if(r.status!==status){ r.status=status; changed=true; }
  });
  if(changed) DB.set(KEY.bmi,bmi);
}

function renderDailyTable(records, opts={}){
  const sMap=studentMap(), uMap=userMap();
  if(!records.length) return emptyState('No health monitoring records yet.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date / Time</th><th>Student</th>${opts.showGradeSection?'<th>Grade / Section</th>':''}<th>Temp</th><th>Symptoms</th><th>Remarks</th>
    <th>Status</th>${opts.showTeacher?'<th>Adviser</th>':''}${opts.actions?'<th>Actions</th>':''}</tr></thead>
    <tbody>${records.map(r=>{
      const s=sMap[r.studentId]; const flagged=needsClinicAttention(r.temperature,r.symptoms);
      const statusBadge={ Recorded: flagged?'<span class="badge badge-fever">Needs Attention</span>':'<span class="badge-none">Normal</span>',
        Referred:'<span class="badge badge-referred">Referred</span>', Reviewed:'<span class="badge badge-reviewed">Reviewed</span>',
        Returned:'<span class="badge badge-returned">Returned for Correction</span>' }[r.status] || '';
      return `<tr>
        <td>${fmtDate(r.date)}<br><small style="color:var(--gray-500)">${r.time}</small></td>
        <td><strong>${s?s.name:'?'}</strong></td>
        ${opts.showGradeSection?`<td>${s?s.grade+' · '+s.section:'—'}</td>`:''}
        <td>${r.temperature}°C</td><td>${r.symptoms||'—'}</td><td style="max-width:160px">${r.remarks||'—'}</td>
        <td>${statusBadge}</td>
        ${opts.showTeacher?`<td>${uMap[r.teacherId]?uMap[r.teacherId].name:'—'}</td>`:''}
        ${opts.actions ? `<td>${opts.actions(r,s,flagged)}</td>` : ''}
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}
function renderBmiTable(records, opts={}){
  const sMap=studentMap(), uMap=userMap();
  if(!records.length) return emptyState('No BMI records yet.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Student</th><th>Age</th><th>Sex</th>${opts.showGradeSection?'<th>Grade / Section</th>':''}<th>School Year</th><th>Period</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th><th>Date</th>${opts.showTeacher?'<th>Adviser</th>':''}</tr></thead>
    <tbody>${records.map(r=>{
      const s=sMap[r.studentId];
      return `<tr>
        <td><strong>${s?s.name:'?'}</strong> <span style="color:var(--gray-500);font-size:11px">(${r.studentId})</span></td>
        <td>${s?.age ?? '—'}</td><td>${s?.sex ?? '—'}</td>
        ${opts.showGradeSection?`<td>${s?s.grade+' · '+s.section:'—'}</td>`:''}
        <td>${r.schoolYear}</td><td>${r.period==='Beginning'?'Beginning of SY':'End of SY'}</td>
        <td>${r.height} cm</td><td>${r.weight} kg</td><td><strong>${r.bmi}</strong></td>
        <td>${nutritionBadge(r.status)}</td><td>${fmtDate(r.date)}</td>
        ${opts.showTeacher?`<td>${uMap[r.teacherId]?uMap[r.teacherId].name:'—'}</td>`:''}
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}
function emptyState(msg){ return `<div class="empty-state">${msg}</div>`; }
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function showToast(msg,type='info'){
  const tc=document.getElementById('toast-container');
  const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
  tc.appendChild(t); setTimeout(()=>{ t.style.animation='fadeOut .3s forwards'; setTimeout(()=>t.remove(),300); },2600);
}

/* ================================================================
   TEACHER PANELS
   ================================================================ */
function tplTeacherDash(){
  const students=myStudents(); const daily=DB.get(KEY.daily).filter(d=>d.teacherId===currentUser.id);
  const today=todayISO();
  const flaggedToday=daily.filter(d=>d.date===today && needsClinicAttention(d.temperature,d.symptoms)).length;
  const referred=daily.filter(d=>d.status==='Referred').length;
  const returned=daily.filter(d=>d.status==='Returned').length;
  const unread=DB.get(KEY.notifications).filter(n=>n.teacherId===currentUser.id && !n.read).length;
  return `
  <div class="stats-grid">
    <div class="stat-card green"><div class="stat-label">My Students</div><div class="stat-value">${students.length}</div><div class="stat-hint">${currentUser.grade} · ${currentUser.section}</div></div>
    <div class="stat-card red"><div class="stat-label">Flagged Today</div><div class="stat-value">${flaggedToday}</div><div class="stat-hint">Needs clinic attention</div></div>
    <div class="stat-card blue"><div class="stat-label">Referred to Clinic</div><div class="stat-value">${referred}</div><div class="stat-hint">Awaiting/under review</div></div>
    <div class="stat-card purple"><div class="stat-label">Unread Feedback</div><div class="stat-value">${unread}</div><div class="stat-hint">${returned} record(s) returned</div></div>
  </div>
  <div class="section-card">
    <div class="section-card-header"><span class="section-card-title">Recent Daily Health Monitoring</span></div>
    <div class="section-card-body">${renderDailyTable(daily.slice(-6).reverse())}</div>
  </div>`;
}

function tplMyStudents(){
  return `<div class="section-card">
    <div class="section-card-header"><span class="section-card-title">My Students — ${currentUser.grade} · ${currentUser.section}</span><button class="btn btn-primary btn-sm" onclick="openAddStudentModal()">+ Add Student</button></div>
    <div class="section-card-body">
      <div class="filter-row" style="margin-bottom:14px"><input class="search-input" id="ms-search" placeholder="Search by name or Student ID…" oninput="renderMyStudents()"></div>
      <div id="ms-table-wrap"></div>
    </div></div>`;
}
function openAddStudentModal(){
  document.getElementById('student-modal-title').textContent='Add Student';
  document.getElementById('s-edit-id').value='';
  ['s-name','s-age','s-sex','s-grade','s-section'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('s-grade').value=currentUser.grade||'';
  document.getElementById('s-section').value=currentUser.section||'';
  openModal('modal-student');
}
function openEditStudentModal(id){
  const s=DB.getOne(KEY.students,id); if(!s) return;
  document.getElementById('student-modal-title').textContent='Edit Student';
  document.getElementById('s-edit-id').value=id;
  document.getElementById('s-name').value=s.name; document.getElementById('s-age').value=s.age;
  document.getElementById('s-sex').value=s.sex; document.getElementById('s-grade').value=s.grade; document.getElementById('s-section').value=s.section;
  openModal('modal-student');
}
function saveStudent(){
  const name=document.getElementById('s-name').value.trim(); const age=document.getElementById('s-age').value;
  const sex=document.getElementById('s-sex').value; const grade=document.getElementById('s-grade').value; const section=document.getElementById('s-section').value.trim();
  if(!name||!age||!sex||!grade||!section){ showToast('Please fill in all required fields.','error'); return; }
  const editId=document.getElementById('s-edit-id').value;
  const students=DB.get(KEY.students);
  if(editId){ const idx=students.findIndex(s=>s.id===editId); if(idx>-1){ students[idx]={...students[idx],name,age:+age,sex,grade,section}; DB.set(KEY.students,students); showToast('Student updated.','success'); } }
  else{ let max=0; students.forEach(s=>{ const m=/^MES-(\d+)$/.exec(s.id); if(m) max=Math.max(max,parseInt(m[1],10)); });
    const id='MES-'+String(max+1).padStart(4,'0');
    students.push({ id,name,age:+age,sex,grade,section,adviserId:currentUser.id }); DB.set(KEY.students,students);
    logActivity(`Added student ${name} (${id})`); showToast(`Student added — ID ${id}.`,'success'); }
  closeModal('modal-student');
  if(currentPanel==='t-mystudents') renderMyStudents();
}
function renderMyStudents(){
  const q=(document.getElementById('ms-search')?.value||'').toLowerCase();
  const students=myStudents().filter(s=>!q||s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q));
  const bmi=DB.get(KEY.bmi), daily=DB.get(KEY.daily);
  const wrap=document.getElementById('ms-table-wrap');
  if(!students.length){ wrap.innerHTML=emptyState('No students found.'); return; }
  wrap.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Student ID</th><th>Name</th><th>Age</th><th>Sex</th><th>BMI Status</th><th>Visits Logged</th><th>Actions</th></tr></thead>
    <tbody>${students.map(s=>{
      const latestBmi=bmi.filter(b=>b.studentId===s.id&&b.schoolYear===currentSY()).sort((a,b)=>a.period.localeCompare(b.period)).slice(-1)[0];
      const visits=daily.filter(d=>d.studentId===s.id).length;
      return `<tr>
        <td style="font-size:11px;color:var(--gray-500)">${s.id}</td><td><strong>${s.name}</strong></td><td>${s.age}</td><td>${s.sex}</td>
        <td>${latestBmi?nutritionBadge(latestBmi.status):'<span class="badge-none">Not assessed</span>'}</td>
        <td>${visits}</td>
        <td><button class="btn-icon" onclick="openEditStudentModal('${s.id}')">${ICON_EDIT}</button> <button class="btn-icon" onclick="viewStudentProfile('${s.id}')">${ICON_EYE}</button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}
function viewStudentProfile(sid){
  const s=DB.getOne(KEY.students,sid); if(!s) return;
  const daily=DB.get(KEY.daily).filter(d=>d.studentId===sid);
  const bmi=DB.get(KEY.bmi).filter(b=>b.studentId===sid);
  openPrintReport(`Student Profile — ${s.name}`, `
    <div class="student-profile-card">
      <div class="sp-row"><span>Student ID</span><strong>${s.id}</strong></div>
      <div class="sp-row"><span>Name</span><strong>${s.name}</strong></div>
      <div class="sp-row"><span>Age / Sex</span><strong>${s.age} · ${s.sex}</strong></div>
      <div class="sp-row"><span>Grade / Section</span><strong>${s.grade} · ${s.section}</strong></div>
    </div>
    <h4 style="margin-bottom:8px">BMI History</h4>${renderBmiTable(bmi)}
    <h4 style="margin:16px 0 8px">Health Monitoring History</h4>${renderDailyTable(daily)}
  `);
}

function tplDaily(){
  return `<div class="section-card">
    <div class="section-card-header"><span class="section-card-title">Daily Health Monitoring</span><button class="btn btn-primary btn-sm" onclick="openDailyModal()">+ Record Today's Check</button></div>
    <div class="section-card-body">
      <div class="filter-row" style="margin-bottom:14px"><input class="search-input" id="dm-search" placeholder="Search by student name…" oninput="renderDailyList()"></div>
      <div id="dm-table-wrap"></div>
    </div></div>`;
}
function renderDailyList(){
  const q=(document.getElementById('dm-search')?.value||'').toLowerCase();
  const sMap=studentMap();
  const data=DB.get(KEY.daily).filter(d=>d.teacherId===currentUser.id && (!q || (sMap[d.studentId]&&sMap[d.studentId].name.toLowerCase().includes(q)))).slice().reverse();
  document.getElementById('dm-table-wrap').innerHTML = renderDailyTable(data, { actions:(r,s,flagged)=>{
    if(r.status==='Recorded' && flagged) return `<button class="btn btn-secondary btn-sm" onclick="submitReferral('${r.id}')">Submit to Clinic</button>`;
    if(r.status==='Returned') return `<span style="font-size:11px;color:var(--purple)">See Clinic Feedback</span>`;
    return '';
  }});
}
function openDailyModal(){
  document.getElementById('d-student').innerHTML='<option value="">— Select student —</option>'+myStudents().map(s=>`<option value="${s.id}">${s.name} — ${s.grade} ${s.section}</option>`).join('');
  document.getElementById('d-date').value=todayISO(); document.getElementById('d-time').value=nowHM();
  document.getElementById('d-temp').value=''; document.getElementById('d-symptoms').value=''; document.getElementById('d-remarks').value='';
  document.getElementById('d-flag-warn').style.display='none';
  openModal('modal-daily');
}
function checkDailyFlag(){
  const t=document.getElementById('d-temp').value, s=document.getElementById('d-symptoms').value;
  document.getElementById('d-flag-warn').style.display = needsClinicAttention(t,s) ? 'flex' : 'none';
}
function saveDaily(){
  const studentId=document.getElementById('d-student').value;
  const date=document.getElementById('d-date').value, time=document.getElementById('d-time').value;
  const temperature=document.getElementById('d-temp').value, symptoms=document.getElementById('d-symptoms').value.trim();
  const remarks=document.getElementById('d-remarks').value.trim();
  if(!studentId||!date||!time||!temperature||!symptoms){ showToast('Please fill in all required fields.','error'); return; }
  const record={ id:uid(), studentId, date, time, temperature:+temperature, symptoms, remarks, teacherId:currentUser.id, status:'Recorded' };
  const daily=DB.get(KEY.daily); daily.push(record); DB.set(KEY.daily,daily);
  logActivity(`Recorded daily health check for ${studentId}`);
  showToast('Health record saved.','success');
  closeModal('modal-daily');
  if(currentPanel==='t-daily') renderDailyList();
}
function submitReferral(dailyId){
  const d=DB.getOne(KEY.daily,dailyId); if(!d) return;
  const referrals=DB.get(KEY.referrals);
  referrals.push({ id:uid(), dailyId, studentId:d.studentId, teacherId:currentUser.id, date:todayISO(), status:'Pending' });
  DB.set(KEY.referrals, referrals);
  const daily=DB.get(KEY.daily); const idx=daily.findIndex(x=>x.id===dailyId); if(idx>-1){ daily[idx].status='Referred'; DB.set(KEY.daily,daily); }
  logActivity(`Referred student ${d.studentId} to clinic`);
  showToast('Student submitted to clinic.','success');
  if(currentPanel==='t-daily') renderDailyList();
}

function tplBmi(){
  return `<div class="info-box">BMI Monitoring is conducted only at the <strong>Beginning</strong> and <strong>End</strong> of the school year — not every month. It is separate from Daily Health Monitoring. Nutritional status uses <strong>WHO BMI-for-age</strong> based on the student's age and sex.</div>
  <div class="section-card"><div class="section-card-header"><span class="section-card-title">Record BMI</span><button class="btn btn-primary btn-sm" onclick="openBmiModal()">+ New Assessment</button></div>
  <div class="section-card-body"><div id="bmi-table-wrap"></div></div></div>
  <div id="bmi-feeding-summary" style="margin-bottom:16px"></div>`;
}
/* Students whose latest BMI record (this school year) is Wasted or Severely Wasted — auto feeding-program tally, no manual counting needed */
/* Maps a raw BMI status into the category the adviser wants to see: Malnourished, Overweight, Obese, or Normal */
function feedingCategory(status){
  if(status==='Wasted'||status==='Severely Wasted') return 'Malnourished';
  if(status==='Overweight') return 'Overweight';
  if(status==='Obese') return 'Obese';
  return 'Normal';
}
function feedingCategoryBadgeClass(cat){
  return { 'Malnourished':'badge-wasted','Overweight':'badge-overweight','Obese':'badge-obese','Normal':'badge-normal' }[cat] || 'badge-normal';
}
function feedingCategoryBadge(status){
  const cat=feedingCategory(status);
  return `<span class="badge ${feedingCategoryBadgeClass(cat)}">${cat}</span>`;
}
/* All of this teacher's students who have a BMI record this school year, each tagged with their category */
function feedingCandidatesForTeacher(teacherId){
  const students=DB.get(KEY.students).filter(s=>s.adviserId===teacherId);
  const bmi=DB.get(KEY.bmi);
  const results=[];
  students.forEach(s=>{
    const latest=bmi.filter(b=>b.studentId===s.id && b.schoolYear===currentSY()).sort((a,b)=>a.period.localeCompare(b.period)).slice(-1)[0];
    if(latest) results.push({ student:s, bmi:latest, category:feedingCategory(latest.status) });
  });
  return results;
}
/* Same idea but school-wide, used by the Administrator's Feeding Program page */
function feedingCandidatesAll(){
  const students=DB.get(KEY.students);
  const bmi=DB.get(KEY.bmi);
  const results=[];
  students.forEach(s=>{
    const latest=bmi.filter(b=>b.studentId===s.id && b.schoolYear===currentSY()).sort((a,b)=>a.period.localeCompare(b.period)).slice(-1)[0];
    if(latest) results.push({ student:s, bmi:latest, category:feedingCategory(latest.status) });
  });
  return results;
}
/* Shared renderer: stat cards (Malnourished/Overweight/Obese/Normal) + student list, used by both teacher and admin views */
function renderFeedingCardHTML(rows, opts={}){
  if(!rows.length) return `<div class="info-box" style="margin-bottom:0">No BMI records yet for ${currentSY()}.</div>`;
  const CATS=['Malnourished','Overweight','Obese','Normal'];
  const cardColor={ 'Malnourished':'orange','Overweight':'yellow','Obese':'red','Normal':'green' };
  const counts=Object.fromEntries(CATS.map(c=>[c,0]));
  rows.forEach(r=>{ counts[r.category]++; });
  const uMap=opts.showTeacher?userMap():null;
  const inner = `
      <div class="stats-grid" style="margin-bottom:18px">
        ${CATS.map(c=>`<div class="stat-card ${cardColor[c]}">
          <div class="stat-label">${c}</div><div class="stat-value">${counts[c]}</div>
          <div class="stat-hint">${counts[c]===1?'bata':'ka bata'}</div></div>`).join('')}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Student</th>${opts.showGradeSection?'<th>Grade / Section</th>':''}<th>BMI</th><th>Category</th><th>Assessed</th>${opts.showTeacher?'<th>Adviser</th>':''}</tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td><strong>${r.student.name}</strong></td>
          ${opts.showGradeSection?`<td>${r.student.grade} · ${r.student.section}</td>`:''}
          <td>${r.bmi.bmi}</td><td>${feedingCategoryBadge(r.bmi.status)}</td><td>${fmtDate(r.bmi.date)}</td>
          ${opts.showTeacher?`<td>${uMap[r.student.adviserId]?uMap[r.student.adviserId].name:'—'}</td>`:''}
        </tr>`).join('')}</tbody>
      </table></div>`;
  if(opts.embedded){
    return `<div style="border-top:1px solid var(--gray-100);padding-top:16px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--green-900);margin-bottom:12px">${opts.title||'Feeding Section'} — ${currentSY()}
        <span style="font-size:11px;font-weight:500;color:var(--gray-500);text-transform:none;letter-spacing:0"> · students with Malnourished/Wasted or Obese status are added here automatically</span></div>
      ${inner}
    </div>`;
  }
  return `<div class="section-card" style="margin-bottom:0">
    <div class="section-card-header"><span class="section-card-title">${opts.title||'Feeding Section'} — ${currentSY()}</span></div>
    <div class="section-card-body">${inner}</div></div>`;
}
function renderFeedingSummaryT(){
  const box=document.getElementById('bmi-feeding-summary');
  if(!box) return;
  const rows=feedingCandidatesForTeacher(currentUser.id);
  box.innerHTML=renderFeedingCardHTML(rows, { title:'Feeding Section' });
}
function openBmiModal(){
  document.getElementById('bmi-student').innerHTML='<option value="">— Select student —</option>'+myStudents().map(s=>`<option value="${s.id}">${s.name} — ${s.grade} ${s.section}</option>`).join('');
  document.getElementById('bmi-age').value=''; document.getElementById('bmi-sex').value='';
  document.getElementById('bmi-year').value=currentSY(); document.getElementById('bmi-period').value='';
  document.getElementById('bmi-height').value=''; document.getElementById('bmi-weight').value='';
  document.getElementById('bmi-preview').classList.remove('show');
  openModal('modal-bmi');
}
function syncBmiStudentInfo(){
  const s=DB.getOne(KEY.students, document.getElementById('bmi-student').value);
  document.getElementById('bmi-age').value=s?s.age:'';
  document.getElementById('bmi-sex').value=s?s.sex:'';
  previewBmi();
}
function previewBmi(){
  const h=+document.getElementById('bmi-height').value, w=+document.getElementById('bmi-weight').value;
  const box=document.getElementById('bmi-preview');
  if(!h||!w){ box.classList.remove('show'); return; }
  const bmi=calcBMI(h,w), age=+document.getElementById('bmi-age').value, sex=document.getElementById('bmi-sex').value;
  document.getElementById('bmi-preview-value').textContent=bmi;
  document.getElementById('bmi-preview-status').innerHTML = (age&&sex) ? nutritionBadge(nutritionLabel(bmi,age,sex)) : '<span class="badge-none">Select a student</span>';
  box.classList.add('show');
}
function saveBmi(){
  const studentId=document.getElementById('bmi-student').value;
  const schoolYear=document.getElementById('bmi-year').value.trim();
  const period=document.getElementById('bmi-period').value;
  const h=+document.getElementById('bmi-height').value, w=+document.getElementById('bmi-weight').value;
  if(!studentId||!schoolYear||!period||!h||!w){ showToast('Please fill in all required fields.','error'); return; }
  const student=DB.getOne(KEY.students,studentId);
  const bmiVal=calcBMI(h,w), status=nutritionLabel(bmiVal, student?.age, student?.sex);
  const records=DB.get(KEY.bmi);
  const idx=records.findIndex(r=>r.studentId===studentId && r.schoolYear===schoolYear && r.period===period);
  const record={ id: idx>-1?records[idx].id:uid(), studentId, schoolYear, period, height:h, weight:w, bmi:bmiVal, status, date:todayISO(), teacherId:currentUser.id };
  if(idx>-1){ records[idx]=record; showToast(`Updated ${period} assessment.`,'success'); } else { records.push(record); showToast(`BMI recorded — ${status}. Automatically added to the ${feedingCategory(status)} tally.`,'success'); }
  DB.set(KEY.bmi,records);
  logActivity(`Recorded BMI (${period}) for ${studentId}`);
  closeModal('modal-bmi');
  if(currentPanel==='t-bmi') renderBmiTable_Panel();
}
function renderBmiTable_Panel(){
  const rows=DB.get(KEY.bmi).filter(b=>b.teacherId===currentUser.id).slice().sort((a,b)=>(b.date+b.period).localeCompare(a.date+a.period));
  document.getElementById('bmi-table-wrap').innerHTML = renderBmiTable(rows);
  renderFeedingSummaryT();
}

/* Returns every distinct symptom term recorded for this teacher's students, most common first */
function distinctSymptomsForTeacher(teacherId){
  const daily=DB.get(KEY.daily).filter(d=>d.teacherId===teacherId);
  const counts={};
  daily.forEach(d=>splitSymptoms(d.symptoms).forEach(s=>{ counts[s]=(counts[s]||0)+1; }));
  return Object.keys(counts).sort((a,b)=>counts[b]-counts[a] || a.localeCompare(b));
}
function capitalizeWord(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function tplHealthRecordsT(){
  const symptomList=distinctSymptomsForTeacher(currentUser.id);
  const symptomOptions=symptomList.map(s=>`<option value="symptom:${s}">${capitalizeWord(s)}</option>`).join('');
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Health Monitoring Records — Permanent History</span></div>
  <div class="section-card-body">
    <div class="filter-row" style="margin-bottom:14px">
      <input class="search-input" id="hr-search" placeholder="Search by student name…" oninput="renderHealthRecordsT()">
      <input type="date" class="filter-select" id="hr-date" onchange="renderHealthRecordsT()">
      <select class="filter-select" id="hr-flagged" onchange="renderHealthRecordsT()">
        <option value="">All Records</option>
        <option value="flagged">Fever / Referred Only</option>
        ${symptomOptions ? `<optgroup label="By Symptom">${symptomOptions}</optgroup>` : ''}
      </select>
      <button class="btn btn-secondary btn-sm" id="hr-clear" onclick="clearHealthRecordsFilterT()" style="display:none">Clear Date</button>
    </div>
    <div id="hr-symptom-summary" style="margin-bottom:14px"></div>
    <div id="hr-summary" style="margin-bottom:10px"></div>
    <div id="hr-table-wrap"></div>
  </div></div>`;
}
function clearHealthRecordsFilterT(){
  document.getElementById('hr-date').value='';
  renderHealthRecordsT();
}
/* Splits a symptoms string into individual symptom terms, e.g.
   "Fever, headache" -> ["fever","headache"], "ubo ug hilanat" -> ["ubo","hilanat"] */
function splitSymptoms(str){
  if(!str) return [];
  return str.split(/,|\/|;|\band\b|\bug\b|&/i)
    .map(s=>s.trim().toLowerCase())
    .filter(s=>s && s!=='none' && s!=='wala' && s!=='n/a');
}
/* Builds a tally box: how many students had each symptom on the given set of records */
function renderSymptomTally(records){
  if(!records.length) return '';
  const counts={};
  records.forEach(r=>{ splitSymptoms(r.symptoms).forEach(sym=>{ counts[sym]=(counts[sym]||0)+1; }); });
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return '';
  return `<div class="info-box" style="margin-bottom:10px"><strong>Symptom breakdown</strong> — pila ka bata ang naay matag sintomas sa gipili nga petsa/records:</div>
  <div class="symptom-tally-grid">${entries.map(([sym,count])=>`
    <div class="symptom-tally-card">
      <div class="symptom-tally-name">${sym}</div>
      <div class="symptom-tally-count">${count} <small>${count===1?'bata':'ka bata'}</small></div>
    </div>`).join('')}</div>`;
}
function renderHealthRecordsT(){
  const q=(document.getElementById('hr-search')?.value||'').toLowerCase();
  const dateVal=document.getElementById('hr-date')?.value||'';
  const filterVal=document.getElementById('hr-flagged')?.value||'';
  const flaggedOnly=filterVal==='flagged';
  const symptomFilter=filterVal.startsWith('symptom:') ? filterVal.slice(8) : '';
  const sMap=studentMap();
  let data=DB.get(KEY.daily).filter(d=>d.teacherId===currentUser.id
    && (!q||(sMap[d.studentId]&&sMap[d.studentId].name.toLowerCase().includes(q)))
    && (!dateVal||d.date===dateVal));
  if(flaggedOnly) data=data.filter(d=>needsClinicAttention(d.temperature,d.symptoms)||d.status==='Referred'||d.status==='Reviewed');
  if(symptomFilter) data=data.filter(d=>splitSymptoms(d.symptoms).includes(symptomFilter));
  data=data.slice().reverse();
  document.getElementById('hr-clear').style.display = dateVal ? 'inline-flex' : 'none';
  const summary=document.getElementById('hr-summary');
  if(dateVal){
    const flaggedCount=data.filter(d=>needsClinicAttention(d.temperature,d.symptoms)).length;
    const referredCount=data.filter(d=>['Referred','Reviewed','Returned'].includes(d.status)).length;
    const symptomNote = symptomFilter ? ` · filtered to <strong>${capitalizeWord(symptomFilter)}</strong>` : '';
    summary.innerHTML = `<div class="info-box" style="margin-bottom:0">Showing <strong>${fmtDate(dateVal)}</strong>: ${data.length} record(s) · <strong>${flaggedCount}</strong> with fever/urgent symptoms · <strong>${referredCount}</strong> referred to clinic${symptomNote}.</div>`;
  } else {
    summary.innerHTML='';
  }
  document.getElementById('hr-symptom-summary').innerHTML = dateVal ? renderSymptomTally(data) : '';
  document.getElementById('hr-table-wrap').innerHTML=renderDailyTable(data);
}
function tplBmiRecordsT(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">BMI Records — Permanent History</span></div>
  <div class="section-card-body"><div id="bmir-table-wrap"></div></div></div>`;
}
function renderBmiRecordsT(){
  const rows=DB.get(KEY.bmi).filter(b=>b.teacherId===currentUser.id).slice().reverse();
  document.getElementById('bmir-table-wrap').innerHTML=renderBmiTable(rows);
}
function tplPrintT(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Print Reports — ${currentUser.grade} · ${currentUser.section}</span></div>
  <div class="section-card-body">
    <p class="field-hint" style="margin-bottom:14px">These reports include only the students and records assigned to you.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="printTeacherBmiReport()">${ICON_PRINT} Print BMI Report</button>
      <button class="btn btn-primary btn-sm" onclick="printTeacherHealthReport()">${ICON_PRINT} Print Health Monitoring Report</button>
    </div>
  </div></div>`;
}
function printTeacherBmiReport(){
  const rows=DB.get(KEY.bmi).filter(b=>b.teacherId===currentUser.id).slice().sort((a,b)=>(b.date+b.period).localeCompare(a.date+a.period));
  openPrintReport(`BMI Report — ${currentUser.grade} · ${currentUser.section}`, `
    <div class="slip-meta">
      <div>Adviser: <strong>${currentUser.name}</strong></div>
      <div>Records: <strong>${rows.length}</strong></div>
    </div>
    ${renderBmiTable(rows,{showGradeSection:true})}
    <div class="slip-sign"><div>Class Adviser</div><div>School Nurse / Principal</div></div>
  `);
}
function printTeacherHealthReport(){
  const rows=DB.get(KEY.daily).filter(d=>d.teacherId===currentUser.id).slice().reverse();
  openPrintReport(`Health Monitoring Report — ${currentUser.grade} · ${currentUser.section}`, `
    <div class="slip-meta">
      <div>Adviser: <strong>${currentUser.name}</strong></div>
      <div>Records: <strong>${rows.length}</strong></div>
    </div>
    ${renderDailyTable(rows,{showGradeSection:true})}
    <div class="slip-sign"><div>Class Adviser</div><div>School Nurse / Principal</div></div>
  `);
}

function tplFeedback(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Clinic Feedback</span></div>
  <div class="section-card-body"><div id="feedback-wrap"></div></div></div>`;
}
function renderFeedback(){
  const notifs=DB.get(KEY.notifications).filter(n=>n.teacherId===currentUser.id).slice().reverse();
  const wrap=document.getElementById('feedback-wrap');
  if(!notifs.length){ wrap.innerHTML=emptyState('No clinic feedback yet.'); return; }
  wrap.innerHTML=notifs.map(n=>`
    <div class="notif-item ${n.read?'':'unread'}">
      <div class="notif-icon">${n.type==='returned'?ICON_RETURNED:n.type==='recommendation'?ICON_CLIPBOARD:ICON_CHECK}</div>
      <div class="notif-body"><div class="notif-msg">${n.message}</div><div class="notif-meta">${fmtDate(n.date)}</div></div>
    </div>`).join('');
  const unreadIds=notifs.filter(n=>!n.read).map(n=>n.id);
  if(unreadIds.length){ const all=DB.get(KEY.notifications); all.forEach(n=>{ if(unreadIds.includes(n.id)) n.read=true; }); DB.set(KEY.notifications, all); buildNav(); }
}

function tplProfile(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">My Profile</span></div>
  <div class="section-card-body">
    <div class="sp-row"><span>Name</span><strong>${currentUser.name}</strong></div>
    <div class="sp-row"><span>Username</span><strong>${currentUser.username}</strong></div>
    <div class="sp-row"><span>Role</span><strong>${roleLabel(currentUser.role)}</strong></div>
    ${currentUser.role==='teacher'?`<div class="sp-row"><span>Assigned Class</span><strong>${currentUser.grade} · ${currentUser.section}</strong></div>`:''}
  </div></div>`;
}

/* ================================================================
   CLINIC PANELS
   ================================================================ */
function tplClinicDash(){
  const referrals=DB.get(KEY.referrals); const pending=referrals.filter(r=>r.status==='Pending').length;
  const assessments=DB.get(KEY.assessments); const observation=assessments.filter(a=>a.disposition==='Under Observation').length;
  const recs=DB.get(KEY.recs);
  return `<div class="stats-grid">
    <div class="stat-card orange"><div class="stat-label">Pending Referrals</div><div class="stat-value">${pending}</div></div>
    <div class="stat-card blue"><div class="stat-label">Under Observation</div><div class="stat-value">${observation}</div></div>
    <div class="stat-card green"><div class="stat-label">Assessments Completed</div><div class="stat-value">${assessments.length}</div></div>
    <div class="stat-card purple"><div class="stat-label">Recommendations Issued</div><div class="stat-value">${recs.length}</div></div>
  </div>
  <div class="section-card"><div class="section-card-header"><span class="section-card-title">Pending Referrals</span></div>
  <div class="section-card-body">${renderReferralTable(referrals.filter(r=>r.status==='Pending'))}</div></div>`;
}
function renderReferralTable(referrals){
  const sMap=studentMap(), uMap=userMap(); const daily=DB.get(KEY.daily);
  if(!referrals.length) return emptyState('No referrals to show.');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Student</th><th>Grade / Section</th><th>Temp</th><th>Symptoms</th><th>Referred By</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${referrals.map(r=>{
      const s=sMap[r.studentId]; const d=daily.find(x=>x.id===r.dailyId);
      return `<tr>
        <td>${fmtDate(r.date)}</td><td><strong>${s?s.name:'?'}</strong></td><td>${s?s.grade+' · '+s.section:'—'}</td>
        <td>${d?d.temperature+'°C':'—'}</td><td>${d?d.symptoms:'—'}</td><td>${uMap[r.teacherId]?uMap[r.teacherId].name:'—'}</td>
        <td><span class="badge ${r.status==='Pending'?'badge-pending':'badge-reviewed'}">${r.status}</span></td>
        <td>
          ${r.status==='Pending'?`<button class="btn btn-primary btn-sm" onclick="openAssessModal('${r.id}')">Assess</button>
          <button class="btn btn-secondary btn-sm" onclick="openReturnModal('${r.dailyId}','${r.id}')">Return</button>`:''}
        </td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}
function tplPending(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Pending Referrals</span></div>
  <div class="section-card-body"><div id="pending-wrap"></div></div></div>`;
}
function renderPending(){ document.getElementById('pending-wrap').innerHTML=renderReferralTable(DB.get(KEY.referrals).filter(r=>r.status==='Pending')); }

function tplObservation(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Students Under Observation</span></div>
  <div class="section-card-body"><div id="observation-wrap"></div></div></div>`;
}
function renderObservation(){
  const sMap=studentMap();
  const assess=DB.get(KEY.assessments).filter(a=>a.disposition==='Under Observation');
  const referrals=DB.get(KEY.referrals);
  const wrap=document.getElementById('observation-wrap');
  if(!assess.length){ wrap.innerHTML=emptyState('No students currently under observation.'); return; }
  wrap.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Student</th><th>Findings</th><th>Treatment</th><th>Notes</th></tr></thead>
    <tbody>${assess.map(a=>{
      const ref=referrals.find(r=>r.id===a.referralId); const s=ref?sMap[ref.studentId]:null;
      return `<tr><td>${fmtDate(a.date)}</td><td><strong>${s?s.name:'?'}</strong></td><td>${a.findings}</td><td>${a.treatment}</td><td>${a.notes||'—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function openAssessModal(referralId){
  const r=DB.getOne(KEY.referrals,referralId); if(!r) return;
  const s=DB.getOne(KEY.students,r.studentId); const d=DB.getOne(KEY.daily,r.dailyId);
  document.getElementById('as-referral-id').value=referralId;
  document.getElementById('as-referral-info').innerHTML = `<strong>${s?s.name:'?'}</strong> · ${s?s.grade+' · '+s.section:''} · Reported: ${d?d.temperature+'°C, '+d.symptoms:''}`;
  document.getElementById('as-temp').value = d?d.temperature:'';
  document.getElementById('as-findings').value=''; document.getElementById('as-treatment').value=''; document.getElementById('as-notes').value='';
  document.getElementById('as-disposition').value='';
  document.getElementById('as-rec-hint').style.display='none';
  const medicines=DB.get(KEY.medicines);
  document.getElementById('as-medicine').innerHTML='<option value="">— None —</option>'+medicines.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  document.getElementById('as-medicine-purpose').textContent='';
  document.getElementById('as-dosage').value=''; document.getElementById('as-medtime').value=nowHM(); document.getElementById('as-medremarks').value='';
  openModal('modal-assess');
}
function toggleRecFields(){
  const d=document.getElementById('as-disposition').value;
  document.getElementById('as-rec-hint').style.display = (d==='Send Home'||d==='Refer to RHU/Hospital') ? 'block' : 'none';
}
function showMedicinePurpose(){
  const id=document.getElementById('as-medicine').value;
  const m=DB.getOne(KEY.medicines,id);
  document.getElementById('as-medicine-purpose').textContent = m ? `Purpose: ${m.purpose} · Stock: ${m.stock}` : '';
}
function saveAssessment(){
  const referralId=document.getElementById('as-referral-id').value;
  const temp=document.getElementById('as-temp').value;
  const findings=document.getElementById('as-findings').value.trim();
  const treatment=document.getElementById('as-treatment').value.trim();
  const notes=document.getElementById('as-notes').value.trim();
  const disposition=document.getElementById('as-disposition').value;
  if(!temp||!findings||!treatment||!disposition){ showToast('Please fill in all required fields.','error'); return; }
  const assessment={ id:uid(), referralId, nurseId:currentUser.id, date:todayISO(), time:nowHM(), vitalTemp:+temp, findings, treatment, notes, disposition };
  const assessments=DB.get(KEY.assessments); assessments.push(assessment); DB.set(KEY.assessments,assessments);

  const referrals=DB.get(KEY.referrals); const rIdx=referrals.findIndex(r=>r.id===referralId);
  const referral=referrals[rIdx];
  if(rIdx>-1){ referrals[rIdx].status='Reviewed'; DB.set(KEY.referrals,referrals); }
  const daily=DB.get(KEY.daily); const dIdx=daily.findIndex(d=>d.id===referral.dailyId);
  if(dIdx>-1){ daily[dIdx].status='Reviewed'; DB.set(KEY.daily,daily); }

  const medId=document.getElementById('as-medicine').value;
  if(medId){
    const dosage=document.getElementById('as-dosage').value.trim();
    const timeGiven=document.getElementById('as-medtime').value;
    const medremarks=document.getElementById('as-medremarks').value.trim();
    const med=DB.getOne(KEY.medicines,medId);
    const medlogs=DB.get(KEY.medlogs);
    medlogs.push({ id:uid(), assessmentId:assessment.id, medicineId:medId, medicineName:med?med.name:'', dosage, timeGiven, remarks:medremarks });
    DB.set(KEY.medlogs,medlogs);
    const meds=DB.get(KEY.medicines); const mIdx=meds.findIndex(m=>m.id===medId);
    if(mIdx>-1 && meds[mIdx].stock>0){ meds[mIdx].stock -= 1; DB.set(KEY.medicines,meds); }
  }

  notifyTeacher(referral.teacherId, 'reviewed', `Your referral for ${DB.getOne(KEY.students,referral.studentId)?.name||'a student'} has been reviewed. Disposition: ${disposition}.`);
  logActivity(`Assessed referral for ${referral.studentId} — ${disposition}`);
  closeModal('modal-assess');
  showToast('Assessment saved.','success');
  if(currentPanel==='c-pending') renderPending();
  if(currentPanel==='c-observation') renderObservation();
  if(currentPanel==='c-dash') loadPanel('c-dash');

  if(disposition==='Send Home' || disposition==='Refer to RHU/Hospital'){ openRecModal(referralId); }
}
function notifyTeacher(teacherId, type, message){
  const notifs=DB.get(KEY.notifications);
  notifs.push({ id:uid(), teacherId, type, message, date:todayISO(), read:false });
  DB.set(KEY.notifications, notifs);
}

function openReturnModal(dailyId, referralId){
  document.getElementById('ret-daily-id').value = dailyId + '|' + (referralId||'');
  document.getElementById('ret-note').value='';
  openModal('modal-return');
}
function saveReturn(){
  const [dailyId, referralId]=document.getElementById('ret-daily-id').value.split('|');
  const note=document.getElementById('ret-note').value.trim();
  if(!note){ showToast('Please enter a note for the teacher.','error'); return; }
  const daily=DB.get(KEY.daily); const idx=daily.findIndex(d=>d.id===dailyId);
  if(idx>-1){ daily[idx].status='Returned'; daily[idx].returnNote=note; DB.set(KEY.daily,daily);
    notifyTeacher(daily[idx].teacherId, 'returned', `A health record for ${DB.getOne(KEY.students,daily[idx].studentId)?.name||'a student'} was returned: "${note}"`);
  }
  if(referralId){ const referrals=DB.get(KEY.referrals); const rIdx=referrals.findIndex(r=>r.id===referralId); if(rIdx>-1){ referrals[rIdx].status='Returned'; DB.set(KEY.referrals,referrals); } }
  logActivity(`Returned record ${dailyId} for correction`);
  showToast('Sent back to teacher.','info');
  closeModal('modal-return');
  if(currentPanel==='c-pending') renderPending();
  if(currentPanel==='c-dash') loadPanel('c-dash');
}

function openRecModal(referralId){
  const r=DB.getOne(KEY.referrals,referralId); if(!r) return;
  const s=DB.getOne(KEY.students,r.studentId); const d=DB.getOne(KEY.daily,r.dailyId);
  const assess=DB.get(KEY.assessments).filter(a=>a.referralId===referralId).slice(-1)[0];
  document.getElementById('rec-referral-id').value=referralId;
  document.getElementById('rec-student-info').innerHTML=`<strong>${s?s.name:'?'}</strong> · ${s?s.grade+' · '+s.section:''} · Disposition: ${assess?assess.disposition:'—'}`;
  document.getElementById('rec-reason').value = d && isFever(d.temperature) ? `High fever (${d.temperature}°C) — ${assess?assess.disposition:'not fit to remain in school'}.` : (assess?assess.disposition+' recommended.':'Not fit to remain in school.');
  document.getElementById('rec-condition').value = assess?assess.findings:'';
  document.getElementById('rec-instructions').value = "Please monitor your child's condition closely at home. Ensure adequate rest and hydration. Administer any prescribed medication as directed. Consult a physician if symptoms persist or worsen.";
  openModal('modal-rec');
}
function saveRecommendation(){
  const referralId=document.getElementById('rec-referral-id').value;
  const reason=document.getElementById('rec-reason').value.trim();
  const condition=document.getElementById('rec-condition').value.trim();
  const instructions=document.getElementById('rec-instructions').value.trim();
  if(!reason||!condition||!instructions){ showToast('Please fill in all required fields.','error'); return; }
  const rec={ id:uid(), referralId, reason, condition, instructions, returnNote:'The student may return to school once fully recovered and medically fit to attend classes.', createdDate:todayISO(), nurseId:currentUser.id };
  const recs=DB.get(KEY.recs); recs.push(rec); DB.set(KEY.recs,recs);
  const r=DB.getOne(KEY.referrals,referralId);
  if(r) notifyTeacher(r.teacherId, 'recommendation', `A Recommendation was issued for ${DB.getOne(KEY.students,r.studentId)?.name||'a student'}.`);
  logActivity(`Issued recommendation for referral ${referralId}`);
  closeModal('modal-rec');
  showToast('Recommendation saved.','success');
  if(currentPanel==='c-recforms') renderRecForms();
  openPrintSlip(rec.id);
}

function tplRecForms(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Recommendation Forms</span></div>
  <div class="section-card-body"><div id="recforms-wrap"></div></div></div>`;
}
function renderRecForms(){
  const sMap=studentMap(); const referrals=DB.get(KEY.referrals);
  const recs=DB.get(KEY.recs).slice().reverse();
  const wrap=document.getElementById('recforms-wrap');
  if(!recs.length){ wrap.innerHTML=emptyState('No recommendations issued yet.'); return; }
  wrap.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Student</th><th>Reason</th><th>Actions</th></tr></thead>
    <tbody>${recs.map(rec=>{
      const ref=referrals.find(r=>r.id===rec.referralId); const s=ref?sMap[ref.studentId]:null;
      return `<tr><td>${fmtDate(rec.createdDate)}</td><td><strong>${s?s.name:'?'}</strong></td><td style="max-width:260px">${rec.reason}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="openPrintSlip('${rec.id}')">${ICON_PRINT} Print</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
}
function openPrintSlip(recId){
  const rec=DB.getOne(KEY.recs,recId); if(!rec) return;
  const ref=DB.getOne(KEY.referrals,rec.referralId);
  const s=ref?DB.getOne(KEY.students,ref.studentId):null;
  const assess=DB.get(KEY.assessments).filter(a=>a.referralId===rec.referralId).slice(-1)[0];
  document.getElementById('slip-school').textContent='School Clinic Management System';
  document.getElementById('slip-date').textContent=fmtDate(rec.createdDate);
  document.getElementById('slip-name').textContent=s?s.name:'—';
  document.getElementById('slip-id').textContent=s?s.id:'—';
  document.getElementById('slip-grade').textContent=s?`${s.grade} · ${s.section}`:'—';
  document.getElementById('slip-disposition').textContent=assess?assess.disposition:'—';
  document.getElementById('slip-reason').textContent=rec.reason;
  document.getElementById('slip-condition').textContent=rec.condition;
  document.getElementById('slip-instructions').textContent=rec.instructions;
  document.getElementById('print-slip').classList.add('open');
}
function closePrintSlip(){ document.getElementById('print-slip').classList.remove('open'); }

function tplMedicine(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Medicine Inventory</span><button class="btn btn-primary btn-sm" onclick="openMedicineModal()">+ Add Medicine</button></div>
  <div class="section-card-body"><div id="medicine-wrap"></div></div></div>`;
}
function renderMedicine(){
  const meds=DB.get(KEY.medicines);
  const wrap=document.getElementById('medicine-wrap');
  if(!meds.length){ wrap.innerHTML=emptyState('No medicines on file.'); return; }
  wrap.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Medicine</th><th>Purpose / Indication</th><th>Stock</th><th>Actions</th></tr></thead>
    <tbody>${meds.map(m=>`<tr>
      <td><strong>${m.name}</strong></td><td>${m.purpose}</td>
      <td>${m.stock} ${m.stock<10?'<span class="badge badge-lowstock">Low Stock</span>':''}</td>
      <td><button class="btn-icon" onclick="openMedicineModal('${m.id}')">${ICON_EDIT}</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}
function openMedicineModal(id){
  document.getElementById('med-modal-title').textContent = id ? 'Edit Medicine' : 'Add Medicine';
  document.getElementById('med-edit-id').value = id||'';
  if(id){ const m=DB.getOne(KEY.medicines,id); document.getElementById('med-name').value=m.name; document.getElementById('med-purpose').value=m.purpose; document.getElementById('med-stock').value=m.stock; }
  else{ document.getElementById('med-name').value=''; document.getElementById('med-purpose').value=''; document.getElementById('med-stock').value=''; }
  openModal('modal-medicine');
}
function saveMedicine(){
  const name=document.getElementById('med-name').value.trim(); const purpose=document.getElementById('med-purpose').value.trim(); const stock=document.getElementById('med-stock').value;
  if(!name||!purpose||stock===''){ showToast('Please fill in all required fields.','error'); return; }
  const editId=document.getElementById('med-edit-id').value;
  const meds=DB.get(KEY.medicines);
  if(editId){ const idx=meds.findIndex(m=>m.id===editId); if(idx>-1){ meds[idx]={...meds[idx],name,purpose,stock:+stock}; } }
  else{ meds.push({ id:uid(), name, purpose, stock:+stock }); }
  DB.set(KEY.medicines,meds);
  showToast('Medicine saved.','success');
  closeModal('modal-medicine');
  if(currentPanel==='c-medicine') renderMedicine();
}

function tplHealthReportsC(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Health Monitoring Reports — Referred Students Only</span>
  <button class="btn btn-secondary btn-sm" onclick="printReferredReport()">${ICON_PRINT} Print</button></div>
  <div class="section-card-body"><div id="hrc-wrap"></div></div></div>`;
}
function renderHealthReportsC(){
  const daily=DB.get(KEY.daily);
  const referred=DB.get(KEY.referrals);
  const rows=referred.map(r=>daily.find(d=>d.id===r.dailyId)).filter(Boolean);
  document.getElementById('hrc-wrap').innerHTML=renderDailyTable(rows, { showGradeSection:true, showTeacher:true });
}
function printReferredReport(){
  const daily=DB.get(KEY.daily);
  const rows=DB.get(KEY.referrals).map(r=>daily.find(d=>d.id===r.dailyId)).filter(Boolean);
  openPrintReport('Health Monitoring Report — Referred Students', renderDailyTable(rows,{showGradeSection:true,showTeacher:true}));
}
function tplBmiReportsC(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">BMI Reports</span>
  <button class="btn btn-secondary btn-sm" onclick="printAllBmiReport()">${ICON_PRINT} Print</button></div>
  <div class="section-card-body"><div id="bmic-wrap"></div></div></div>`;
}
function renderBmiReportsC(){ document.getElementById('bmic-wrap').innerHTML=renderBmiTable(DB.get(KEY.bmi),{showGradeSection:true,showTeacher:true}); }
function printAllBmiReport(){ openPrintReport('BMI Report — All Students', renderBmiTable(DB.get(KEY.bmi),{showGradeSection:true,showTeacher:true})); }

function tplPrintC(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Print Reports</span></div>
  <div class="section-card-body">
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="printReferredReport()">Print Health Monitoring Report (Referred Only)</button>
      <button class="btn btn-primary btn-sm" onclick="printAllBmiReport()">Print BMI Report</button>
      <button class="btn btn-primary btn-sm" onclick="printAllRecForms()">Print All Recommendation Forms</button>
    </div>
  </div></div>`;
}
function printAllRecForms(){
  const sMap=studentMap(); const referrals=DB.get(KEY.referrals);
  const recs=DB.get(KEY.recs);
  const html = recs.map(rec=>{
    const ref=referrals.find(r=>r.id===rec.referralId); const s=ref?sMap[ref.studentId]:null;
    return `<div style="border-bottom:1px solid #eee;padding:14px 0">
      <div style="font-weight:700">${s?s.name:'?'} — ${fmtDate(rec.createdDate)}</div>
      <div style="font-size:12.5px;margin-top:4px"><strong>Reason:</strong> ${rec.reason}</div>
      <div style="font-size:12.5px"><strong>Condition:</strong> ${rec.condition}</div>
      <div style="font-size:12.5px"><strong>Instructions:</strong> ${rec.instructions}</div>
    </div>`;
  }).join('') || emptyState('No recommendation forms yet.');
  openPrintReport('All Recommendation Forms', html);
}

/* ================================================================
   ADMIN PANELS
   ================================================================ */
function tplAdminDash(){
  const students=DB.get(KEY.students), users=DB.get(KEY.users), daily=DB.get(KEY.daily), bmi=DB.get(KEY.bmi);
  return `<div class="stats-grid">
    <div class="stat-card green"><div class="stat-label">Total Students</div><div class="stat-value">${students.length}</div></div>
    <div class="stat-card blue"><div class="stat-label">System Users</div><div class="stat-value">${users.length}</div></div>
    <div class="stat-card orange"><div class="stat-label">Health Records</div><div class="stat-value">${daily.length}</div></div>
    <div class="stat-card purple"><div class="stat-label">BMI Records</div><div class="stat-value">${bmi.length}</div></div>
  </div>
  <div class="section-card"><div class="section-card-header"><span class="section-card-title">School-Wide Nutritional Status (Beginning of ${currentSY()})</span></div>
  <div class="section-card-body">${adminNutritionBars()}</div></div>`;
}
function adminNutritionBars(){
  const beginning=DB.get(KEY.bmi).filter(b=>b.period==='Beginning'&&b.schoolYear===currentSY());
  const counts={ 'Severely Wasted':0,'Wasted':0,'Normal':0,'Overweight':0,'Obese':0 };
  beginning.forEach(b=>{ if(counts[b.status]!==undefined) counts[b.status]++; });
  const colors={ 'Severely Wasted':'var(--purple)','Wasted':'var(--orange)','Normal':'var(--green-600)','Overweight':'var(--yellow)','Obese':'var(--red)' };
  const total=beginning.length||1;
  return Object.entries(counts).map(([k,v])=>`
    <div class="progress-row"><div class="progress-label">${k}</div>
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.round(v/total*100)}%;background:${colors[k]}"></div></div>
    <div class="progress-count">${v} (${Math.round(v/total*100)}%)</div></div>`).join('');
}

function tplAllStudents(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">All Students — Grade 1 to 6</span></div>
  <div class="section-card-body">
    <div class="filter-row" style="margin-bottom:14px">
      <input class="search-input" id="as-search" placeholder="Search by name or Student ID…" oninput="renderAllStudents()">
      <select class="filter-select" id="as-grade" onchange="renderAllStudents()"><option value="">All Grades</option><option>Grade 1</option><option>Grade 2</option><option>Grade 3</option><option>Grade 4</option><option>Grade 5</option><option>Grade 6</option></select>
    </div>
    <div id="allstudents-wrap"></div>
  </div></div>`;
}
function renderAllStudents(){
  const q=(document.getElementById('as-search')?.value||'').toLowerCase();
  const gr=document.getElementById('as-grade')?.value||'';
  const uMap=userMap();
  const students=DB.get(KEY.students).filter(s=>(!q||s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))&&(!gr||s.grade===gr));
  const wrap=document.getElementById('allstudents-wrap');
  if(!students.length){ wrap.innerHTML=emptyState('No students found.'); return; }
  wrap.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Student ID</th><th>Name</th><th>Grade / Section</th><th>Adviser</th><th>Actions</th></tr></thead>
    <tbody>${students.map(s=>`<tr>
      <td style="font-size:11px;color:var(--gray-500)">${s.id}</td><td><strong>${s.name}</strong></td>
      <td>${s.grade} · ${s.section}</td><td>${uMap[s.adviserId]?uMap[s.adviserId].name:'—'}</td>
      <td><button class="btn-icon" onclick="viewStudentProfile('${s.id}')">${ICON_EYE}</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function tplTeacherRecords(){
  const teachers=DB.get(KEY.users).filter(u=>u.role==='teacher');
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">View Teacher Records</span></div>
  <div class="section-card-body">
    <select class="search-input" id="tr-teacher" style="max-width:320px" onchange="renderTeacherRecords()">
      <option value="">— Select an adviser —</option>${teachers.map(t=>`<option value="${t.id}">${t.name} — ${t.grade} ${t.section}</option>`).join('')}
    </select>
    <div id="tr-wrap" style="margin-top:16px"></div>
  </div></div>`;
}
function renderTeacherRecords(){
  const tid=document.getElementById('tr-teacher')?.value; const wrap=document.getElementById('tr-wrap');
  if(!tid){ wrap.innerHTML=''; return; }
  const daily=DB.get(KEY.daily).filter(d=>d.teacherId===tid).slice().reverse();
  const bmi=DB.get(KEY.bmi).filter(b=>b.teacherId===tid).slice().reverse();
  wrap.innerHTML=`<h4 style="margin-bottom:8px">Health Monitoring Records</h4>${renderDailyTable(daily,{showGradeSection:true})}
    <h4 style="margin:18px 0 8px">BMI Records</h4>${renderBmiTable(bmi,{showGradeSection:true})}`;
}

function tplClinicRecords(){
  const nurses=DB.get(KEY.users).filter(u=>u.role==='clinic');
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">View Clinic Records</span></div>
  <div class="section-card-body">
    <select class="search-input" id="cr-nurse" style="max-width:320px" onchange="renderClinicRecords()">
      <option value="">— Select clinic personnel —</option>${nurses.map(n=>`<option value="${n.id}">${n.name}</option>`).join('')}
    </select>
    <div id="cr-wrap" style="margin-top:16px"></div>
  </div></div>`;
}
function renderClinicRecords(){
  const nid=document.getElementById('cr-nurse')?.value; const wrap=document.getElementById('cr-wrap');
  if(!nid){ wrap.innerHTML=''; return; }
  const sMap=studentMap(); const referrals=DB.get(KEY.referrals);
  const assess=DB.get(KEY.assessments).filter(a=>a.nurseId===nid).slice().reverse();
  wrap.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Student</th><th>Findings</th><th>Treatment</th><th>Disposition</th></tr></thead>
    <tbody>${assess.map(a=>{ const ref=referrals.find(r=>r.id===a.referralId); const s=ref?sMap[ref.studentId]:null;
      return `<tr><td>${fmtDate(a.date)}</td><td><strong>${s?s.name:'?'}</strong></td><td>${a.findings}</td><td>${a.treatment}</td><td>${dispositionBadge(a.disposition)}</td></tr>`;
    }).join('')}</tbody></table></div>${!assess.length?emptyState('No records for this clinic personnel yet.'):''}`;
}

function tplHealthReportsA(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Health Monitoring Reports — All Records</span>
  <button class="btn btn-secondary btn-sm" onclick="exportAdminHealthCSV()">${ICON_DOWNLOAD} Export CSV</button></div>
  <div class="section-card-body"><div id="hra-wrap"></div></div></div>`;
}
function renderHealthReportsA(){ document.getElementById('hra-wrap').innerHTML=renderDailyTable(DB.get(KEY.daily).slice().reverse(),{showGradeSection:true,showTeacher:true}); }
function exportAdminHealthCSV(){
  const sMap=studentMap(), uMap=userMap();
  const rows=[['Date','Time','Student','Grade','Temp','Symptoms','Remarks','Status','Adviser']];
  DB.get(KEY.daily).forEach(r=>rows.push([r.date,r.time,sMap[r.studentId]?.name,sMap[r.studentId]?.grade,r.temperature,r.symptoms,r.remarks,r.status,uMap[r.teacherId]?.name]));
  downloadCSV(rows,'health_monitoring_report.csv');
}

function tplBmiReportsA(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">BMI Reports — All Records</span>
  <button class="btn btn-secondary btn-sm" onclick="exportAdminBmiCSV()">${ICON_DOWNLOAD} Export CSV</button></div>
  <div class="section-card-body"><div id="bmia-wrap"></div></div></div>`;
}
function renderBmiReportsA(){ document.getElementById('bmia-wrap').innerHTML=renderBmiTable(DB.get(KEY.bmi).slice().reverse(),{showGradeSection:true,showTeacher:true}); }
function exportAdminBmiCSV(){
  const sMap=studentMap(), uMap=userMap();
  const rows=[['Student','Age','Sex','Grade','School Year','Period','Height','Weight','BMI','Status','Adviser']];
  DB.get(KEY.bmi).forEach(b=>{ const s=sMap[b.studentId]; rows.push([s?.name,s?.age,s?.sex,s?.grade,b.schoolYear,b.period,b.height,b.weight,b.bmi,b.status,uMap[b.teacherId]?.name]); });
  downloadCSV(rows,'bmi_report.csv');
}

/* FIX: Feeding Program Report now auto-categorizes EVERY student with a BMI record this
   school year into Malnourished / Overweight / Obese / Normal (not just "Wasted" text
   matching), shown as the same easy-to-read stat cards used on the teacher's BMI page. */
function tplFeedingReports(){
  return `<div id="feeding-wrap"></div>`;
}
function renderFeedingReports(){
  const rows=feedingCandidatesAll();
  const wrap=document.getElementById('feeding-wrap');
  wrap.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button class="btn btn-secondary btn-sm" onclick="exportFeedingCSV()">${ICON_DOWNLOAD} Export CSV</button>
    </div>
    ${renderFeedingCardHTML(rows, { title:'School-Wide Feeding Program Overview', showGradeSection:true, showTeacher:true })}
  `;
}
function exportFeedingCSV(){
  const rows=feedingCandidatesAll();
  const out=[['Student','Grade','Section','BMI','Category','Nutritional Status']];
  rows.forEach(r=>out.push([r.student.name,r.student.grade,r.student.section,r.bmi.bmi,r.category,r.bmi.status]));
  downloadCSV(out,'feeding_program_report.csv');
}

function tplUsers(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Manage Users</span><button class="btn btn-primary btn-sm" onclick="openUserModal()">+ Add User</button></div>
  <div class="section-card-body"><div id="users-wrap"></div></div></div>`;
}
function renderUsers(){
  const users=DB.get(KEY.users).filter(u=>u.role!=='admin');
  const wrap=document.getElementById('users-wrap');
  wrap.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Assignment</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${users.map(u=>`<tr>
      <td><strong>${u.name}</strong></td><td>${u.username}</td><td>${roleLabel(u.role)}</td>
      <td>${u.role==='teacher'?u.grade+' · '+u.section:'—'}</td>
      <td><span class="badge ${u.active!==false?'badge-active':'badge-inactive'}">${u.active!==false?'Active':'Inactive'}</span></td>
      <td><button class="btn-icon" onclick="openUserModal('${u.id}')">${ICON_EDIT}</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleUserActive('${u.id}')">${u.active!==false?'Deactivate':'Activate'}</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}
function toggleUserActive(id){
  const users=DB.get(KEY.users); const idx=users.findIndex(u=>u.id===id);
  if(idx>-1){ users[idx].active = users[idx].active===false ? true : false; DB.set(KEY.users,users); logActivity(`${users[idx].active?'Activated':'Deactivated'} account for ${users[idx].name}`); }
  renderUsers();
}
function openUserModal(id){
  document.getElementById('user-modal-title').textContent = id ? 'Edit User' : 'Add User';
  document.getElementById('u-edit-id').value = id||'';
  if(id){ const u=DB.getOne(KEY.users,id);
    document.getElementById('u-name').value=u.name; document.getElementById('u-username').value=u.username; document.getElementById('u-password').value=u.password;
    document.getElementById('u-role').value=u.role; toggleUserRoleFields();
    if(u.role==='teacher'){ document.getElementById('u-grade').value=u.grade; document.getElementById('u-section').value=u.section; }
  } else {
    ['u-name','u-username','u-password','u-grade','u-section'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('u-role').value=''; toggleUserRoleFields();
  }
  openModal('modal-user');
}
function toggleUserRoleFields(){
  document.getElementById('u-teacher-fields').style.display = document.getElementById('u-role').value==='teacher' ? 'grid' : 'none';
}
function saveUser(){
  const name=document.getElementById('u-name').value.trim(); const username=document.getElementById('u-username').value.trim();
  const password=document.getElementById('u-password').value; const role=document.getElementById('u-role').value;
  if(!name||!username||!password||!role){ showToast('Please fill in all required fields.','error'); return; }
  let grade='', section='';
  if(role==='teacher'){ grade=document.getElementById('u-grade').value; section=document.getElementById('u-section').value.trim(); if(!grade||!section){ showToast('Please assign a grade and section.','error'); return; } }
  const editId=document.getElementById('u-edit-id').value;
  const users=DB.get(KEY.users);
  if(!editId && users.find(u=>u.username===username)){ showToast('Username already taken.','error'); return; }
  if(editId){ const idx=users.findIndex(u=>u.id===editId); if(idx>-1){ users[idx]={...users[idx],name,username,password,role,grade,section}; } }
  else{ users.push({ id:uid(), name, username, password, role, active:true, grade, section }); logActivity(`Created ${roleLabel(role)} account: ${name}`); }
  DB.set(KEY.users,users);
  showToast('User saved.','success');
  closeModal('modal-user');
  if(currentPanel==='a-users') renderUsers();
}

function tplBackup(){
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">Backup &amp; Restore Database</span></div>
  <div class="section-card-body">
    <p style="font-size:12.5px;color:var(--gray-500);margin-bottom:14px">Export a full backup of all student, health, BMI, and clinic records, or restore from a previously exported file.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-primary btn-sm" onclick="backupDatabase()">${ICON_DOWNLOAD} Export Backup (JSON)</button>
      <label class="btn btn-secondary btn-sm" style="cursor:pointer">${ICON_UPLOAD} Restore from File<input type="file" accept=".json" style="display:none" onchange="restoreDatabase(event)"></label>
    </div>
  </div></div>
  <div class="section-card"><div class="section-card-header"><span class="section-card-title">System Activity Log</span></div>
  <div class="section-card-body"><div id="logs-wrap"></div></div></div>`;
}
function backupDatabase(){
  const dump={}; Object.values(KEY).forEach(k=>dump[k]=DB.get(k));
  const blob=new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`scm_backup_${todayISO()}.json`; a.click();
  logActivity('Exported database backup');
  showToast('Backup downloaded.','success');
}
function restoreDatabase(evt){
  const file=evt.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      Object.entries(KEY).forEach(([name,k])=>{ if(data[k]!==undefined) DB.set(k,data[k]); });
      showToast('Database restored. Reloading…','success');
      logActivity('Restored database from backup');
      setTimeout(()=>location.reload(), 1200);
    }catch(err){ showToast('Invalid backup file.','error'); }
  };
  reader.readAsText(file);
}
function renderLogs(){
  const logs=DB.get(KEY.logs).slice().reverse();
  const wrap=document.getElementById('logs-wrap');
  if(!logs.length){ wrap.innerHTML=emptyState('No activity logged yet.'); return; }
  wrap.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Time</th><th>User</th><th>Action</th></tr></thead>
    <tbody>${logs.slice(0,60).map(l=>`<tr><td>${fmtDate(l.date)}</td><td>${l.time}</td><td>${l.user}</td><td>${l.action}</td></tr>`).join('')}</tbody></table></div>`;
}

function tplSettings(){
  const s=getSettings();
  return `<div class="section-card"><div class="section-card-header"><span class="section-card-title">School Year Settings</span></div>
  <div class="section-card-body">
    <div class="form-field"><label>Current School Year</label>
      <select id="set-sy" onchange="setCurrentSY()">${s.schoolYears.map(y=>`<option ${y===s.schoolYear?'selected':''}>${y}</option>`).join('')}</select>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Add New School Year</label><input type="text" id="set-newsy" placeholder="e.g. 2026-2027"></div>
      <div class="form-field" style="display:flex;align-items:flex-end"><button class="btn btn-primary" onclick="addSchoolYear()">Add School Year</button></div>
    </div>
    <p style="font-size:11.5px;color:var(--gray-500)">Starting a new school year does not delete previous BMI or health monitoring records — all history remains permanent.</p>
  </div></div>`;
}
function setCurrentSY(){
  const val=document.getElementById('set-sy').value;
  const s=getSettings(); s.schoolYear=val; DB.set(KEY.settings,s);
  showToast(`Active school year set to ${val}.`,'success');
}
function addSchoolYear(){
  const val=document.getElementById('set-newsy').value.trim();
  if(!val){ showToast('Please enter a school year.','error'); return; }
  const s=getSettings();
  if(!s.schoolYears.includes(val)) s.schoolYears.push(val);
  s.schoolYear=val; DB.set(KEY.settings,s);
  logActivity(`Started new school year: ${val}`);
  showToast(`School year ${val} added and set as current.`,'success');
  if(currentPanel==='a-settings') loadPanel('a-settings');
}

/* ================================================================
   PRINT REPORT HELPER
   ================================================================ */
function openPrintReport(title, bodyHTML){
  document.getElementById('print-report-body').innerHTML = `<div class="slip-header"><h2>${title}</h2><p>Generated ${fmtDate(todayISO())}</p></div>${bodyHTML}`;
  document.getElementById('print-report').classList.add('open');
}
function closePrintReport(){ document.getElementById('print-report').classList.remove('open'); }

/* ================================================================
   PANEL DISPATCH TABLES
   ================================================================ */
const PANEL_BUILDERS = {
  't-dash':tplTeacherDash, 't-mystudents':tplMyStudents, 't-daily':tplDaily, 't-bmi':tplBmi,
  't-healthrecords':tplHealthRecordsT, 't-bmirecords':tplBmiRecordsT, 't-reports':tplPrintT, 't-feedback':tplFeedback, 't-profile':tplProfile,
  'c-dash':tplClinicDash, 'c-pending':tplPending, 'c-observation':tplObservation, 'c-healthreports':tplHealthReportsC,
  'c-bmireports':tplBmiReportsC, 'c-recforms':tplRecForms, 'c-medicine':tplMedicine, 'c-print':tplPrintC, 'c-profile':tplProfile,
  'a-dash':tplAdminDash, 'a-allstudents':tplAllStudents, 'a-teacherrecords':tplTeacherRecords, 'a-clinicrecords':tplClinicRecords,
  'a-healthreports':tplHealthReportsA, 'a-bmireports':tplBmiReportsA, 'a-feedingreports':tplFeedingReports,
  'a-users':tplUsers, 'a-backup':tplBackup, 'a-settings':tplSettings,
};
const PANEL_INITS = {
  't-mystudents':renderMyStudents, 't-daily':renderDailyList, 't-bmi':renderBmiTable_Panel, 't-healthrecords':renderHealthRecordsT,
  't-bmirecords':renderBmiRecordsT, 't-feedback':renderFeedback,
  'c-pending':renderPending, 'c-observation':renderObservation, 'c-healthreports':renderHealthReportsC, 'c-bmireports':renderBmiReportsC,
  'c-recforms':renderRecForms, 'c-medicine':renderMedicine,
  'a-allstudents':renderAllStudents, 'a-healthreports':renderHealthReportsA,
  'a-bmireports':renderBmiReportsA, 'a-feedingreports':renderFeedingReports, 'a-users':renderUsers, 'a-backup':renderLogs,
};


/* ================================================================
   INIT
   ================================================================ */
document.getElementById('inp-password').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
document.getElementById('inp-username').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('inp-password').focus(); });
document.querySelectorAll('.modal-overlay').forEach(el=>el.addEventListener('click', e=>{ if(e.target===el) el.classList.remove('open'); }));

async function bootstrapApp(){
  const overlay=document.getElementById('db-loading');
  try{
    await loadDatabase();
    seedData(); // only actually seeds if the MySQL tables are still empty
    refreshBmiStatuses();
    const saved=sessionStorage.getItem('scm_session');
    if(saved){ try{ currentUser=JSON.parse(saved); showApp(); }catch{ currentUser=null; } }
    overlay.style.display='none';
  }catch(err){
    console.error(err);
    overlay.innerHTML = `<div class="db-loading-box">
      <h2 style="display:flex;align-items:center;justify-content:center;gap:8px">${ICON_WARNING} Can't connect to the database</h2>
      <p>Make sure XAMPP's <strong>Apache</strong> and <strong>MySQL</strong> are running, and that you imported
      <code>database/schema.sql</code> into a database named <code>school_clinic</code>.</p>
      <p style="color:#c62828;font-family:monospace;font-size:12px;margin-top:10px">${(err && err.message) || err}</p>
      <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="location.reload()">Retry</button>
    </div>`;
  }
}
bootstrapApp();
