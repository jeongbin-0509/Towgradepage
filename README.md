# 📚 학급 알리미

선생님이 등록한 수행평가·시험·시간표를 같은 반 학생들이 실시간으로 공유하는 서비스입니다.

---

## 🚀 배포 방법

### 방법 1 — Vercel (추천, 무료)

1. [vercel.com](https://vercel.com) 회원가입
2. **New Project** → 이 폴더를 드래그앤드롭 업로드
3. **Environment Variables** 에 아래 두 값 추가:

   | Key | Value |
   |-----|-------|
   | `VITE_SB_URL` | `https://xxxx.supabase.co` |
   | `VITE_SB_KEY` | `eyJhbGci...` (anon key) |

4. **Deploy** 클릭 → 완료!

> **환경변수 없이 배포해도 됩니다.**  
> 이 경우 앱 첫 화면에서 URL/Key를 직접 입력하는 설정 화면이 나타납니다.

---

### 방법 2 — Netlify (무료)

1. [netlify.com](https://netlify.com) 회원가입
2. **Sites → Add new site → Deploy manually**
3. 이 폴더 전체를 드래그앤드롭
4. **Site configuration → Environment variables** 에 위 두 값 추가
5. **Trigger deploy** → 완료!

---

### 방법 3 — GitHub Pages

1. GitHub 저장소 생성
2. 이 폴더의 파일들을 업로드
3. **Settings → Pages → Source: main branch / root**
4. 환경변수 주입 없이 사용 (첫 실행 시 URL/Key 입력)

---

## ⚙️ Supabase 설정

### 1. 프로젝트 생성
[supabase.com](https://supabase.com) → New Project

### 2. 이메일 인증 끄기
**Authentication → Providers → Email → Confirm email → OFF**

### 3. SQL 실행
앱 설정 화면의 SQL을 복사해서 **SQL Editor**에서 실행

### 4. CORS 설정 (필수!)
**Authentication → URL Configuration → Site URL**  
배포된 주소 입력 (예: `https://my-app.vercel.app`)

---

## 👩‍🏫 사용 방법

### 선생님 계정 가입
1. 회원가입 → **선생님** 탭 선택
2. 인증 코드 입력: **`TEACHER2024`**
3. 학년·반 선택

> 인증 코드는 `index.html` 내 `const TEACHER_CODE = 'TEACHER2024'` 를 수정해서 변경하세요.

### 학생 계정 가입
1. 회원가입 → **학생** 탭 선택
2. 선생님과 **같은 학년·반** 선택 → 자동으로 같은 반 데이터 공유

---

## 📁 파일 구조

```
hakgup/
├── index.html      # 메인 앱 (CSS + JS 포함)
├── manifest.json   # PWA 설정
├── vercel.json     # Vercel 라우팅 설정
├── _redirects      # Netlify 라우팅 설정
└── README.md       # 이 파일
```

---

## 🛠 기술 스택

- **Frontend**: Vanilla HTML/CSS/JS (빌드 도구 불필요)
- **Backend**: Supabase (PostgreSQL + Auth + REST API)
- **배포**: Vercel / Netlify / GitHub Pages

---

## 🔒 보안 구조

| 테이블 | 읽기 | 쓰기 | 삭제 |
|--------|------|------|------|
| performances | 같은 반 전체 | 선생님만 | 작성자만 |
| exams | 같은 반 전체 | 선생님만 | 작성자만 |
| timetables | 같은 반 전체 | 선생님만 | 선생님만 |
| profiles | 전체 공개 | 본인만 | 본인만 |

Row Level Security (RLS)로 DB 수준에서 강제됩니다.
