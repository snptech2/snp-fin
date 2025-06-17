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
- ✅ **FASE 3 - Sistema Categorie COMPLETATA**
  - ✅ API routes `/api/categories` funzionanti (GET/POST)
  - ✅ API routes `/api/categories/[id]` funzionanti (PUT/DELETE)
  - ✅ Gestione categorie per entrate e uscite
  - ✅ Validazioni complete e controlli duplicati
  - ✅ Controllo transazioni associate prima cancellazione
- ✅ **FASE 4 - Entrate COMPLETATA**
  - ✅ API transazioni entrate complete (GET/POST/PUT/DELETE)
  - ✅ Pagina `/income` con tutte le funzionalità avanzate
  - ✅ Grafici per categoria (mese corrente vs altri periodi)
  - ✅ Statistiche e riepiloghi completi
  - ✅ Ricerca smart e filtri avanzati
  - ✅ Paginazione e gestione di grandi dataset
  - ✅ Selezione multipla e cancellazione batch
  - ✅ Aggiornamento automatico saldi conti
- ✅ **FASE 5 - Uscite COMPLETATA**
  - ✅ Pagina `/expenses` con tutte le funzionalità identiche a entrate
  - ✅ API transazioni uscite complete
  - ✅ Grafici, filtri, ricerca e gestione avanzata
  - ✅ Aggiornamento automatico saldi conti (decrementando)
- ✅ **FASE 6 - Sistema Budget Avanzato COMPLETATA** 🎉 *NUOVO!*
  - ✅ API budget complete (`/api/budgets` GET/POST e `/api/budgets/[id]` PUT/DELETE)
  - ✅ Pagina `/budget` con allocazione automatica a cascata
  - ✅ Dashboard liquidità totale (da tutti i conti)
  - ✅ Budget fissi con target specifico (es. 15.000€)
  - ✅ Budget illimitati che prendono tutto il resto
  - ✅ Sistema priorità (1, 2, 3...) per allocazione intelligente
  - ✅ Barre di progresso e visualizzazione % completamento
  - ✅ Gestione deficit e avvisi quando i soldi non bastano
  - ✅ CRUD completo con validazioni e controlli duplicati

### 🔄 In Sviluppo
- Nessuna fase attualmente in sviluppo

### ⏳ Da Implementare
- **FASE 7**: Dashboard Generale
- **Trasferimenti tra Conti**
- **Beni non Correnti e Crediti**
- **Investimenti** (sezione complessa)

---

## 🔧 API ROUTES IMPLEMENTATE

### Conti Bancari ✅ COMPLETATE E FUNZIONANTI
- `GET /api/accounts` - Lista tutti i conti
- `POST /api/accounts` - Crea nuovo conto
- `PUT /api/accounts/[id]` - Aggiorna conto
- `DELETE /api/accounts/[id]` - Cancella conto (con validazione)
- `PUT /api/accounts/[id]/set-default` - Imposta conto predefinito

### Categorie ✅ COMPLETATE E FUNZIONANTI
- `GET /api/categories` - Lista tutte le categorie
- `POST /api/categories` - Crea nuova categoria
- `PUT /api/categories/[id]` - Aggiorna categoria
- `DELETE /api/categories/[id]` - Cancella categoria (con validazione)

### Transazioni ✅ COMPLETATE E FUNZIONANTI
- `GET /api/transactions?type=income|expense` - Lista transazioni con filtri
- `POST /api/transactions` - Crea nuova transazione
- `PUT /api/transactions/[id]` - Aggiorna transazione
- `DELETE /api/transactions/[id]` - Cancella transazione
- **Features Avanzate**: Aggiornamento automatico saldi, validazioni complete, gestione batch

### Budget ✅ COMPLETATE E FUNZIONANTI 🎉 *NUOVO!*
- `GET /api/budgets` - Lista budget con allocazione automatica a cascata
- `POST /api/budgets` - Crea nuovo budget (fisso o illimitato)
- `PUT /api/budgets/[id]` - Aggiorna budget esistente
- `DELETE /api/budgets/[id]` - Cancella budget
- **Features Avanzate**: Calcolo liquidità totale, distribuzione per priorità, gestione deficit

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
git commit -m "✅ FASE 6 COMPLETATA: Sistema Budget avanzato con allocazione a cascata e dashboard liquidità"
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
- **Grafici**: CSS puro (nessuna dipendenza esterna)

---

## 🎯 PROSSIMA AZIONE - NUOVA CHAT

**PRIORITÀ PROSSIMO SVILUPPO**:

### Opzione 1: **FASE 7 - Dashboard Generale** ⭐ *Consigliato*
1. 🏠 Pagina overview con panoramica completa dell'app
2. 📊 Grafici entrate vs uscite (mensili/annuali)
3. 📈 Trend e analisi temporali
4. 🎯 Riepiloghi rapidi e insights finanziari
5. 💰 Integrazione dati da conti, transazioni e budget
6. 📋 Widget per transazioni recenti e budget status

### Opzione 2: **🔄 Trasferimenti tra Conti**
1. 💸 Sistema per spostare soldi tra conti
2. 📝 Storico trasferimenti con data e descrizione
3. ⚡ Gestione automatica saldi (decrementa sorgente, incrementa destinazione)
4. 🚫 Validazioni: non permettere trasferimenti se saldo insufficiente

### Opzione 3: **🔧 Miglioramenti Sistema Esistente**
1. 🔍 Filtri avanzati globali per date
2. 📊 Esportazione dati in CSV/Excel  
3. 🎨 Miglioramenti UI/UX
4. 📱 Responsive design mobile

---

## 🏆 ACHIEVEMENTS COMPLETATI

✅ **Database Schema Completo** - Tutte le tabelle necessarie  
✅ **Conti Bancari Funzionanti** - CRUD completo con validazioni  
✅ **Sistema Categorie Robusto** - Gestione entrate e uscite separate  
✅ **API Routes Complete** - Conti, categorie, transazioni e budget  
✅ **Pagine Entrate e Uscite** - Con funzionalità professionali  
✅ **Sistema Budget Avanzato** - Allocazione intelligente a cascata 🎉 *NUOVO!*  
✅ **UI/UX Avanzata** - Design moderno e responsive  
✅ **Funzionalità Enterprise**:
  - 🔍 Ricerca smart multi-campo
  - 🔽 Filtri avanzati (categoria, conto, date)
  - 📄 Paginazione per grandi dataset
  - ✅ Selezione multipla e operazioni batch
  - 📊 Grafici e statistiche per categoria
  - 📈 Analisi mese corrente vs altri periodi
  - 🔄 Aggiornamento automatico saldi
  - 💰 Budget con allocazione intelligente per priorità
  - ⚡ Loading states e gestione errori completa
✅ **Codice Pulito** - Zero errori TypeScript/ESLint, best practices Next.js 15  
✅ **Performance Ottimizzate** - Caricamento veloce e reattivo

## 🎉 MILESTONE RAGGIUNTE

🏆 **CORE TRANSAZIONI COMPLETE** - Sistema entrate/uscite di livello professionale  
🏆 **BUDGET SYSTEM AVANZATO** - Allocazione automatica a cascata 🎉 *NUOVO!*  
🏆 **API ROBUSTE** - Validazioni complete e gestione errori  
🏆 **UI MODERNA** - Esperienza utente ottimale  
🏆 **SCALABILITÀ** - Gestione di migliaia di transazioni e budget complessi

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

### 3. **Entrate & Uscite** ✅ COMPLETATO
- ✅ Sistema categorie completo per entrate e uscite
- ✅ CRUD transazioni con aggiornamento automatico saldi
- ✅ Grafici e statistiche per categoria
- ✅ Analisi mese corrente vs altri periodi
- ✅ Ricerca smart multi-campo
- ✅ Filtri avanzati (categoria, conto, range date)
- ✅ Paginazione per gestione grandi dataset
- ✅ Selezione multipla e cancellazione batch
- ✅ UI moderna con loading states e gestione errori

### 4. **Budget** ✅ COMPLETATO 🎉 *NUOVO!*
- ✅ Budget basati sulla liquidità totale di tutti i conti
- ✅ Tipi di budget:
  - **Fondo Emergenza**: importo fisso (es. 15.000€)
  - **Fondo Spese**: importo fisso (es. 3.000€)
  - **Fondo Investimenti**: budget illimitato (tutto il resto)
- ✅ CRUD completo per budget
- ✅ Sistema priorità (1, 2, 3...) per allocazione a cascata
- ✅ Dashboard con panoramica liquidità e allocazioni
- ✅ Barre di progresso e visualizzazione completamento
- ✅ Gestione deficit quando i fondi sono insufficienti

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

model Category {  // ✅ IMPLEMENTATO E FUNZIONANTE
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

model Transaction {  // ✅ IMPLEMENTATO E FUNZIONANTE
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

model Budget {  // ✅ IMPLEMENTATO E FUNZIONANTE 🎉 *NUOVO!*
  id          Int      @id @default(autoincrement())
  name        String
  targetAmount Float
  type        String   // "fixed" o "unlimited"
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
}

model Transfer {  // ⏳ DA IMPLEMENTARE
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

### ✅ FASE 3: Categorie - COMPLETATA
1. ✅ **API Routes categorie** - Funzionanti al 100%
2. ✅ **Gestione categorie** per entrate e uscite
3. ✅ **Validazioni complete** e controllo duplicati
4. ✅ **Controllo transazioni** associate prima cancellazione

### ✅ FASE 4: Entrate - COMPLETATA
1. ✅ **API transazioni entrate** complete
2. ✅ **Pagina `/income`** con funzionalità avanzate
3. ✅ **Grafici e riepiloghi** per categoria
4. ✅ **Filtri e ricerca** smart multi-campo
5. ✅ **Paginazione** e gestione grandi dataset
6. ✅ **Selezione multipla** e operazioni batch

### ✅ FASE 5: Uscite - COMPLETATA
1. ✅ **Pagina `/expenses`** identica a entrate
2. ✅ **API transazioni uscite** complete
3. ✅ **Grafici e riepiloghi** per categoria
4. ✅ **Filtri e ricerca** avanzati
5. ✅ **Tutte le funzionalità** delle entrate

### ✅ FASE 6: Budget - COMPLETATA 🎉 *NUOVO!*
1. ✅ **Sistema creazione budget** con CRUD completo
2. ✅ **Calcolo liquidità totale** da tutti i conti
3. ✅ **Distribuzione automatica fondi** a cascata per priorità
4. ✅ **Dashboard budget** con panoramica e progressi
5. ✅ **Budget fissi e illimitati** con validazioni
6. ✅ **Gestione deficit** e avvisi per fondi insufficienti

### ⏳ FASE 7: Dashboard
1. Panoramica generale
2. Grafici principali
3. Riepiloghi rapidi

---

## 🎯 PROSSIMO SVILUPPATORE

Quando riprendi lo sviluppo in una nuova chat:

1. **Leggi sempre questo file** per capire lo stato attuale
2. **Scegli la prossima fase** da implementare (consigliato: FASE 7 Dashboard)
3. **Aggiorna questo file** quando completi una fase
4. **Fai commit** con messaggio descrittivo

**Il progetto è ora a un livello enterprise** con sistema budget avanzato e gestione finanziaria completa! 🎉

### 📁 File Creati nella FASE 6 - Budget:
- `src/app/api/budgets/route.ts` - API principale (GET/POST)
- `src/app/api/budgets/[id]/route.ts` - API per singolo budget (PUT/DELETE)
- `src/app/budget/page.tsx` - Pagina frontend aggiornata con sistema completo