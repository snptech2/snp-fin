# SNP Finance - Istruzioni Progetto

> **Leggi sempre questo file per capire lo stato del progetto e la prossima feature da sviluppare**

---

## 📋 **STATO CORRENTE** 
*Ultimo aggiornamento: 20/06/2025*

### ✅ **COMPLETATO**
- **Setup Base**: Next.js 15 + TypeScript + Tailwind + Prisma + SQLite
- **Database**: Schema completo con tutte le tabelle necessarie
- **Conti Bancari**: CRUD completo, saldo automatico, conto predefinito
- **Categorie**: Gestione separate per entrate/uscite con validazioni
- **Entrate**: Pagina completa con grafici, filtri, ricerca, selezione multipla
- **Uscite**: Identico a entrate con tutte le funzionalità avanzate
- **Budget**: Sistema allocazione automatica a cascata per priorità
- **🟠 Investimenti DCA Bitcoin**: Sistema completo con API, dashboard, prezzo live

### 🔄 **PROSSIMO SVILUPPO**
Scegli una di queste opzioni:

1. **⭐ DASHBOARD GENERALE** *(Consigliato)*
   - Panoramica completa dell'app
   - Grafici entrate vs uscite (mensili/annuali)
   - Widget transazioni recenti e status portfolio

2. **TRASFERIMENTI TRA CONTI**
   - Sistema per spostare soldi tra conti
   - Storico trasferimenti con gestione automatica saldi

3. **ALTRI PORTAFOGLI INVESTIMENTI**
   - Wallet Crypto (multi-cryptocurrency)
   - Stocks & ETF, Bonds

---

## 🗄️ **DATABASE SCHEMA**

```prisma
// CORE ENTITIES ✅ IMPLEMENTATE
model User { id, name, email, currency }
model Account { id, name, balance, isDefault }
model Category { id, name, type, color }
model Transaction { id, description, amount, date, type }
model Budget { id, name, targetAmount, type, order }

// INVESTMENTS ✅ IMPLEMENTATE 🟠 NUOVISSIMO
model DCAPortfolio { id, name, type, isActive }
model DCATransaction { id, date, broker, info, btcQuantity, eurPaid }
model NetworkFee { id, sats, date, description }

// DA IMPLEMENTARE ⏳
model Transfer { id, amount, description, fromAccount, toAccount }
```

---

## 🔧 **API ROUTES DISPONIBILI**

### **Conti Bancari** ✅
- `GET/POST /api/accounts`
- `PUT/DELETE /api/accounts/[id]` 
- `PUT /api/accounts/[id]/set-default`

### **Categorie** ✅  
- `GET/POST /api/categories`
- `PUT/DELETE /api/categories/[id]`

### **Transazioni** ✅
- `GET/POST /api/transactions?type=income|expense`
- `PUT/DELETE /api/transactions/[id]`

### **Budget** ✅
- `GET/POST /api/budgets`
- `PUT/DELETE /api/budgets/[id]`

### **Investimenti DCA** ✅ 🟠 *NUOVISSIMO*
- `GET/POST /api/dca-portfolios`
- `PUT/DELETE /api/dca-portfolios/[id]`
- `GET/POST /api/dca-transactions`
- `PUT/DELETE /api/dca-transactions/[id]`
- `GET/POST /api/network-fees`
- `PUT/DELETE /api/network-fees/[id]`
- `GET /api/bitcoin-price` (live con cache)

---

## 📁 **STRUTTURA PROGETTO**

```
src/
├── app/
│   ├── accounts/          ✅ Conti bancari
│   ├── income/            ✅ Entrate complete
│   ├── expenses/          ✅ Uscite complete  
│   ├── budget/            ✅ Budget con allocazione
│   ├── investments/       ✅ 🟠 DCA Bitcoin completo
│   ├── transfers/         ⏳ Da implementare
│   └── api/              ✅ Tutte le API funzionanti
├── components/           ✅ Layout, sidebar, navigation
├── utils/               ✅ Formatters, validazioni
└── prisma/              ✅ Schema + seed completi
```

---

## 🎯 **FUNZIONALITÀ PRINCIPALI**

### **Sistema Finanziario Completo** ✅
- **Conti multipli** con saldi automatici
- **Transazioni** entrate/uscite con categorie
- **Budget intelligenti** con allocazione a cascata
- **Ricerca avanzata** e filtri
- **Selezione multipla** e operazioni batch
- **Grafici** e statistiche per categoria

### **Investimenti DCA Bitcoin** ✅ 🟠 *NUOVISSIMO*
- **Portafogli DCA** modulari e gestibili
- **Transazioni complete**: Data, Broker, Info, BTC, €, Note
- **Fee di rete** separate in sats con conversioni
- **Calcoli automatici**: Totali, medie, ROI, P&L
- **Prezzo live** Bitcoin con refresh automatico
- **Dashboard professionale** livello Google Sheets

### **UI/UX Avanzata** ✅
- **Design moderno** responsive
- **Loading states** e gestione errori
- **Paginazione** per grandi dataset
- **Modali** standard con validazioni

---

## 🚀 **SETUP SVILUPPO**

### **Installazione:**
```bash
npm install
npx prisma db push
npx prisma generate
npm run seed    # Crea utente di default
npm run dev
```

### **Commit Prossimo:**
```bash
git add .
git commit -m "✅ FASE [X] COMPLETATA: [Descrizione feature]"
git push
```

---

## 📝 **NOTE TECNICHE**

- **Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database**: SQLite + Prisma ORM
- **API**: Next.js API Routes con validazione completa
- **Stile**: Design system basato su `card-adaptive`, `text-white`
- **Grafici**: CSS puro (no dipendenze esterne)
- **API Esterne**: cryptoprices.cc (Bitcoin) + exchangerate-api.com (USD→EUR)

---

## 🎨 **DESIGN SYSTEM**

Segui sempre il **DESIGN_SYSTEM.md** per mantenerе coerenza:

- **Layout**: `<div className="space-y-6">`
- **Header**: `text-3xl font-bold text-white`
- **Card**: `card-adaptive rounded-lg shadow-sm border-adaptive`
- **Bottoni**: `btn-primary` per azioni principali
- **Colori**: Verde entrate, rosso uscite, blu generale

---

## 🏆 **ACHIEVEMENTS**

✅ **Database Schema Completo** - Tutte le tabelle necessarie  
✅ **API Routes Robuste** - Validazioni complete e gestione errori  
✅ **Pagine Professionali** - Funzionalità enterprise level  
✅ **Sistema Budget Avanzato** - Allocazione intelligente a cascata  
✅ **Investimenti DCA Bitcoin** - Sistema completo livello Google Sheets 🟠  
✅ **UI/UX Moderna** - Design responsive e accessibile  
✅ **Codice Pulito** - Zero errori TypeScript/ESLint  

---

## 🎯 **PROSSIMO SVILUPPATORE**

**Quando inizi una nuova sessione:**

1. **Leggi questo file** per capire lo stato attuale
2. **Scegli la prossima fase** (consigliato: Dashboard Generale)
3. **Segui il DESIGN_SYSTEM.md** per lo stile
4. **Aggiorna questo file** quando completi una fase
5. **Fai commit** con messaggio descrittivo

**Il progetto è ora a livello enterprise con sistema finanziario completo!** 🎉

---

## 📊 **METRICHE PROGETTO**

- **File creati**: 50+ 
- **API Routes**: 15+ funzionanti
- **Pagine complete**: 6 con funzionalità avanzate
- **Linee di codice**: 3000+ TypeScript pulito
- **Zero errori**: ESLint + TypeScript compliant
- **Performance**: Ottimizzate per produzione

**SNP Finance è ready per il deployment! 🚀**