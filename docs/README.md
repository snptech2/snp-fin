# 💰 SNP Finance - App Gestione Finanziaria Personale

Un'applicazione completa per la gestione delle finanze personali con investimenti DCA Bitcoin integrati.

## 🚀 **Caratteristiche Principali**

### 📊 **Gestione Finanziaria Completa**
- ✅ **Conti Bancari** multipli con saldi automatici
- ✅ **Entrate & Uscite** con categorie personalizzate
- ✅ **Budget Intelligenti** con allocazione automatica a cascata
- ✅ **Ricerca Avanzata** e filtri multi-campo
- ✅ **Grafici** e statistiche per categoria

### 🟠 **Investimenti DCA Bitcoin** ⭐ *NUOVISSIMO*
- ✅ **Portafogli DCA** modulari e gestibili
- ✅ **Tracking Completo**: Data, Broker, Quantità BTC, € Investiti
- ✅ **Fee di Rete** separate con conversioni automatiche
- ✅ **Prezzo Live** Bitcoin con refresh automatico
- ✅ **Calcoli Avanzati**: ROI, P&L, costo medio, BTC netti

### 🎨 **UI/UX Moderna**
- ✅ **Design Responsive** ottimizzato mobile/desktop
- ✅ **Selezione Multipla** e operazioni batch
- ✅ **Loading States** e gestione errori completa
- ✅ **Modali Standard** con validazioni

---

## 🛠️ **Stack Tecnologico**

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS con design system custom
- **Database**: SQLite + Prisma ORM
- **API**: Next.js API Routes
- **Grafici**: CSS puro (no dipendenze esterne)

---

## ⚡ **Quick Start**

### **Installazione:**
```bash
# Clona il repository
git clone [repository-url]
cd snp-finance

# Installa dipendenze
npm install

# Setup database
npx prisma db push
npx prisma generate

# Crea dati di esempio
npm run seed

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

### **Utente di Default:**
- **Email**: `user@snpfinance.com`
- **Nome**: `Utente Demo`

---

## 📁 **Struttura Progetto**

```
src/
├── app/
│   ├── accounts/          # Gestione conti bancari
│   ├── income/            # Entrate con funzionalità avanzate
│   ├── expenses/          # Uscite con grafici e statistiche
│   ├── budget/            # Budget con allocazione intelligente
│   ├── investments/       # 🟠 DCA Bitcoin completo
│   └── api/              # API Routes complete
├── components/           # Layout, sidebar, navigation
├── utils/               # Utilities e formatters
├── prisma/              # Database schema e seed
└── docs/                # Documentazione progetto
```

---

## 🎯 **Funzionalità Disponibili**

### **✅ Implementato**
- [x] **Conti Bancari** - CRUD completo con saldo automatico
- [x] **Categorie** - Gestione separate entrate/uscite
- [x] **Transazioni** - Sistema completo con filtri avanzati
- [x] **Budget** - Allocazione automatica a cascata per priorità
- [x] **DCA Bitcoin** - Sistema investimenti completo

### **⏳ Da Implementare**
- [ ] **Dashboard Generale** - Panoramica completa app
- [ ] **Trasferimenti** - Spostamento fondi tra conti
- [ ] **Altri Investimenti** - Crypto, Stocks, ETF, Bonds

---

## 📊 **API Endpoints**

### **Conti**
- `GET/POST /api/accounts`
- `PUT/DELETE /api/accounts/[id]`

### **Transazioni**
- `GET/POST /api/transactions?type=income|expense`
- `PUT/DELETE /api/transactions/[id]`

### **Budget**
- `GET/POST /api/budgets`
- `PUT/DELETE /api/budgets/[id]`

### **🟠 DCA Bitcoin**
- `GET/POST /api/dca-portfolios`
- `GET/POST /api/dca-transactions`
- `GET/POST /api/network-fees`
- `GET /api/bitcoin-price`

---

## 🎨 **Design System**

Il progetto segue un design system coerente:

- **Layout**: `space-y-6` per spaziatura verticale
- **Card**: `card-adaptive rounded-lg shadow-sm border-adaptive`
- **Colori**: Verde entrate, rosso uscite, blu generale
- **Responsive**: Grid che si adatta (1→2→4 colonne)

Vedi `docs/DESIGN_SYSTEM.md` per dettagli completi.

---

## 📝 **Sviluppo**

### **Prima di iniziare:**
1. Leggi `docs/PROJECT_INSTRUCTIONS.md` per lo stato attuale
2. Segui `docs/DESIGN_SYSTEM.md` per lo stile
3. Aggiorna la documentazione quando completi una feature

### **Commit Standard:**
```bash
git commit -m "✅ FASE [X] COMPLETATA: [Descrizione feature]"
```

---

## 🏆 **Caratteristiche Enterprise**

- ✅ **Zero Errori** TypeScript/ESLint
- ✅ **Performance Ottimizzate** con loading states
- ✅ **Validazioni Complete** su tutte le API
- ✅ **Gestione Errori** robusta
- ✅ **Responsive Design** per tutti i dispositivi
- ✅ **Accessibility** integrata
- ✅ **Code Quality** con best practices Next.js 15

---

## 🎉 **Status Progetto**

**SNP Finance è a livello enterprise** con:
- 📊 Sistema finanziario completo e funzionante
- 🟠 Investimenti DCA Bitcoin integrati
- 🎨 UI/UX moderna e responsive
- 🚀 Ready per il deployment in produzione

**Prossimo sviluppo consigliato**: Dashboard Generale per panoramica completa.

---

## 📞 **Supporto**

Per domande o problemi:
1. Controlla `docs/PROJECT_INSTRUCTIONS.md`
2. Verifica `docs/DESIGN_SYSTEM.md` per lo stile
3. Esamina il codice esistente come riferimento

**Il progetto è self-documented e ready to scale! 🚀**