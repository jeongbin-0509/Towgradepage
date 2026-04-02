document.addEventListener('DOMContentLoaded', function() {

// ════ STATE ════════════════════════════════
const COLORS = ['#4f8ef7','#7c3aed','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'];
const TEACHER_CODE = 'TEACHER2024'; // 선생님 인증 코드
let selColor = COLORS[0];
let SB_URL = '', SB_KEY = '', ACCESS_TOKEN = '', REFRESH_TOKEN = '';
let userId = '', userRole = 'student', classCode = '', userName = '';
let schoolCode = '', atptCode = '', schoolName = ''; // NEIS 학교 정보
let demoMode = false;
let perfs = [], exams = [], ttRows = [];

const DEFAULT_TT = [
  {period:1,mon:'국어',tue:'영어',wed:'수학',thu:'사회',fri:'과학'},
  {period:2,mon:'수학',tue:'국어',wed:'영어',thu:'체육',fri:'음악'},
  {period:3,mon:'영어',tue:'수학',wed:'한국사',thu:'과학',fri:'기술가정'},
  {period:4,mon:'사회',tue:'과학',wed:'국어',thu:'수학',fri:'영어'},
  {period:5,mon:'한국사',tue:'체육',wed:'사회',thu:'국어',fri:'미술'},
  {period:6,mon:'과학',tue:'국어',wed:'수학',thu:'영어',fri:'사회'},
  {period:7,mon:'체육',tue:'기술가정',wed:'영어',thu:'수학',fri:'국어'},
];

const isTeacher = () => userRole === 'teacher';

// ════ SUPABASE HELPERS ════════════════════
async function sbAuth(path, body) {
  let r;
  try {
    r = await fetch(`${SB_URL}/auth/v1/${path}`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SB_KEY},
      body:JSON.stringify(body)
    });
  } catch(e) { throw new Error('서버 연결 실패. URL을 확인해주세요. ('+e.message+')'); }
  const d = await r.json();
  if(!r.ok) throw new Error(d.error_description||d.msg||d.message||JSON.stringify(d));
  return d;
}

async function sbGet(table, query='') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers:{'apikey':SB_KEY,'Authorization':`Bearer ${ACCESS_TOKEN}`,'Accept':'application/json'}
  });
  if(!r.ok){ const d=await r.json(); throw new Error(d.message||'조회 오류'); }
  return r.json();
}

async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method:'POST',
    headers:{'apikey':SB_KEY,'Authorization':`Bearer ${ACCESS_TOKEN}`,'Content-Type':'application/json','Prefer':'return=representation'},
    body:JSON.stringify(body)
  });
  if(!r.ok){ const d=await r.json(); throw new Error(d.message||'저장 오류'); }
  return r.json();
}

async function sbDelete(table, query) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method:'DELETE',
    headers:{'apikey':SB_KEY,'Authorization':`Bearer ${ACCESS_TOKEN}`}
  });
  if(!r.ok){ const d=await r.json(); throw new Error(d.message||'삭제 오류'); }
}

async function sbUpsert(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method:'POST',
    headers:{'apikey':SB_KEY,'Authorization':`Bearer ${ACCESS_TOKEN}`,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify(body)
  });
  if(!r.ok){ const d=await r.json(); throw new Error(d.message||'저장 오류'); }
  return r.json();
}

// ════ UTILS ═══════════════════════════════
function dday(ds) {
  const t=new Date();t.setHours(0,0,0,0);
  const d=new Date(ds);d.setHours(0,0,0,0);
  const diff=Math.ceil((d-t)/86400000);
  return diff===0?'D-DAY':diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;
}
function sc(s) {
  return {'국어':'#4f8ef7','수학':'#7c3aed','영어':'#10b981','과학':'#f59e0b','사회':'#ec4899','한국사':'#ef4444','체육':'#06b6d4','음악':'#84cc16','미술':'#f97316','기술가정':'#a78bfa','정보':'#22d3ee'}[s]||'#4f8ef7';
}
function toast(msg, type='') {
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast on'+(type?' '+type:'');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2600);
}
function loading(v,txt='불러오는 중...') {
  document.getElementById('loadOv').classList.toggle('on',v);
  document.getElementById('loadTxt').textContent=txt;
}
function showErr(id,msg) {
  const el=document.getElementById(id);
  el.textContent=msg; el.style.display=msg?'block':'none';
}
function openMo(id){document.getElementById(id).classList.add('on');}
function closeMo(id){document.getElementById(id).classList.remove('on');showErr('loginErr','');showErr('regErr','');}

// ════ SETUP ════════════════════════════════
document.getElementById('btnCopySql').addEventListener('click',()=>{
  navigator.clipboard.writeText(document.getElementById('sqlBox').textContent).then(()=>toast('SQL 복사됨!'));
});

document.getElementById('btnConnect').addEventListener('click', async ()=>{
  const url=document.getElementById('sbUrl').value.trim();
  const key=document.getElementById('sbKey').value.trim();
  if(!url||!key){toast('URL과 Key를 모두 입력해주세요','err');return;}
  if(!url.startsWith('https://')){toast('올바른 URL 형식이 아닙니다','err');return;}
  const btn=document.getElementById('btnConnect');
  btn.disabled=true; btn.textContent='연결 확인 중...';
  const testUrl=url.replace(/\/$/,'');
  try {
    const r=await fetch(`${testUrl}/rest/v1/`,{headers:{'apikey':key}});
    if(r.status>=500) throw new Error('서버 오류 '+r.status);
  } catch(e) {
    btn.disabled=false; btn.textContent='🚀 연결하기';
    toast('❌ 연결 실패 — Project URL을 확인해주세요','err'); return;
  }
  SB_URL=testUrl; SB_KEY=key;
  localStorage.setItem('sb_url',SB_URL); localStorage.setItem('sb_key',SB_KEY);
  btn.disabled=false; btn.textContent='🚀 연결하기';
  const saved=localStorage.getItem('sb_session');
  if(saved){
    try {
      const s=JSON.parse(saved);
      ACCESS_TOKEN=s.access_token; REFRESH_TOKEN=s.refresh_token; userId=s.user_id;
      showLanding(); loadProfileAndLaunch(); return;
    } catch(e){localStorage.removeItem('sb_session');}
  }
  toast('✅ 연결 성공!','ok'); showLanding();
});

document.getElementById('btnDemo').addEventListener('click',e=>{e.preventDefault();startDemo();});

function startDemo() {
  demoMode=true;
  const fmt=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];};
  perfs=[
    {id:'d1',subject:'국어',type:'발표',title:'시 창작 및 낭독',description:'자유 주제 시 창작 후 낭독',date:fmt(5),period:'2교시',color:'#4f8ef7'},
    {id:'d2',subject:'수학',type:'쓰기',title:'수학 단원 서술형 평가',description:'2단원~4단원. 풀이 과정 기술',date:fmt(9),period:'3교시',color:'#7c3aed'},
    {id:'d3',subject:'영어',type:'발표',title:'영어 말하기 발표',description:'주제: My Future Dream',date:fmt(14),period:'1교시',color:'#10b981'},
  ];
  exams=[
    {id:'e1',subject:'국어',exam_date:fmt(20),start_time:'09:00',range_text:'1단원~3단원\n· 문학의 이해',written_ratio:40,performance_ratio:50,attendance_ratio:10},
    {id:'e2',subject:'수학',exam_date:fmt(21),start_time:'09:00',range_text:'I. 수와 연산\n· 이차방정식',written_ratio:40,performance_ratio:50,attendance_ratio:10},
  ];
  ttRows=DEFAULT_TT.map(r=>({...r}));
  userId='demo'; userRole='teacher'; classCode='2-3'; userName='데모 선생님';
  showLanding();
  launchApp();
}

function showLanding() {
  document.getElementById('setupScreen').style.display='none';
  document.getElementById('landing').style.display='flex';
}

async function loadProfileAndLaunch() {
  loading(true);
  try {
    const data=await sbGet('profiles',`id=eq.${userId}&select=*`);
    if(data[0]){
      userRole=data[0].role; classCode=data[0].class_code; userName=data[0].name;
      schoolCode=data[0].school_code||''; atptCode=data[0].atpt_code||''; schoolName=data[0].school_name||'';
      showLanding(); launchApp();
    } else { loading(false); showLanding(); }
  } catch(e){loading(false);showLanding();}
}

// ════ AUTH ═════════════════════════════════
document.getElementById('btnOpenLogin').addEventListener('click',()=>openMo('loginMo'));
document.getElementById('btnOpenRegister').addEventListener('click',()=>openMo('registerMo'));
document.getElementById('btnHeroLogin').addEventListener('click',()=>openMo('loginMo'));
document.getElementById('btnHeroRegister').addEventListener('click',()=>openMo('registerMo'));
document.getElementById('btnClsLogin').addEventListener('click',()=>closeMo('loginMo'));
document.getElementById('btnClsReg').addEventListener('click',()=>closeMo('registerMo'));
document.getElementById('btnToReg').addEventListener('click',()=>{closeMo('loginMo');setTimeout(()=>openMo('registerMo'),200);});
document.getElementById('btnToLogin').addEventListener('click',()=>{closeMo('registerMo');setTimeout(()=>openMo('loginMo'),200);});
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('on');}));

// 역할 탭 토글
document.querySelectorAll('.role-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.role-tab').forEach(t=>t.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById('teacherCodeWrap').style.display=btn.dataset.role==='teacher'?'block':'none';
  });
});

document.getElementById('btnLogin').addEventListener('click',doLogin);
document.getElementById('loginPw').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('btnReg').addEventListener('click',doRegister);
document.getElementById('regPw').addEventListener('keydown',e=>{if(e.key==='Enter')doRegister();});

async function doLogin() {
  const email=document.getElementById('loginEmail').value.trim();
  const pw=document.getElementById('loginPw').value;
  showErr('loginErr','');
  if(!email||!pw){showErr('loginErr','이메일과 비밀번호를 입력해주세요');return;}
  const btn=document.getElementById('btnLogin');
  btn.disabled=true; btn.textContent='로그인 중...';
  try {
    const d=await sbAuth('token?grant_type=password',{email,password:pw});
    ACCESS_TOKEN=d.access_token; REFRESH_TOKEN=d.refresh_token; userId=d.user.id;
    localStorage.setItem('sb_session',JSON.stringify({access_token:ACCESS_TOKEN,refresh_token:REFRESH_TOKEN,user_id:userId}));
    const profs=await sbGet('profiles',`id=eq.${userId}&select=*`);
    if(!profs[0]){showErr('loginErr','프로필을 찾을 수 없습니다. 다시 가입해주세요.');return;}
    userRole=profs[0].role; classCode=profs[0].class_code; userName=profs[0].name;
    closeMo('loginMo'); launchApp();
  } catch(e) {
    showErr('loginErr',e.message.includes('Invalid')||e.message.includes('credentials')?'이메일 또는 비밀번호가 올바르지 않습니다':e.message);
  } finally{btn.disabled=false;btn.textContent='로그인';}
}

async function doRegister() {
  const name=document.getElementById('regName').value.trim();
  const cls=document.getElementById('regClass').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const pw=document.getElementById('regPw').value;
  const roleBtn=document.querySelector('.role-tab.on');
  const role=roleBtn?roleBtn.dataset.role:'student';
  showErr('regErr','');

  const regSchCode = document.getElementById('regSchoolCode').value.trim();
  const regAtptCode = document.getElementById('regAtptCode').value.trim();
  const regSchName = document.getElementById('regSchoolName').value.trim();
  if(!name||!cls||!email||!pw){showErr('regErr','모든 항목을 입력해주세요');return;}
  if(!regSchCode){showErr('regErr','학교를 검색해서 선택해주세요');return;}
  if(pw.length<6){showErr('regErr','비밀번호는 6자 이상이어야 합니다');return;}

  // 선생님 코드 검증
  if(role==='teacher'){
    const code=document.getElementById('teacherCode').value.trim();
    if(code!==TEACHER_CODE){showErr('regErr','선생님 인증 코드가 올바르지 않습니다');return;}
  }

  const btn=document.getElementById('btnReg');
  btn.disabled=true; btn.textContent='가입 중...';
  try {
    // 1. 회원가입
    const signupRes=await sbAuth('signup',{email,password:pw});
    let token=signupRes.access_token;
    let uid=signupRes.user?.id;

    // 2. 토큰 없으면 바로 로그인
    if(!token){
      btn.textContent='로그인 중...';
      const loginRes=await sbAuth('token?grant_type=password',{email,password:pw});
      token=loginRes.access_token; uid=loginRes.user?.id;
    }

    if(!token||!uid){
      closeMo('registerMo');
      toast('📧 인증 메일을 확인 후 로그인해주세요!');
      setTimeout(()=>{openMo('loginMo');document.getElementById('loginEmail').value=email;},400);
      return;
    }

    ACCESS_TOKEN=token; REFRESH_TOKEN=signupRes.refresh_token||''; userId=uid;
    localStorage.setItem('sb_session',JSON.stringify({access_token:ACCESS_TOKEN,refresh_token:REFRESH_TOKEN,user_id:userId}));

    // 3. 프로필 저장 (class_code = "2-3" 형식)
    btn.textContent='정보 저장 중...';
    await sbUpsert('profiles',{id:userId,name,class_code:cls,role,school_code:regSchCode,atpt_code:regAtptCode,school_name:regSchName});

    userRole=role; classCode=cls; userName=name;
    schoolCode=regSchCode; atptCode=regAtptCode; schoolName=regSchName;
    closeMo('registerMo'); launchApp();
  } catch(e) {
    showErr('regErr',e.message.includes('already')?'이미 사용 중인 이메일입니다':e.message);
  } finally{btn.disabled=false;btn.textContent='가입하기';}
}

document.getElementById('btnLogout').addEventListener('click',()=>{
  ACCESS_TOKEN=''; REFRESH_TOKEN=''; userId=''; userRole='student'; classCode=''; demoMode=false;
  perfs=[]; exams=[]; ttRows=[];
  localStorage.removeItem('sb_session');
  document.getElementById('app').style.display='none';
  document.getElementById('landing').style.display='flex';
  toast('로그아웃 되었습니다');
});

// ════ APP LAUNCH ═══════════════════════════
async function launchApp() {
  document.getElementById('landing').style.display='none';
  document.getElementById('app').style.display='flex';

  // 헤더 정보
  document.getElementById('hdCls').textContent=classCode+'반';
  const roleEl=document.getElementById('hdRole');
  if(isTeacher()){roleEl.textContent='👩‍🏫 선생님';roleEl.className='hrole teacher';}
  else{roleEl.textContent='🎒 학생';roleEl.className='hrole student';}

  // 선생님 전용 UI 표시
  document.getElementById('btnTtEdit').style.display=isTeacher()?'block':'none';
  document.getElementById('btnAddExam').style.display=isTeacher()?'block':'none';
  document.getElementById('perfNotice').style.display=isTeacher()?'none':'flex';
  document.getElementById('examNotice').style.display=isTeacher()?'none':'flex';

  initColorPicker();

  if(!demoMode){
    loading(true,'반 데이터 불러오는 중...');
    try{await Promise.all([loadPerfs(),loadExams(),loadTT()]);}
    finally{loading(false);}
  }
  renderAll();
}

function renderAll(){updateDday();renderUpcoming();renderTT();renderPerfs();renderExamSc();renderExamRg();updateDot();}

// ════ LOAD (class_code 기준) ═══════════════
async function loadPerfs(){
  perfs=await sbGet('performances',`class_code=eq.${classCode}&order=date`);
}
async function loadExams(){
  exams=await sbGet('exams',`class_code=eq.${classCode}&order=exam_date`);
}
async function loadTT(){
  // 먼저 DB에 저장된 시간표 확인
  const data=await sbGet('timetables',`class_code=eq.${classCode}&order=period`);
  if(data&&data.length){
    ttRows=data; return;
  }
  // DB에 없으면 NEIS에서 자동 불러오기
  if(schoolCode && atptCode && classCode){
    const [grade, cls] = classCode.split('-');
    try {
      const rows = await fetchNeisTime({SD_SCHUL_CODE:schoolCode, ATPT_OFCDC_SC_CODE:atptCode}, grade, cls);
      if(rows.length){
        ttRows = neisToRows(rows);
        // 선생님이면 DB에도 저장
        if(isTeacher()){
          await sbDelete('timetables',`class_code=eq.${classCode}`).catch(()=>{});
          await sbPost('timetables', ttRows.map(r=>({...r,class_code:classCode,created_by:userId}))).catch(()=>{});
        }
        return;
      }
    } catch(e){ console.warn('NEIS 시간표 로드 실패:', e.message); }
  }
  ttRows=DEFAULT_TT.map(r=>({...r}));
}

// ════ PAGES ════════════════════════════════
const pgIds=['pgHome','pgPerf','pgExam'];
const pgTitles=['홈','수행평가','시험'];
document.querySelectorAll('.ni').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const idx=parseInt(btn.dataset.p);
    pgIds.forEach((id,i)=>document.getElementById(id).classList.toggle('on',i===idx));
    document.querySelectorAll('.ni').forEach((n,i)=>n.classList.toggle('on',i===idx));
    document.getElementById('appTitle').textContent=pgTitles[idx];
    // FAB는 선생님만 수행평가 탭에서 표시
    document.getElementById('fabBtn').classList.toggle('on',idx===1&&isTeacher());
  });
});

document.querySelectorAll('.etab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.etab').forEach(t=>t.classList.remove('on'));
    btn.classList.add('on');
    const tab=btn.dataset.tab;
    document.getElementById('examScWrap').style.display=tab==='sc'?'block':'none';
    document.getElementById('examRgWrap').style.display=tab==='rg'?'block':'none';
  });
});

// ════ HOME ═════════════════════════════════
function updateDday(){
  const now=new Date();now.setHours(0,0,0,0);
  const fut=[...exams].filter(e=>{const d=new Date(e.exam_date);d.setHours(0,0,0,0);return d>=now;}).sort((a,b)=>new Date(a.exam_date)-new Date(b.exam_date));
  if(fut.length){
    document.getElementById('ddayEv').textContent=fut[0].subject+' 시험';
    const dd=dday(fut[0].exam_date);
    document.getElementById('ddayN').innerHTML=dd==='D-DAY'?'<span>D-DAY</span>':dd.replace('-','<span>-</span>').replace('+','<span>+</span>');
  }else{document.getElementById('ddayEv').textContent='등록된 시험 없음';document.getElementById('ddayN').textContent='—';}
}

function renderUpcoming(){
  const now=new Date();now.setHours(0,0,0,0);
  const up=[...perfs].filter(p=>{const d=new Date(p.date);d.setHours(0,0,0,0);return d>=now;}).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);
  const el=document.getElementById('upList');
  el.innerHTML=up.map(p=>`<div class="upi"><div class="updot" style="background:${p.color}"></div><div class="upinfo"><div class="upsubj">${p.subject} — ${p.type}</div><div class="upmeta">${p.period} · ${p.date.replace(/-/g,'.')}</div></div><div class="updd">${dday(p.date)}</div></div>`).join('');
  if(!up.length)el.innerHTML='<div style="text-align:center;padding:16px;color:var(--text3);font-size:12px;">임박한 수행평가 없음 🎉</div>';
}

function updateDot(){
  const now=new Date();now.setHours(0,0,0,0);
  const has=perfs.some(p=>{const d=new Date(p.date);d.setHours(0,0,0,0);return Math.ceil((d-now)/86400000)>=0&&Math.ceil((d-now)/86400000)<=7;});
  document.getElementById('perfDot').style.display=has?'block':'none';
}


// ════ NEIS API ══════════════════════════════
const NEIS_KEY = '71d5071e229946568ef963244c1c23f7';
let selectedSchool = null;

// 학교 검색
async function searchSchool(name) {
  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${NEIS_KEY}&Type=json&pSize=10&SCHUL_KND_SC_NM=고등학교&SCHUL_NM=${encodeURIComponent(name)}`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    if(d.schoolInfo) return d.schoolInfo[1].row;
    return [];
  } catch(e) { return []; }
}

// 시간표 불러오기
async function fetchNeisTime(school, grade, cls) {
  const today = new Date();
  const mon = String(today.getMonth()+1).padStart(2,'0');
  const week = getWeekDates(today);
  const from = week[0].replace(/-/g,'');
  const to   = week[4].replace(/-/g,'');

  const url = `https://open.neis.go.kr/hub/hisTimetable?KEY=${NEIS_KEY}&Type=json&pSize=100`
    + `&ATPT_OFCDC_SC_CODE=${school.ATPT_OFCDC_SC_CODE}`
    + `&SD_SCHUL_CODE=${school.SD_SCHUL_CODE}`
    + `&AY=${today.getFullYear()}`
    + `&SEM=${today.getMonth()<7?1:2}`
    + `&GRADE=${grade}&CLASS_NM=${cls}`
    + `&TI_FROM_YMD=${from}&TI_TO_YMD=${to}`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    if(d.hisTimetable) return d.hisTimetable[1].row;
    return [];
  } catch(e) { return []; }
}

// 이번 주 월~금 날짜 구하기
function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return Array.from({length:5}, (_,i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd.toISOString().split('T')[0];
  });
}

// NEIS 결과 → ttRows 형식으로 변환
function neisToRows(rows) {
  const week = getWeekDates(new Date());
  const dayKeys = ['mon','tue','wed','thu','fri'];
  const map = {};
  for(let p=1;p<=7;p++) map[p] = {period:p,mon:'',tue:'',wed:'',thu:'',fri:''};

  rows.forEach(r => {
    const date = `${r.ALL_TI_YMD.slice(0,4)}-${r.ALL_TI_YMD.slice(4,6)}-${r.ALL_TI_YMD.slice(6,8)}`;
    const di = week.indexOf(date);
    if(di < 0) return;
    const period = parseInt(r.PERIO);
    if(period < 1 || period > 7) return;
    if(!map[period]) map[period] = {period};
    map[period][dayKeys[di]] = r.ITRT_CNTNT || '';
  });
  return Object.values(map).sort((a,b)=>a.period-b.period);
}

// ── 학교 검색 이벤트 ──
document.getElementById('btnSearchSchool').addEventListener('click', async () => {
  const q = document.getElementById('neisSchoolInput').value.trim();
  if(!q){ toast('학교명을 입력해주세요','err'); return; }
  const btn = document.getElementById('btnSearchSchool');
  btn.disabled=true; btn.textContent='검색 중...';
  const results = await searchSchool(q);
  btn.disabled=false; btn.textContent='검색';
  const el = document.getElementById('schoolResults');
  if(!results.length){
    el.style.display='block';
    el.innerHTML='<div style="text-align:center;padding:12px;color:var(--text3);font-size:12px;">검색 결과가 없습니다</div>';
    return;
  }
  el.style.display='block';
  el.innerHTML = results.map(s=>`
    <div data-code="${s.SD_SCHUL_CODE}" data-atpt="${s.ATPT_OFCDC_SC_CODE}" data-name="${s.SCHUL_NM}" data-addr="${s.ORG_RDNMA||''}"
      style="padding:9px 11px;cursor:pointer;border-radius:8px;margin-bottom:3px;background:var(--bg);border:1px solid var(--border);transition:border-color 0.2s;"
      onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:13px;font-weight:600;">${s.SCHUL_NM}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:1px;">${s.ORG_RDNMA||''}</div>
    </div>`).join('');

  // 학교 선택
  el.querySelectorAll('[data-code]').forEach(el2 => {
    el2.addEventListener('click', () => {
      selectedSchool = {
        SD_SCHUL_CODE: el2.dataset.code,
        ATPT_OFCDC_SC_CODE: el2.dataset.atpt,
        SCHUL_NM: el2.dataset.name
      };
      document.getElementById('selectedSchoolName').textContent = el2.dataset.name;
      document.getElementById('selectedSchoolAddr').textContent = el2.dataset.addr;
      document.getElementById('schoolResults').style.display='none';
      document.getElementById('neisSchoolSelected').style.display='block';
      document.getElementById('neisSchoolInput').value = el2.dataset.name;
    });
  });
});

document.getElementById('neisSchoolInput').addEventListener('keydown', e => {
  if(e.key==='Enter') document.getElementById('btnSearchSchool').click();
});

document.getElementById('btnClearSchool').addEventListener('click', () => {
  selectedSchool = null;
  document.getElementById('neisSchoolSelected').style.display='none';
  document.getElementById('neisSchoolInput').value='';
  document.getElementById('neisFetchMsg').style.display='none';
});

// 시간표 불러오기
document.getElementById('btnFetchTT').addEventListener('click', async () => {
  if(!selectedSchool){ toast('학교를 먼저 선택해주세요','err'); return; }
  const grade = document.getElementById('neisGrade').value;
  const cls   = document.getElementById('neisClass').value;
  const msg   = document.getElementById('neisFetchMsg');
  const btn   = document.getElementById('btnFetchTT');
  btn.disabled=true; btn.textContent='불러오는 중...';
  msg.style.display='block'; msg.textContent='NEIS에서 시간표를 가져오는 중...';
  msg.style.color='var(--text2)';

  const rows = await fetchNeisTime(selectedSchool, grade, cls);
  btn.disabled=false; btn.textContent='불러오기';

  if(!rows.length){
    msg.textContent='⚠️ 시간표 데이터가 없습니다. 학년·반을 확인하거나 직접 입력해주세요.';
    msg.style.color='var(--accent4)';
    return;
  }

  // ttEditGrid에 반영
  const converted = neisToRows(rows);
  const days=['mon','tue','wed','thu','fri'];
  document.getElementById('ttEditGrid').querySelectorAll('input').forEach(inp => {
    const p = parseInt(inp.dataset.period);
    const d = inp.dataset.day;
    const row = converted.find(r=>r.period===p);
    if(row) inp.value = row[d] || '';
  });

  msg.textContent=`✅ ${selectedSchool.SCHUL_NM} ${grade}학년 ${cls}반 시간표를 불러왔습니다!`;
  msg.style.color='var(--accent3)';
  toast('시간표 불러오기 완료! 확인 후 저장하세요 ✅','ok');
});

// ════ TIMETABLE ════════════════════════════
function renderTT(){
  const tod=new Date().getDay();
  ['th0','th1','th2','th3','th4'].forEach((id,i)=>{document.getElementById(id).className=tod-1===i?'tod':'';});
  const days=['mon','tue','wed','thu','fri'];
  const rows=ttRows.length?ttRows:DEFAULT_TT;
  document.getElementById('ttBody').innerHTML=rows.map(row=>`<div class="ttr"><div class="ttp">${row.period}</div>${days.map((d,di)=>`<div class="tts${tod-1===di?' tod':''}" style="${tod-1===di?`color:${sc(row[d])};`:''}">${row[d]||'—'}</div>`).join('')}</div>`).join('');
}

document.getElementById('btnTtEdit').addEventListener('click',()=>{
  if(!isTeacher()){toast('선생님만 편집할 수 있습니다','err');return;}
  const rows=ttRows.length?ttRows:DEFAULT_TT;
  const days=['mon','tue','wed','thu','fri'];
  document.getElementById('ttEditGrid').innerHTML=
    `<div></div>${['월','화','수','목','금'].map(d=>`<div class="tehd">${d}</div>`).join('')}`+
    rows.map(row=>`<div class="tepl">${row.period}</div>${days.map(d=>`<div class="tecell"><input type="text" value="${row[d]||''}" data-period="${row.period}" data-day="${d}" maxlength="6"></div>`).join('')}`).join('');
  openMo('ttEditMo');
});

document.getElementById('btnClsTt').addEventListener('click',()=>closeMo('ttEditMo'));

document.getElementById('btnSaveTt').addEventListener('click',async()=>{
  if(!isTeacher()){toast('선생님만 저장할 수 있습니다','err');return;}
  const map={};
  document.querySelectorAll('#ttEditGrid input').forEach(inp=>{
    const p=inp.dataset.period,d=inp.dataset.day;
    if(!map[p])map[p]={period:parseInt(p)};
    map[p][d]=inp.value.trim();
  });
  const newRows=Object.values(map).sort((a,b)=>a.period-b.period);
  const btn=document.getElementById('btnSaveTt');
  btn.disabled=true;btn.textContent='저장 중...';
  try{
    if(!demoMode){
      await sbDelete('timetables',`class_code=eq.${classCode}&created_by=eq.${userId}`);
      await sbPost('timetables',newRows.map(r=>({...r,class_code:classCode,created_by:userId})));
    }
    ttRows=newRows;renderTT();closeMo('ttEditMo');toast('시간표 저장 완료 ✅','ok');
  }catch(e){toast('저장 실패: '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='저장하기';}
});

// ════ PERFORMANCES ═════════════════════════
function renderPerfs(){
  const el=document.getElementById('perfList');
  if(!perfs.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">'+(isTeacher()?'우하단 ＋ 버튼으로 수행평가를 등록하세요':'선생님이 아직 등록하지 않았습니다')+'</div>';return;}
  el.innerHTML=[...perfs].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(p=>`
    <div class="pcard">
      <div class="ptop"><span class="pbadge" style="background:${p.color}22;color:${p.color};border:1px solid ${p.color}44">${p.subject}</span><span class="pdd">${dday(p.date)}</span></div>
      <div class="ptitle">${p.title}</div>
      <div class="pdesc">${p.description||'내용 없음'}</div>
      <div class="pmeta">
        <div class="pmi">📅 <strong>${p.date.replace(/-/g,'.')}</strong></div>
        <div class="pmi">🕐 <strong>${p.period}</strong></div>
        <div class="pmi">📂 <strong>${p.type}</strong></div>
      </div>
      ${isTeacher()?`<div style="display:flex;gap:6px;margin-top:7px;"><button class="ebtn" data-id="${p.id}">✏️ 수정</button><button class="dbtn" data-id="${p.id}">🗑 삭제</button></div>`:''}
    </div>`).join('');
  if(isTeacher()){
    document.querySelectorAll('#perfList .dbtn').forEach(btn=>btn.addEventListener('click',()=>deletePerf(btn.dataset.id)));
    document.querySelectorAll('#perfList .ebtn').forEach(btn=>btn.addEventListener('click',()=>openEditPerf(btn.dataset.id)));
  }
}

document.getElementById('fabBtn').addEventListener('click',()=>{
  if(!isTeacher()){toast('선생님만 등록할 수 있습니다','err');return;}
  document.getElementById('aDate').value=new Date().toISOString().split('T')[0];
  openMo('addPerfMo');
});
document.getElementById('btnClsPerf').addEventListener('click',()=>closeMo('addPerfMo'));

document.getElementById('btnSavePerf').addEventListener('click',async()=>{
  if(!isTeacher()){toast('선생님만 등록할 수 있습니다','err');return;}
  const title=document.getElementById('aTitle').value.trim();
  if(!title){toast('제목을 입력해주세요','err');return;}
  const obj={subject:document.getElementById('aSubj').value,type:document.getElementById('aType').value,date:document.getElementById('aDate').value,period:document.getElementById('aPeriod').value,title,description:document.getElementById('aDesc').value.trim()||'내용 없음',color:selColor,class_code:classCode,created_by:userId};
  const btn=document.getElementById('btnSavePerf');
  btn.disabled=true;btn.textContent='저장 중...';
  try{
    if(!demoMode){const d=await sbPost('performances',[obj]);perfs.push(d[0]);}
    else{perfs.push({...obj,id:'d'+Date.now()});}
    renderPerfs();renderUpcoming();updateDot();updateDday();
    closeMo('addPerfMo');toast('수행평가 등록 완료 ✅','ok');
    document.getElementById('aTitle').value='';document.getElementById('aDesc').value='';
  }catch(e){toast('저장 실패: '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='등록하기';}
});

async function deletePerf(id){
  if(!isTeacher()){toast('선생님만 삭제할 수 있습니다','err');return;}
  if(!confirm('삭제하시겠습니까?'))return;
  try{
    if(!demoMode)await sbDelete('performances',`id=eq.${id}&created_by=eq.${userId}`);
    perfs=perfs.filter(p=>p.id!==id);renderPerfs();renderUpcoming();updateDot();toast('삭제되었습니다');
  }catch(e){toast('삭제 실패: '+e.message,'err');}
}

// ════ EXAMS ════════════════════════════════
function renderExamSc(){
  const el=document.getElementById('examScList');
  if(!exams.length){el.innerHTML='<div style="text-align:center;padding:26px;color:var(--text3);font-size:12px;">'+(isTeacher()?'시험 정보를 추가해주세요':'선생님이 아직 등록하지 않았습니다')+'</div>';return;}
  const sorted=[...exams].sort((a,b)=>new Date(a.exam_date)-new Date(b.exam_date));
  const byDate={};sorted.forEach(e=>{(byDate[e.exam_date]=byDate[e.exam_date]||[]).push(e);});
  el.innerHTML=Object.entries(byDate).map(([date,items])=>`
    <div class="eov" style="margin-bottom:8px;">
      <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px;">📅 ${date.replace(/-/g,'.')}</div>
      ${items.map(e=>`<div class="esr"><div class="esrs" style="color:${sc(e.subject)}">${e.subject}</div><div class="esrd">${e.start_time||'—'}</div><div style="display:flex;align-items:center;gap:5px;"><div class="esrt">${dday(e.exam_date)}</div>${isTeacher()?`<div style="display:flex;gap:4px;"><button class="eedit" data-id="${e.id}">✏️</button><button class="edel" data-id="${e.id}">🗑</button></div>`:''}</div></div>`).join('')}
    </div>`).join('');
  if(isTeacher()){
    document.querySelectorAll('#examScList .edel').forEach(btn=>btn.addEventListener('click',()=>deleteExam(btn.dataset.id)));
    document.querySelectorAll('#examScList .eedit').forEach(btn=>btn.addEventListener('click',()=>openEditExam(btn.dataset.id)));
  }
}

function renderExamRg(){
  const el=document.getElementById('examRgList');
  if(!exams.length){el.innerHTML='<div style="text-align:center;padding:26px;color:var(--text3);font-size:12px;">등록된 시험이 없습니다</div>';return;}
  el.innerHTML=[...exams].sort((a,b)=>new Date(a.exam_date)-new Date(b.exam_date)).map(e=>`
    <div class="esc">
      <div class="esch"><div class="escn" style="color:${sc(e.subject)}">${e.subject}</div><div class="escb">지필 ${e.written_ratio||0}%</div></div>
      <div class="esrl">시험 범위</div>
      <div class="esrng">${(e.range_text||'범위 미등록').replace(/\n/g,'<br>')}</div>
      <div>${[['지필',e.written_ratio,'var(--accent)'],['수행',e.performance_ratio,'var(--accent3)'],['출결',e.attendance_ratio,'var(--accent4)']].map(([k,v,c])=>`<div class="rbr"><div class="rbl">${k}</div><div class="rbt"><div class="rbf" style="width:${v||0}%;background:${c}"></div></div><div class="rbv" style="color:${c}">${v||0}%</div></div>`).join('')}</div>
    </div>`).join('');
}

document.getElementById('btnAddExam').addEventListener('click',()=>{
  if(!isTeacher()){toast('선생님만 등록할 수 있습니다','err');return;}
  document.getElementById('eDate').value=new Date().toISOString().split('T')[0];
  openMo('addExamMo');
});
document.getElementById('btnClsExam').addEventListener('click',()=>closeMo('addExamMo'));

document.getElementById('btnSaveExam').addEventListener('click',async()=>{
  if(!isTeacher()){toast('선생님만 등록할 수 있습니다','err');return;}
  const exam_date=document.getElementById('eDate').value;
  if(!exam_date){toast('날짜를 입력해주세요','err');return;}
  const obj={subject:document.getElementById('eSubj').value,exam_date,start_time:document.getElementById('eTime').value.trim(),range_text:document.getElementById('eRange').value.trim(),written_ratio:parseInt(document.getElementById('eWritten').value)||0,performance_ratio:parseInt(document.getElementById('ePerf').value)||0,attendance_ratio:parseInt(document.getElementById('eAttend').value)||0,class_code:classCode,created_by:userId};
  const btn=document.getElementById('btnSaveExam');
  btn.disabled=true;btn.textContent='저장 중...';
  try{
    if(!demoMode){const d=await sbPost('exams',[obj]);exams.push(d[0]);}
    else{exams.push({...obj,id:'e'+Date.now()});}
    renderExamSc();renderExamRg();updateDday();closeMo('addExamMo');toast('시험 정보 등록 완료 ✅','ok');
  }catch(e){toast('저장 실패: '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='등록하기';}
});

async function deleteExam(id){
  if(!isTeacher()){toast('선생님만 삭제할 수 있습니다','err');return;}
  if(!confirm('삭제하시겠습니까?'))return;
  try{
    if(!demoMode)await sbDelete('exams',`id=eq.${id}&created_by=eq.${userId}`);
    exams=exams.filter(e=>e.id!==id);renderExamSc();renderExamRg();updateDday();toast('삭제되었습니다');
  }catch(e){toast('삭제 실패: '+e.message,'err');}
}

// ════ COLOR PICKER ══════════════════════════
function initColorPicker(){
  document.getElementById('colorPicker').innerHTML=COLORS.map((c,i)=>`<div class="cs${i===0?' sel':''}" style="background:${c}" data-color="${c}"></div>`).join('');
  document.querySelectorAll('.cs').forEach(el=>{
    el.addEventListener('click',()=>{selColor=el.dataset.color;document.querySelectorAll('.cs').forEach(s=>s.classList.remove('sel'));el.classList.add('sel');});
  });
}

// ════ SCROLL DRUM PICKER ═══════════════════
(function(){
  const GRADES=['1학년','2학년','3학년'];
  const CLASSES=Array.from({length:15},(_,i)=>`${i+1}반`);
  let selGrade=0,selClass=0;

  function buildDrum(innerId,items,idx){
    const inner=document.getElementById(innerId);
    inner.innerHTML='<div class="drum-spacer"></div>'+items.map((txt,i)=>`<div class="drum-item${i===idx?' sel':''}" data-idx="${i}">${txt}</div>`).join('')+'<div class="drum-spacer"></div>';
    inner.querySelectorAll('.drum-item').forEach(el=>{
      el.addEventListener('click',()=>{
        const i=parseInt(el.dataset.idx);
        if(innerId==='gradeInner')selGrade=i; else selClass=i;
        document.getElementById(innerId==='gradeInner'?'gradeScroll':'classScroll').scrollTo({top:i*44,behavior:'smooth'});
      });
    });
  }
  function attachScroll(drumId,innerId,setter){
    document.getElementById(drumId).addEventListener('scroll',function(){
      const idx=Math.round(this.scrollTop/44);
      setter(idx);
      document.getElementById(innerId).querySelectorAll('.drum-item').forEach((el,i)=>el.classList.toggle('sel',i===idx));
    });
  }
  function openPicker(){
    buildDrum('gradeInner',GRADES,selGrade);
    buildDrum('classInner',CLASSES,selClass);
    setTimeout(()=>{
      document.getElementById('gradeScroll').scrollTop=selGrade*44;
      document.getElementById('classScroll').scrollTop=selClass*44;
    },50);
    attachScroll('gradeScroll','gradeInner',i=>{selGrade=i;});
    attachScroll('classScroll','classInner',i=>{selClass=i;});
    openMo('classPickerMo');
  }
  function confirmPicker(){
    // class_code = "2-3" 형식
    const code=`${selGrade+1}-${selClass+1}`;
    const label=`${GRADES[selGrade]} ${CLASSES[selClass]}`;
    document.getElementById('regClass').value=code;
    const btn=document.getElementById('btnPickClass');
    btn.querySelector('#pickClassLabel').textContent=label;
    btn.style.color='var(--text)'; btn.style.borderColor='var(--accent)';
    closeMo('classPickerMo');
  }
  document.getElementById('btnPickClass').addEventListener('click',openPicker);
  document.getElementById('btnConfirmClass').addEventListener('click',confirmPicker);
  document.getElementById('btnClsPicker').addEventListener('click',()=>closeMo('classPickerMo'));
})();


// ════ 수행평가 수정 ══════════════════════════
let editSelColor = '#4f8ef7';

function openEditPerf(id){
  const p = perfs.find(x=>x.id===id); if(!p) return;
  document.getElementById('editPerfId').value = p.id;
  document.getElementById('eaSubj').value = p.subject;
  document.getElementById('eaType').value = p.type;
  document.getElementById('eaDate').value = p.date;
  document.getElementById('eaPeriod').value = p.period;
  document.getElementById('eaTitle').value = p.title;
  document.getElementById('eaDesc').value = p.description||'';
  editSelColor = p.color||'#4f8ef7';
  // 색상 피커 초기화
  const COLORS=['#4f8ef7','#7c3aed','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'];
  document.getElementById('editColorPicker').innerHTML=COLORS.map(c=>`<div class="cs${c===editSelColor?' sel':''}" style="background:${c}" data-color="${c}"></div>`).join('');
  document.querySelectorAll('#editColorPicker .cs').forEach(el=>{
    el.addEventListener('click',()=>{editSelColor=el.dataset.color;document.querySelectorAll('#editColorPicker .cs').forEach(s=>s.classList.remove('sel'));el.classList.add('sel');});
  });
  openMo('editPerfMo');
}

document.getElementById('btnClsEditPerf').addEventListener('click',()=>closeMo('editPerfMo'));

document.getElementById('btnUpdatePerf').addEventListener('click', async ()=>{
  const id = document.getElementById('editPerfId').value;
  const title = document.getElementById('eaTitle').value.trim();
  if(!title){toast('제목을 입력해주세요','err');return;}
  const obj={subject:document.getElementById('eaSubj').value,type:document.getElementById('eaType').value,date:document.getElementById('eaDate').value,period:document.getElementById('eaPeriod').value,title,description:document.getElementById('eaDesc').value.trim()||'내용 없음',color:editSelColor};
  const btn=document.getElementById('btnUpdatePerf');
  btn.disabled=true;btn.textContent='수정 중...';
  try{
    if(!demoMode){
      const r=await fetch(`${SB_URL}/rest/v1/performances?id=eq.${id}&created_by=eq.${userId}`,{
        method:'PATCH',
        headers:{'apikey':SB_KEY,'Authorization':`Bearer ${ACCESS_TOKEN}`,'Content-Type':'application/json','Prefer':'return=representation'},
        body:JSON.stringify(obj)
      });
      if(!r.ok){const d=await r.json();throw new Error(d.message||'수정 오류');}
      const updated=(await r.json())[0];
      const idx=perfs.findIndex(p=>p.id===id);
      if(idx>=0) perfs[idx]={...perfs[idx],...updated};
    } else {
      const idx=perfs.findIndex(p=>p.id===id);
      if(idx>=0) perfs[idx]={...perfs[idx],...obj};
    }
    renderPerfs();renderUpcoming();updateDot();
    closeMo('editPerfMo');toast('수행평가 수정 완료 ✅','ok');
  }catch(e){toast('수정 실패: '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='수정 완료';}
});

// ════ 시험 수정 ═══════════════════════════════
function openEditExam(id){
  const e = exams.find(x=>x.id===id); if(!e) return;
  document.getElementById('editExamId').value = e.id;
  document.getElementById('eeSubj').value = e.subject;
  document.getElementById('eeDate').value = e.exam_date;
  document.getElementById('eeTime').value = e.start_time||'';
  document.getElementById('eeRange').value = e.range_text||'';
  document.getElementById('eeWritten').value = e.written_ratio||0;
  document.getElementById('eePerf').value = e.performance_ratio||0;
  document.getElementById('eeAttend').value = e.attendance_ratio||0;
  openMo('editExamMo');
}

document.getElementById('btnClsEditExam').addEventListener('click',()=>closeMo('editExamMo'));

document.getElementById('btnUpdateExam').addEventListener('click', async ()=>{
  const id = document.getElementById('editExamId').value;
  const exam_date = document.getElementById('eeDate').value;
  if(!exam_date){toast('날짜를 입력해주세요','err');return;}
  const obj={subject:document.getElementById('eeSubj').value,exam_date,start_time:document.getElementById('eeTime').value.trim(),range_text:document.getElementById('eeRange').value.trim(),written_ratio:parseInt(document.getElementById('eeWritten').value)||0,performance_ratio:parseInt(document.getElementById('eePerf').value)||0,attendance_ratio:parseInt(document.getElementById('eeAttend').value)||0};
  const btn=document.getElementById('btnUpdateExam');
  btn.disabled=true;btn.textContent='수정 중...';
  try{
    if(!demoMode){
      const r=await fetch(`${SB_URL}/rest/v1/exams?id=eq.${id}&created_by=eq.${userId}`,{
        method:'PATCH',
        headers:{'apikey':SB_KEY,'Authorization':`Bearer ${ACCESS_TOKEN}`,'Content-Type':'application/json','Prefer':'return=representation'},
        body:JSON.stringify(obj)
      });
      if(!r.ok){const d=await r.json();throw new Error(d.message||'수정 오류');}
      const updated=(await r.json())[0];
      const idx=exams.findIndex(e=>e.id===id);
      if(idx>=0) exams[idx]={...exams[idx],...updated};
    } else {
      const idx=exams.findIndex(e=>e.id===id);
      if(idx>=0) exams[idx]={...exams[idx],...obj};
    }
    renderExamSc();renderExamRg();updateDday();
    closeMo('editExamMo');toast('시험 정보 수정 완료 ✅','ok');
  }catch(e){toast('수정 실패: '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='수정 완료';}
});

// ════ 회원가입 학교 검색 JS ════════════════════
(function(){
  document.getElementById('btnRegSearchSchool').addEventListener('click', async ()=>{
    const q = document.getElementById('regSchoolInput').value.trim();
    if(!q){toast('학교명을 입력해주세요','err');return;}
    const btn=document.getElementById('btnRegSearchSchool');
    btn.disabled=true;btn.textContent='검색 중...';
    const results = await searchSchool(q);
    btn.disabled=false;btn.textContent='검색';
    const el=document.getElementById('regSchoolResults');
    if(!results.length){
      el.style.display='block';
      el.innerHTML='<div style="padding:12px;text-align:center;color:var(--text3);font-size:12px;">검색 결과 없음</div>';
      return;
    }
    el.style.display='block';
    el.innerHTML=results.map(s=>`
      <div style="padding:9px 12px;cursor:pointer;background:var(--surface2);border-bottom:1px solid var(--border);"
        data-code="${s.SD_SCHUL_CODE}" data-atpt="${s.ATPT_OFCDC_SC_CODE}" data-name="${s.SCHUL_NM}"
        onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background='var(--surface2)'">
        <div style="font-size:13px;font-weight:600;">${s.SCHUL_NM}</div>
        <div style="font-size:11px;color:var(--text3);">${s.ORG_RDNMA||''}</div>
      </div>`).join('');
    el.querySelectorAll('[data-code]').forEach(item=>{
      item.addEventListener('click',()=>{
        document.getElementById('regSchoolCode').value=item.dataset.code;
        document.getElementById('regAtptCode').value=item.dataset.atpt;
        document.getElementById('regSchoolName').value=item.dataset.name;
        document.getElementById('regSchoolInput').value=item.dataset.name;
        const sel=document.getElementById('regSchoolSelected');
        sel.style.display='block';
        sel.textContent='✅ '+item.dataset.name;
        el.style.display='none';
      });
    });
  });
  document.getElementById('regSchoolInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnRegSearchSchool').click();});
})();

// ════ INIT ══════════════════════════════════
(function init(){
  // Supabase 설정
  SB_URL = 'https://ukpfniijcgrfjqwpgnvd.supabase.co';
  SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcGZuaWlqY2dyZmpxd3BnbnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjY0MDUsImV4cCI6MjA4OTQwMjQwNX0.MFwx0gXAYk_oKbeAjuYJRGuFMK5GkKD_sRZkkWoISPA';

  // 설정 화면 숨기고 랜딩으로 바로 이동
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';

  // 저장된 세션 있으면 자동 로그인
  const saved = localStorage.getItem('sb_session');
  if(saved){
    try{
      const s = JSON.parse(saved);
      ACCESS_TOKEN = s.access_token;
      REFRESH_TOKEN = s.refresh_token;
      userId = s.user_id;
      loadProfileAndLaunch();
    }catch(e){ localStorage.removeItem('sb_session'); }
  }
})();

}); // DOMContentLoaded