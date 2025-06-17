# SNP Finance - Istruzioni Progetto

## 📋 STATO ATTUALE (Ultimo aggiornamento: 17/06/2025)

### ✅ Implementato
- ✅ Setup base Next.js + TypeScript + Tailwind + Prisma
- ✅ Database SQLite con schema completo (User, Account, Transaction, Category, Transfer, Budget)
- ✅ Sistema di navigazione completo con sidebar
- ✅ Layout base dell'app con tutte le pagine
- ✅ Repository GitHub collegato
- ✅ **FASE 2 - Conti Bancari COMPLETATA**
  - ✅ Lista conti con saldi in tempo reale
  - ✅ CRUD completo (Crea, Modifica, Cancella conti)
  - ✅ Sistema conto predefinito con stellina verde
  - ✅ Validazione: non si possono cancellare conti con transazioni
  - ✅ Database collegato con API Routes funzionanti
  - ✅ Loading states e gestione errori
  - ✅ Saldo totale calcolato automaticamente
- ✅ **FASE 2.5 - Fix Errori nel Codice COMPLETATA**
  - ✅ Sistemati errori TypeScript/ESLint
  - ✅ Puliti warning VS Code  
  - ✅ Ottimizzati imports e tipi
  - ✅ Codice pulito e funzionante

### 🚨 PROBLEMI DA RISOLVERE - PRIORITÀ ALTA
- **FASE 3 - Sistema Categorie BLOCCATA**
  - ❌ API routes `/api/categories` restituiscono 404 
  - ❌ Possibili conflitti di file/cartelle create
  - ❌ Pagina `/income` implementata ma API non funzionanti
  - ❌ File API potrebbero essere vuoti o mal posizionati
  - ⚠️ **PROSSIMA AZIONE**: Debug completo API routes + cleanup file

### 🔄 In Sviluppo (BLOCCATO)
- **FASE 3 - Sistema Categorie** - NECESSITA DEBUG
  - Gestione categorie entrate integrate in `/income`
  - API routes da sistemare prima di procedere

### ⏳ Da Implementare
- **FASE 4**: Entrate (transazioni + grafici)
- **FASE 5**: Uscite (transazioni + grafici)
- **FASE 6**: Budget
- **FASE 7**: Dashboard

---

## 🚨 DEBUG CHECKLIST - PROSSIMA SESSIONE

### 1. **Verifica Struttura File API**
```
src/app/api/categories/
├── route.ts                    ← Deve esistere e avere contenuto
└── [id]/
    └── route.ts               ← Deve esistere e avere contenuto
```

### 2. **Cleanup File Inutili**
- ❌ Eliminare `src/app/categories/` se esiste (pagina separata non serve)
- ✅ Controllare conflitti con altre cartelle/file

### 3. **Test API Routes**
- Test: `GET http://localhost:3000/api/categories` deve rispondere `[]`
- Test: `POST http://localhost:3000/api/categories` con JSON

### 4. **Validazione Implementazione**
- ✅ Pagina `/income` completamente implementata
- ❌ API categorie da sistemare
- ⏳ Poi implementare API transazioni

---

## 🎯 VISIONE PROGETTO

**SNP Finance** è un'app di gestione finanziaria personale completa con:

### 1. **Selezione Valuta**
- EUR o USD
- Impostazione globale dell'app

### 2. **Conti Bancari** ✅ COMPLETATO
- ✅ CRUD completo per conti bancari
- ✅ Selezione conto predefinito
- 🔄 Trasferimenti tra conti (da implementare)
- ✅ Impossibilità di cancellare conti con operazioni

### 3. **Entrate & Uscite** 🚨 IN CORSO (BLOCCATO)
Per entrambe le sezioni:
- ✅ UI completa per gestione categorie e transazioni (pagina `/income`)
- ❌ API categories non funzionanti 
- ⏳ API transazioni da implementare
- ⏳ Grafici e riepiloghi
- ⏳ Lista transazioni con CRUD singolo
- ⏳ Filtri: ricerca smart, per categoria, per data

### 4. **Budget** ⏳ DA IMPLEMENTARE
- Budget basati sulla liquidità totale di tutti i conti
- Tipi di budget:
  - **Fondo Emergenza**: importo fisso (es. 15.000€)
  - **Fondo Spese**: importo fisso (es. 3.000€)
  - **Fondo Investimenti**: tutto il resto della liquidità
- CRUD completo per budget

### 5. **Dashboard** ⏳ DA IMPLEMENTARE
- Panoramica generale dell'app

### 6. **Altro** ⏳ DA IMPLEMENTARE
- Beni non correnti e crediti

### 7. **Investimenti** ⏳ DA IMPLEMENTARE
- Sezione complessa

---

## 🗄️ STRUTTURA DATABASE IMPLEMENTATA

```prisma
model User {
  id           Int           @id @default(autoincrement())
  name         String
  email        String        @unique
  currency     String        @default("EUR") // EUR, USD
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relazioni
  accounts     Account[]
  transactions Transaction[]
  categories   Category[]
  budgets      Budget[]
}

model Account {  // ✅ IMPLEMENTATO E FUNZIONANTE
  id              Int           @id @default(autoincrement())
  name            String
  balance         Float         @default(0)
  isDefault       Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  userId          Int
  user            User          @relation(fields: [userId], references: [id])
  
  // Relazioni
  transactions    Transaction[]
  transfersFrom   Transfer[]    @relation("FromAccount")
  transfersTo     Transfer[]    @relation("ToAccount")
}

model Category {  // 🚨 API NON FUNZIONANTI
  id           Int           @id @default(autoincrement())
  name         String
  type         String        // "income" o "expense"
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  userId       Int
  user         User          @relation(fields: [userId], references: [id])
  
  // Relazioni
  transactions Transaction[]
}

model Transaction {  // ⏳ DA IMPLEMENTARE API
  id          Int      @id @default(autoincrement())
  description String?
  amount      Float
  date        DateTime @default(now())
  type        String   // "income" o "expense"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  
  accountId   Int
  account     Account  @relation(fields: [accountId], references: [id])
  
  categoryId  Int
  category    Category @relation(fields: [categoryId], references: [id])
}

model Transfer {
  id          Int      @id @default(autoincrement())
  amount      Float
  description String?
  date        DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  fromAccountId Int
  fromAccount   Account @relation("FromAccount", fields: [fromAccountId], references: [id])
  
  toAccountId   Int
  toAccount     Account @relation("ToAccount", fields: [toAccountId], references: [id])
}

model Budget {
  id          Int      @id @default(autoincrement())
  name        String
  targetAmount Float
  type        String   // "fixed" o "remaining"
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 🚀 ROADMAP SVILUPPO

### ✅ FASE 1: Database e Struttura Base - COMPLETATA
1. ✅ Aggiornare schema Prisma
2. ✅ Creare sistema di navigazione (menu)
3. ✅ Impostare layout base dell'app

### ✅ FASE 2: Conti Bancari - COMPLETATA
1. ✅ Pagina lista conti
2. ✅ CRUD conti bancari  
3. ✅ Sistema conto predefinito
4. ✅ Cancellazione sicura (controllo transazioni)
5. ✅ API Routes complete e funzionanti
6. 🔄 Trasferimenti tra conti (da fare dopo)

### ✅ FASE 2.5: Fix Errori nel Codice - COMPLETATA
1. ✅ Sistemati errori TypeScript/ESLint
2. ✅ Puliti warning VS Code
3. ✅ Ottimizzati imports e tipi
4. ✅ Commit pulito del codice

### 🚨 FASE 3: Categorie - BLOCCATA (DEBUG NECESSARIO)
1. ❌ **DEBUG API Routes categorie** - 404 errors
2. ✅ UI pagina `/income` implementata
3. ❌ **Cleanup file/cartelle** inutili o conflittuali
4. ⏳ Test completo funzionalità

### ⏳ FASE 4: Entrate
1. API transazioni entrate
2. Lista transazioni entrate
3. Grafici e riepiloghi
4. Filtri e ricerca

### ⏳ FASE 5: Uscite
1. Pagina `/expenses` (come `/income`)
2. API transazioni uscite  
3. Grafici e riepiloghi
4. Filtri e ricerca

### ⏳ FASE 6: Budget
1. Sistema creazione budget
2. Calcolo liquidità totale
3. Distribuzione automatica fondi
4. Dashboard budget

### ⏳ FASE 7: Dashboard
1. Panoramica generale
2. Grafici principali
3. Riepiloghi rapidi

---

## 🔧 API ROUTES IMPLEMENTATE

### Conti Bancari ✅ FUNZIONANTI
- `GET /api/accounts` - Lista tutti i conti
- `POST /api/accounts` - Crea nuovo conto
- `PUT /api/accounts/[id]` - Aggiorna conto
- `DELETE /api/accounts/[id]` - Cancella conto (con validazione)
- `PUT /api/accounts/[id]/set-default` - Imposta conto predefinito

### Categorie 🚨 NON FUNZIONANTI
- `GET /api/categories` - 404 ERROR
- `POST /api/categories` - 404 ERROR
- `PUT /api/categories/[id]` - Da testare
- `DELETE /api/categories/[id]` - Da testare

---

## 🔧 ISTRUZIONI PER SVILUPPATORI

### Setup Locale
```bash
npm install
npx prisma db push
npx prisma generate
npm run seed  # Crea utente di default
npm run dev
```

### Commit e Push - PROSSIMA AZIONE
```bash
git add .
git commit -m "🚨 FASE 3 IN CORSO: Pagina income implementata, API categorie da debuggare"
git push
```

### File da Aggiornare
Ogni volta che si implementa una feature:
1. Aggiornare questo file (PROJECT_INSTRUCTIONS.md)
2. Aggiornare stato "✅ Implementato" 
3. Spostare prossima feature in "🔄 In Sviluppo"
4. Committare tutto

---

## 📝 NOTE TECNICHE

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Database**: SQLite + Prisma ORM
- **Struttura**: App Router di Next.js
- **Stato**: React hooks (useState, useEffect)
- **Styling**: Tailwind CSS con design pulito e moderno
- **API**: Next.js API Routes con validazione errori

---

## 🎯 PROSSIMA AZIONE - NUOVA CHAT

**PRIORITÀ ASSOLUTA**: **DEBUG API CATEGORIE**
1. 🔍 Verifica struttura file API Routes
2. 🧹 Cleanup file/cartelle inutili 
3. 🔧 Fix API `/api/categories` (GET/POST)
4. ✅ Test completo pagina `/income`
5. ➡️ Implementare API transazioni

---

## 🏆 ACHIEVEMENTS COMPLETATI

✅ **Database Schema Completo** - Tutte le tabelle necessarie  
✅ **Conti Bancari Funzionanti** - CRUD completo con validazioni  
✅ **API Routes Robuste** - Per conti bancari  
✅ **UI/UX Pulita** - Design moderno e responsive  
✅ **Loading States** - Skeleton e gestione stati di caricamento  
✅ **Codice Pulito** - Zero errori TypeScript/ESLint, best practices Next.js 15
✅ **Pagina Income Completa** - UI per categorie e transazioni integrata

## 🚨 PROBLEMI DA RISOLVERE

❌ **API Categories 404** - Routes non funzionanti  
❌ **File Conflicts** - Possibili cartelle/file da rimuovere  
❌ **Debug Necessario** - Struttura API da verificare completamente