# SNP Finance - Istruzioni Progetto

## 📋 STATO ATTUALE (Ultimo aggiornamento: 18/06/2025)

### ✅ Implementato
- ✅ Setup base Next.js + TypeScript + Tailwind + Prisma
- ✅ Database SQLite con schema completo (User, Account, Transaction, Category, Transfer, Budget, DCAPortfolio, DCATransaction, NetworkFee)
- ✅ Sistema di navigazione completo con sidebar
- ✅ Layout base dell'app con tutte le pagine
- ✅ Repository GitHub collegato e sicuro (database escluso)
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
- ✅ **FASE 6 - Sistema Budget Avanzato COMPLETATA** 🎉
  - ✅ API budget complete (`/api/budgets` GET/POST e `/api/budgets/[id]` PUT/DELETE)
  - ✅ Pagina `/budget` con allocazione automatica a cascata
  - ✅ Dashboard liquidità totale (da tutti i conti)
  - ✅ Budget fissi con target specifico (es. 15.000€)
  - ✅ Budget illimitati che prendono tutto il resto
  - ✅ Sistema priorità (1, 2, 3...) per allocazione intelligente
  - ✅ Barre di progresso e visualizzazione % completamento
  - ✅ Gestione deficit e avvisi quando i soldi non bastano
  - ✅ CRUD completo con validazioni e controlli duplicati
- ✅ **FASE 7A - Investimenti DCA Bitcoin COMPLETATA** 🟠 *NUOVISSIMO!*
  - ✅ **Database DCA**: DCAPortfolio, DCATransaction, NetworkFee
  - ✅ **API complete DCA**: `/api/dca-portfolios`, `/api/dca-transactions`, `/api/network-fees`
  - ✅ **API Bitcoin Price**: `/api/bitcoin-price` con cryptoprices.cc + conversione EUR
  - ✅ **Pagina principale**: `/investments` con lista portafogli e creazione DCA
  - ✅ **Dashboard DCA**: `/investments/[id]` con funzionalità complete Google Sheets
  - ✅ **Gestione transazioni**: Data, Broker, Info, Quantità BTC, € Pagati, Note
  - ✅ **Fee di rete**: Sats separate con conversione automatica BTC
  - ✅ **Calcoli smart**: Totali, costo medio, BTC netti, ROI, P&L
  - ✅ **Prezzo live**: Refresh automatico 15min + bottone manuale
  - ✅ **UI professionale**: Statistiche, grafici, form modali

### 🔄 In Sviluppo
- Nessuna fase attualmente in sviluppo

### ⏳ Da Implementare
- **FASE 7B**: Dashboard Generale
- **FASE 8**: Trasferimenti tra Conti
- **FASE 9**: Altri Portafogli Investimenti (Crypto Wallet, Stocks & ETF, Bonds)
- **FASE 10**: Beni non Correnti e Crediti

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

### Budget ✅ COMPLETATE E FUNZIONANTI
- `GET /api/budgets` - Lista budget con allocazione automatica a cascata
- `POST /api/budgets` - Crea nuovo budget (fisso o illimitato)
- `PUT /api/budgets/[id]` - Aggiorna budget esistente
- `DELETE /api/budgets/[id]` - Cancella budget
- **Features Avanzate**: Calcolo liquidità totale, distribuzione per priorità, gestione deficit

### Investimenti DCA ✅ COMPLETATE E FUNZIONANTI 🟠 *NUOVISSIMO!*
- `GET /api/dca-portfolios` - Lista portafogli DCA con statistiche
- `POST /api/dca-portfolios` - Crea nuovo portafoglio DCA
- `GET /api/dca-portfolios/[id]` - Dettagli portafoglio specifico
- `PUT /api/dca-portfolios/[id]` - Aggiorna portafoglio
- `DELETE /api/dca-portfolios/[id]` - Cancella portafoglio (CASCADE)
- `GET /api/dca-transactions` - Lista transazioni DCA
- `POST /api/dca-transactions` - Crea transazione DCA
- `PUT /api/dca-transactions/[id]` - Aggiorna transazione DCA
- `DELETE /api/dca-transactions/[id]` - Cancella transazione DCA
- `GET /api/network-fees` - Lista fee di rete
- `POST /api/network-fees` - Crea fee di rete
- `PUT /api/network-fees/[id]` - Aggiorna fee di rete
- `DELETE /api/network-fees/[id]` - Cancella fee di rete
- `GET /api/bitcoin-price` - Prezzo Bitcoin live (cryptoprices.cc + USD→EUR)
- **Features Avanzate**: Cache 5min, conversione sats↔BTC, calcoli ROI, statistiche complete

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

### ✅ FASE 6: Budget - COMPLETATA
1. ✅ **Sistema creazione budget** con CRUD completo
2. ✅ **Calcolo liquidità totale** da tutti i conti
3. ✅ **Distribuzione automatica fondi** a cascata per priorità
4. ✅ **Dashboard budget** con panoramica e progressi
5. ✅ **Budget fissi e illimitati** con validazioni
6. ✅ **Gestione deficit** e avvisi per fondi insufficienti

### ✅ FASE 7A: Investimenti DCA Bitcoin - COMPLETATA 🟠 *NUOVISSIMO!*
1. ✅ **Database schema** DCA (Portfolio, Transaction, NetworkFee)
2. ✅ **API complete** per gestione DCA e prezzi Bitcoin
3. ✅ **Pagina investimenti** con creazione portafogli modulare
4. ✅ **Dashboard DCA** con tutte le funzionalità Google Sheets
5. ✅ **Sistema transazioni** (Data, Broker, Info, BTC, €, Note)
6. ✅ **Fee di rete** separate in sats con conversioni
7. ✅ **Calcoli finanziari** (totali, medie, ROI, P&L)
8. ✅ **Prezzo Bitcoin live** con cache e refresh automatico

### ⏳ FASE 7B: Dashboard Generale
1. Panoramica generale dell'app
2. Grafici entrate vs uscite
3. Trend temporali e insights

### ⏳ FASE 8: Trasferimenti tra Conti
1. Sistema per spostare soldi tra conti
2. Storico trasferimenti
3. Gestione automatica saldi

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

### 4. **Budget** ✅ COMPLETATO
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

### 5. **Investimenti** ✅ COMPLETATO (DCA Bitcoin) 🟠 *NUOVISSIMO!*
- ✅ **DCA Bitcoin**: Piano accumulo completo con tutte le funzionalità
  - 🟠 Creazione portafogli DCA Bitcoin
  - 📊 Dashboard con statistiche (BTC totali, investimento, valore attuale, ROI)
  - 💰 Gestione transazioni (Data, Broker, Info, Quantità BTC, € Pagati, Note)
  - ⚡ Fee di rete separate (sats con conversione BTC)
  - 🔄 Prezzo Bitcoin live (cryptoprices.cc + USD→EUR)
  - 📈 Calcoli automatici (costo medio, BTC netti, P&L)
  - 🔄 Auto-refresh ogni 15min + refresh manuale
- 🔄 **Altri portafogli** (da implementare):
  - 💰 Wallet Crypto (multi-cryptocurrency)
  - 📈 Stocks & ETF (azioni e fondi)
  - 🏛️ Bonds (obbligazioni)

### 6. **Dashboard Generale** ⏳ DA IMPLEMENTARE
- Panoramica completa dell'app

### 7. **Altro** ⏳ DA IMPLEMENTARE
- Trasferimenti tra conti
- Beni non correnti e crediti

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
  dcaPortfolios DCAPortfolio[] // 🟠 NUOVO: Portafogli DCA
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
  color        String        @default("#3B82F6")
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

model Budget {  // ✅ IMPLEMENTATO E FUNZIONANTE
  id          Int      @id @default(autoincrement())
  name        String
  targetAmount Float
  type        String   // "fixed" o "unlimited"
  order       Int      @default(0)
  color       String   @default("#3B82F6")
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

// 🟠 NUOVI MODELLI - INVESTIMENTI DCA BITCOIN ✅ IMPLEMENTATI

model DCAPortfolio {  // ✅ IMPLEMENTATO E FUNZIONANTE 🟠 *NUOVISSIMO!*
  id          Int      @id @default(autoincrement())
  name        String   // "DCA Bitcoin 2024"
  type        String   // "dca_bitcoin", "crypto_wallet", "stocks" (per futuro)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  
  // Relazioni
  transactions DCATransaction[]
  networkFees  NetworkFee[]
}

model DCATransaction {  // ✅ IMPLEMENTATO E FUNZIONANTE 🟠 *NUOVISSIMO!*
  id           Int      @id @default(autoincrement())
  date         DateTime @default(now())
  broker       String   // "Binance", "Kraken", etc. (campo libero)
  info         String   // "Regalo", "DCA", "Acquisto", etc.
  btcQuantity  Float    // 0.01012503
  eurPaid      Float    // 275.00
  notes        String?  // "Verificato", etc.
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  portfolioId  Int
  portfolio    DCAPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
}

model NetworkFee {  // ✅ IMPLEMENTATO E FUNZIONANTE 🟠 *NUOVISSIMO!*
  id          Int      @id @default(autoincrement())
  sats        Int      // 2000 sats fee di rete
  date        DateTime @default(now())
  description String?  // "Transfer to cold wallet"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  portfolioId Int
  portfolio   DCAPortfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
}
```

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
git commit -m "✅ FASE 7A COMPLETATA: Sistema DCA Bitcoin completo con API, dashboard e prezzo live"
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
- **API esterne**: cryptoprices.cc (Bitcoin) + exchangerate-api.com (USD→EUR)

---

## 🎯 PROSSIMA AZIONE - NUOVA CHAT

**PRIORITÀ PROSSIMO SVILUPPO**:

### Opzione 1: **FASE 7B - Dashboard Generale** ⭐ *Consigliato*
1. 🏠 Pagina overview con panoramica completa dell'app
2. 📊 Grafici entrate vs uscite (mensili/annuali)
3. 📈 Trend e analisi temporali
4. 🎯 Riepiloghi rapidi e insights finanziari
5. 💰 Integrazione dati da conti, transazioni, budget e DCA
6. 📋 Widget per transazioni recenti e status portfolio

### Opzione 2: **FASE 8 - Trasferimenti tra Conti**
1. 💸 Sistema per spostare soldi tra conti
2. 📝 Storico trasferimenti con data e descrizione
3. ⚡ Gestione automatica saldi (decrementa sorgente, incrementa destinazione)
4. 🚫 Validazioni: non permettere trasferimenti se saldo insufficiente

### Opzione 3: **FASE 9 - Altri Portafogli Investimenti**
1. 💰 Wallet Crypto (multi-cryptocurrency)
2. 📈 Stocks & ETF (azioni e fondi)
3. 🏛️ Bonds (obbligazioni)
4. 🔄 Sistema modulare per diversi tipi investimenti

### Opzione 4: **🔧 Miglioramenti DCA e Fix**
1. 🐛 Fix errore formatBTC nelle fee di rete
2. 🎨 Miglioramenti UI DCA Bitcoin
3. 📊 Grafici trend prezzo Bitcoin
4. 📱 Responsive design mobile
5. 📤 Esportazione dati DCA in CSV

---

## 🏆 ACHIEVEMENTS COMPLETATI

✅ **Database Schema Completo** - Tutte le tabelle necessarie inclusi DCA  
✅ **Conti Bancari Funzionanti** - CRUD completo con validazioni  
✅ **Sistema Categorie Robusto** - Gestione entrate e uscite separate  
✅ **API Routes Complete** - Conti, categorie, transazioni, budget e DCA  
✅ **Pagine Entrate e Uscite** - Con funzionalità professionali  
✅ **Sistema Budget Avanzato** - Allocazione intelligente a cascata  
✅ **Investimenti DCA Bitcoin** - Sistema completo livello Google Sheets 🟠 *NUOVISSIMO!*  
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
  - 🟠 Portfolio DCA Bitcoin con prezzo live
  - ⚡ Loading states e gestione errori completa
✅ **Codice Pulito** - Zero errori TypeScript/ESLint, best practices Next.js 15  
✅ **Performance Ottimizzate** - Caricamento veloce e reattivo  
✅ **Sicurezza** - Database escluso da Git, `.gitignore` completo

## 🎉 MILESTONE RAGGIUNTE

🏆 **CORE TRANSAZIONI COMPLETE** - Sistema entrate/uscite di livello professionale  
🏆 **BUDGET SYSTEM AVANZATO** - Allocazione automatica a cascata  
🏆 **DCA BITCOIN SYSTEM** - Piano accumulo completo con prezzo live 🟠 *NUOVISSIMO!*  
🏆 **API ROBUSTE** - Validazioni complete e gestione errori  
🏆 **UI MODERNA** - Esperienza utente ottimale  
🏆 **SCALABILITÀ** - Gestione di migliaia di transazioni, budget e investimenti

---

## 🎯 PROSSIMO SVILUPPATORE

Quando riprendi lo sviluppo in una nuova chat:

1. **Leggi sempre questo file** per capire lo stato attuale
2. **Scegli la prossima fase** da implementare (consigliato: FASE 7B Dashboard o fix DCA)
3. **Aggiorna questo file** quando completi una fase
4. **Fai commit** con messaggio descrittivo

**Il progetto è ora a un livello enterprise** con sistema finanziario completo e investimenti DCA Bitcoin! 🎉

### 📁 File Creati nella FASE 7A - Investimenti DCA:
- `src/app/api/dca-portfolios/route.ts` - API principale portafogli (GET/POST)
- `src/app/api/dca-portfolios/[id]/route.ts` - API singolo portafoglio (GET/PUT/DELETE)
- `src/app/api/dca-transactions/route.ts` - API transazioni DCA (GET/POST)
- `src/app/api/dca-transactions/[id]/route.ts` - API singola transazione (PUT/DELETE)
- `src/app/api/network-fees/route.ts` - API fee di rete (GET/POST)
- `src/app/api/network-fees/[id]/route.ts` - API singola fee (PUT/DELETE)
- `src/app/api/bitcoin-price/route.ts` - API prezzo Bitcoin live
- `src/app/investments/page.tsx` - Pagina principale investimenti
- `src/app/investments/[id]/page.tsx` - Dashboard DCA portfolio completa
- Schema Prisma aggiornato con DCAPortfolio, DCATransaction, NetworkFee