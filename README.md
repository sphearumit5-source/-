# ប្រព័ន្ធគ្រប់គ្រងសិស្ស និងវត្តមានតាមការស្គាល់មុខ

ប្រព័ន្ធ Full-Stack សម្រាប់គ្រប់គ្រងសិស្ស ថ្នាក់រៀន វត្តមានតាមការស្គាល់មុខ គណនីអ្នកប្រើប្រាស់ និងរបាយការណ៍។ UI និងសារ error ប្រើភាសាខ្មែរ។

## មុខងារ

- ចូលប្រព័ន្ធដោយ JWT និង role អ្នកគ្រប់គ្រង/គ្រូបង្រៀន
- គ្រប់គ្រងសិស្ស ថ្នាក់ និងរូបថត
- ចុះឈ្មោះមុខ និងស្កេនវត្តមានតាម Webcam
- គ្រប់គ្រងវត្តមាន និងការកំណត់ម៉ោងមកយឺត
- ផ្ទាំងស្ថិតិ និងរបាយការណ៍ PDF/Excel
- Face recognition ដំណើរការក្នុង Backend ដោយ OpenCV YuNet/SFace ONNX

## បច្ចេកវិទ្យា

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Lucide React, Recharts
- Backend: Python, FastAPI, SQLAlchemy, Pydantic, JWT, OpenCV
- Database: PostgreSQL 15+ (local ឬ Neon)
- Face models: OpenCV Zoo YuNet (MIT) និង SFace (Apache 2.0)
- Khmer font: Noto Sans Khmer (SIL Open Font License)

## Folder Structure

```text
student-attendance-khmer/
├── frontend/
│   ├── public/favicon.svg
│   └── src/
│       ├── components/{layout,ui,students,attendance,face}/
│       ├── pages/{Login,Dashboard,Students,Classes,FaceRegistration,FaceAttendance,Attendance,Reports,Settings}/
│       ├── services/api.ts
│       ├── hooks/
│       ├── types/index.ts
│       ├── utils/constants.ts
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
├── backend/
│   ├── app/{api,core,database,models,schemas,services,utils}/
│   ├── scripts/download_face_models.py
│   ├── tests/
│   ├── uploads/{students,faces}/
│   ├── .env.example
│   └── requirements.txt
├── database/{schema.sql,seed.sql}
├── .gitignore
└── README.md
```

## តម្រូវការមុនដំឡើង

- Windows 10/11, Python 3.11–3.14, Node.js 20.19+ និង npm
- PostgreSQL 15+ ឬ Neon database; local PostgreSQL ត្រូវមាន `psql` ក្នុង `PATH`
- Internet សម្រាប់ទាញយក ONNX models និង Khmer font លើកដំបូង
- Browser ដែលគាំទ្រ `navigator.mediaDevices.getUserMedia`; Webcam ប្រើបានលើ `localhost` ឬ HTTPS

## បង្កើត Database

សម្រាប់ local PostgreSQL សូមបង្កើត database មួយ ហើយបើក Command Prompt នៅ project root រត់៖

```cmd
createdb -U postgres student_attendance_db
psql -U postgres -d student_attendance_db -f database\schema.sql
psql -U postgres -d student_attendance_db -f database\seed.sql
```

សម្រាប់ Neon៖ បើក SQL Editor របស់ project ហើយ run ខ្លឹមសារ `database/schema.sql` មុន `database/seed.sql` លើ database `neondb`។ Schema បង្កើតតារាងចំនួន ៥; seed អាចរត់ម្ដងទៀតដោយមិនបង្កើត records ស្ទួន។

គណនីសាកល្បង៖

| ឈ្មោះអ្នកប្រើប្រាស់ | តួនាទី | ពាក្យសម្ងាត់ |
| --- | --- | --- |
| `admin` | អ្នកគ្រប់គ្រង | `School-Demo-2026!` |
| `teacher1` | គ្រូបង្រៀន | `School-Demo-2026!` |

គណនីទាំងនេះសម្រាប់ development ប៉ុណ្ណោះ។ ប្ដូរពាក្យសម្ងាត់មុនប្រើប្រាស់ជាក់ស្ដែង។

## ដំឡើង Backend

បើក PowerShell នៅក្នុង `backend`៖

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

កែ `DATABASE_URL` ក្នុង `.env` ជា PostgreSQL URL (`postgresql+psycopg://...`) ឱ្យត្រូវនឹង local server ឬ Neon, រក្សា `sslmode=require` សម្រាប់ Neon, ហើយប្ដូរ `SECRET_KEY` ជា random secret យ៉ាងតិច ៣២ តួ។ បន្ទាប់មកពីថត `backend`៖

```powershell
python scripts/download_face_models.py
python -m app.database.init_db
uvicorn app.main:app --reload
```

`download_face_models.py` ទាញ YuNet, SFace និង Noto Sans Khmer ពីប្រភពផ្លូវការ ហើយផ្ទៀងផ្ទាត់ SHA-256 មុនរក្សាទុក។ ONNX/TTF assets ត្រូវបានបញ្ចូលក្នុង `.gitignore`។ Backend API: `http://localhost:8000`; សុខភាពសេវា: `/health`; ការត្រៀម DB: `/ready`; API docs: `/docs`។

## ដំឡើង Frontend

បើក Terminal មួយទៀតនៅក្នុង `frontend`៖

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

បើក URL ដែល Vite បង្ហាញ ជាទូទៅ `http://localhost:5173`។ `VITE_API_URL` ក្នុង `.env` កំណត់ទីតាំង Backend។

## របៀបប្រើ

1. ចូលដោយ `admin` ឬ `teacher1` និងប្ដូរ credentials សម្រាប់ការប្រើជាក់ស្ដែង។
2. អ្នកគ្រប់គ្រងបង្កើតថ្នាក់ និងសិស្ស ហើយអាចបន្ថែមរូបថត profile។
3. ទៅ «ចុះឈ្មោះមុខសិស្ស», ជ្រើសសិស្ស, អនុញ្ញាត Webcam ហើយថតមុខតែមួយឱ្យច្បាស់។ ប្រព័ន្ធរក្សាទុក embedding; មិនរក្សាទុក video។
4. ទៅ «ស្កេនវត្តមាន», បើក Webcam និងចុចស្កេនមុខ។ ប្រព័ន្ធកត់ត្រាមួយដងក្នុងមួយថ្ងៃ និងបដិសេធមុខមិនស្គាល់ ឬលទ្ធផលមិនច្បាស់។
5. «គ្រប់គ្រងវត្តមាន» និង «របាយការណ៍» អាច filter និងទាញ PDF/Excel។ ម៉ោងមកយឺតកំណត់ក្នុង «ការកំណត់»។

## Tests និង Build

ពី project root៖

```powershell
Push-Location backend
python -m pytest tests -q
Pop-Location
npm --prefix frontend run build
```

## សុវត្ថិភាព និងដែនកំណត់

- Passwords ត្រូវ hash ដោយ PBKDF2-SHA256; JWT key ត្រូវរក្សាក្នុង `.env` និងមិនដាក់ក្នុង Git។
- រូបថត និង face embeddings ជាទិន្នន័យរសើប; `backend/uploads/`, model files និង school settings runtime file មិនត្រូវ commit។ កំណត់ការយល់ព្រម, សិទ្ធិចូលប្រើ និងការលុបទិន្នន័យតាមគោលការណ៍សាលា។
- `FACE_SIMILARITY_THRESHOLD` និង `FACE_AMBIGUITY_MARGIN` ជាតម្លៃចាប់ផ្ដើម មិនមែនលទ្ធផល calibration សម្រាប់សិស្សគ្រប់ក្រុមទេ។ សាកល្បងដោយទិន្នន័យដែលមានការយល់ព្រម និងកុំប្រើ similarity ជាភាគរយភាពប្រាកដប្រជា។
- មិនមាន liveness/anti-spoofing ទេ។ Face recognition មិនគួរជាវិធីតែមួយសម្រាប់ការសម្រេចចិត្តមានផលប៉ះពាល់ខ្ពស់។
- Settings persistence ប្រើ JSON file លើ backend តែមួយ; សម្រាប់ multi-instance deployment ត្រូវប្ដូរទៅ database storage។

## Troubleshooting

- **Database មិនភ្ជាប់**៖ ពិនិត្យ PostgreSQL service/port 5432 ឬ Neon host, SSL mode និង `DATABASE_URL` ក្នុង `.env`; បន្ទាប់មករត់ `python -m app.database.init_db` ដើម្បី verify តារាង។
- **Login មិនដំណើរការ**៖ ផ្ទៀងផ្ទាត់ថា `seed.sql` បានរត់ និង Frontend `VITE_API_URL` ចង្អុលទៅ backend ត្រឹមត្រូវ។
- **Camera ត្រូវបានបដិសេធ/មិនឃើញ**៖ អនុញ្ញាត Camera ក្នុង browser, បិទ app ផ្សេងដែលកំពុងប្រើ webcam, ប្រើ `localhost` ឬ HTTPS។
- **មិនមាន model ឬ font**៖ ក្នុង Backend venv រត់ `python scripts/download_face_models.py` ម្ដងទៀត ហើយពិនិត្យ Internet និង SHA verification output។
- **ស្គាល់មុខមិនច្បាស់**៖ កែលម្អពន្លឺ/ចម្ងាយ, ថត enrollment ថ្មី និងកុំបន្ថយ threshold ដោយមិនធ្វើការវាយតម្លៃ false matches។
