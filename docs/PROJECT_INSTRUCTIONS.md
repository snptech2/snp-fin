# SNP Finance - Istruzioni Progetto

## 📋 STATO ATTUALE (Ultimo aggiornamento: 17/06/2025)

### ✅ Implementato
- ✅ Setup base Next.js + TypeScript + Tailwind + Prisma
- ✅ Database SQLite con schema completo (User, Account, Transaction, Category, Transfer, Budget)
- ✅ Sistema di navigazione completo con sidebar
- ✅ Layout base dell'app con tutte le pagine
- ✅ Repository GitHub collegato

### 🔄 In Sviluppo
- Prossima feature da implementare: **FASE 2 - Conti Bancari (CRUD completo)**

### ⏳ Da Implementare
- Tutto il resto (vedi roadmap sotto)

---

## 🎯 VISIONE PROGETTO

**SNP Finance** è un'app di gestione finanziaria personale completa con:

### 1. **Selezione Valuta**
- EUR o USD
- Impostazione globale dell'app

### 2. **Conti Bancari**
- CRUD completo per conti bancari
- Selezione conto predefinito
- Trasferimenti tra conti
- Impossibilità di cancellare conti con operazioni

### 3. **Entrate & Uscite**
Per entrambe le sezioni:
- Aggiunta transazioni (data, categoria, descrizione, importo)
- CRUD categorie
- Riepilogo mese corrente (totale + grafico per categorie)
- Riepilogo storico (totale + grafico per categorie)  
- Lista transazioni con CRUD singolo
- Selezione multipla per cancellazione in blocco
- Filtri: ricerca smart, per categoria, per data

### 4. **Budget**
- Budget basati sulla liquidità totale di tutti i conti
- Tipi di budget:
  - **Fondo Emergenza**: importo fisso (es. 15.000€)
  - **Fondo Spese**: importo fisso (es. 3.000€)
  - **Fondo Investimenti**: tutto il resto della liquidità
- CRUD completo per budget

### 5. **Dashboard** (da sviluppare alla fine)
- Panoramica generale dell'app

### 6. **Altro** (da sviluppare in seguito)
- Beni non correnti e crediti

### 7. **Investimenti** (da sviluppare in seguito)
- Sezione complessa

---

## 🗄️ STRUTTURA DATABASE NECESSARIA

### Tabelle da creare/modificare:

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

model Account {
  id              Int           @id @default(autoincrement())
  name            String
  balance         Float         @default(0)
  isDefault       Boolean       @default(false)
  userId          Int
  user            User          @relation(fields: [userId], references: [id])
  
  // Relazioni
  transactions    Transaction[]
  transfersFrom   Transfer[]    @relation("FromAccount")
  transfersTo     Transfer[]    @relation("ToAccount")
}

model Category {
  id           Int           @id @default(autoincrement())
  name         String
  type         String        // "income" o "expense"
  userId       Int
  user         User          @relation(fields: [userId], references: [id])
  
  // Relazioni
  transactions Transaction[]
}

model Transaction {
  id          Int      @id @default(autoincrement())
  description String?
  amount      Float
  date        DateTime @default(now())
  type        String   // "income" o "expense"
  
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
  
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 🚀 ROADMAP SVILUPPO

### FASE 1: Database e Struttura Base
1. Aggiornare schema Prisma
2. Creare sistema di navigazione (menu)
3. Impostare layout base dell'app

### FASE 2: Conti Bancari
1. Pagina lista conti
2. CRUD conti bancari  
3. Sistema conto predefinito
4. Trasferimenti tra conti

### FASE 3: Categorie
1. Sistema CRUD categorie per entrate
2. Sistema CRUD categorie per uscite

### FASE 4: Entrate
1. Form aggiunta entrate
2. Lista transazioni entrate
3. Grafici e riepiloghi
4. Filtri e ricerca

### FASE 5: Uscite
1. Form aggiunta uscite
2. Lista transazioni uscite  
3. Grafici e riepiloghi
4. Filtri e ricerca

### FASE 6: Budget
1. Sistema creazione budget
2. Calcolo liquidità totale
3. Distribuzione automatica fondi
4. Dashboard budget

### FASE 7: Dashboard
1. Panoramica generale
2. Grafici principali
3. Riepiloghi rapidi

---

## 🔧 ISTRUZIONI PER SVILUPPATORI

### Setup Locale
```bash
npm install
npx prisma db push
npx prisma generate
npm run dev
```

### Commit e Push
```bash
git add .
git commit -m "Descrizione feature"
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

---

## 🎯 PROSSIMA AZIONE

**SVILUPPARE**: FASE 2 - Conti Bancari
- Lista conti con saldi
- Form creazione/modifica conto
- Sistema conto predefinito  
- Possibilità di cancellare conto (solo se senza transazioni)
- Preparazione per trasferimenti tra conti