# SNP Finance App - Setup Guide

## 🏗️ Architettura

- **Frontend**: Next.js 15 con TypeScript
- **Database**: PostgreSQL Neon (CONDIVISO tra dev e prod)
- **Deploy**: AWS EC2 Ubuntu con PM2
- **Auth**: JWT con bcrypt
- **Migrations**: Prisma (attivate e configurate)

## 🌍 Ambienti

### 🏠 Sviluppo Locale (VSCode Windows)
- **Database**: Neon PostgreSQL (stesso di produzione)
- **URL**: `http://localhost:3000`
- **Node**: `development`
- **Migrations**: Gestite con `prisma migrate dev`

### 🌐 Produzione (EC2 AWS)
- **Database**: Neon PostgreSQL (stesso di sviluppo)
- **URL**: `http://56.228.35.85:3000`
- **Node**: `production`
- **PM2**: Auto-restart e gestione processi
- **Migrations**: Applicate con `prisma migrate deploy`

## 📁 Configurazione File .env

### Setup Attuale
- **`.env`**: NON committato su Git (in .gitignore)
- **`.env.example`**: Template committato su Git
- **Configurazioni separate** per ogni ambiente

### Locale (.env)
```bash
DATABASE_URL="postgresql://neondb_owner:npg_Oilye42HtGRZ@ep-rough-band-a2idvhgw-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&connection_limit=5"
JWT_SECRET="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="8366d3d1026910d74fbb1d52ee80c9875a05f15e245d52868b8864d8402bb63b"
NODE_ENV="development"
```

### Produzione EC2 (.env)
```bash
DATABASE_URL="postgresql://neondb_owner:npg_Oilye42HtGRZ@ep-rough-band-a2idvhgw-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&connection_limit=5"
JWT_SECRET="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
NEXTAUTH_URL="http://56.228.35.85:3000"
NEXTAUTH_SECRET="8366d3d1026910d74fbb1d52ee80c9875a05f15e245d52868b8864d8402bb63b"
NODE_ENV="production"
```

## 🔄 Database Migrations - SETUP COMPLETO

### ✅ Configurazione Attiva
- **Prisma Migrations**: Attivate e funzionanti
- **Database condiviso**: Una migration vale per entrambi gli ambienti
- **Folder**: `prisma/migrations/` (COMMITTATO su Git)
- **Storia**: Migration iniziale: `20250630135140_initial_migration`

### 🚨 Setup Risolto (Giugno 2025)
**Problema risolto**: Le migrations erano erroneamente in `.gitignore`
- ❌ **Prima**: `/prisma/migrations/` ignorato
- ✅ **Ora**: `/prisma/migrations/` committato e sincronizzato

### 🔄 Workflow Sviluppo (LOCALE)
```powershell
# 1. Modifica schema.prisma
# 2. Crea migration
npx prisma migrate dev --name "descrizione-modifica"
# 3. Commit e push
git add prisma/migrations/
git commit -m "Add: descrizione modifica"
git push origin main
```

### 🚀 Deploy Produzione (EC2)
```bash
# Script automatico (include migrations)
./deploy.sh
```

## 🚀 Deploy Process

### Script Deploy (/var/www/finance-app/deploy.sh)
```bash
#!/bin/bash
echo "🚀 Deploying Finance App with Neon DB..."
cd /var/www/finance-app

# Stop app
echo "⏹️ Stopping app..."
pm2 stop finance-app

# Pull changes from GitHub
echo "📥 Pulling latest changes..."
git pull origin main

# Install new dependencies (if any)
echo "📦 Installing dependencies..."
npm install

# Update database schema (con migrations sicure)
echo "🐘 Applying database migrations..."
npx prisma generate
npx prisma migrate deploy

# Build new version
echo "🔨 Building app..."
npm run build

# Restart app
echo "🚀 Starting app..."
pm2 start finance-app

echo "✅ Deploy completed!"
echo "🌐 App running at: http://56.228.35.85:3000"
echo "🐘 Database: Neon PostgreSQL (persistent)"
```

### 🔧 Comandi Utili EC2
```bash
# Status app
pm2 status

# Logs in tempo reale
pm2 logs finance-app

# Restart rapido
pm2 restart finance-app

# Deploy completo (con migrations)
./deploy.sh

# Solo migrations (se necessario)
npx prisma migrate deploy
```

## 🎯 Workflow Completo per Modifiche

### 🏠 LOCALE - Sviluppo
```powershell
# 1. Modifica schema.prisma (es: aggiungi campo)
# 2. Genera migration
npx prisma migrate dev --name "add-user-phone"
# 3. Testa localmente
npm run dev
# 4. Commit tutto
git add prisma/migrations/ prisma/schema.prisma
git commit -m "Add user phone field migration"
git push origin main
```

### 🌐 PRODUZIONE - Deploy
```bash
# 1. SSH in EC2
ssh ubuntu@56.228.35.85
cd /var/www/finance-app

# 2. Deploy automatico
./deploy.sh

# Il deploy script farà automaticamente:
# - Pull delle nuove migrations da Git
# - npx prisma migrate deploy (applica solo quelle nuove)
# - Build e restart app
```

### ⚡ Vantaggi Sistema Attuale
- ✅ **Sicurezza**: `migrate deploy` non resetta mai dati
- ✅ **Sincronizzazione**: Stesso DB, migrations allineate
- ✅ **Storia**: Tracciabilità completa cambiamenti
- ✅ **Rollback**: Possibili se necessario
- ✅ **Automazione**: Deploy script gestisce tutto

## 🛡️ Sicurezza

### AWS EC2 Security Groups
- **Porta 22**: SSH (solo IP specifici)
- **Porta 80**: HTTP
- **Porta 443**: HTTPS
- **Porta 3000**: Next.js App

### Database Neon
- **SSL**: Sempre attivo (`sslmode=require`)
- **Connection Pooling**: 5 connessioni max
- **Backup**: Automatico Neon
- **Accesso**: Solo da IP autorizzati

## 📝 File Importanti NON Committati
```bash
# .gitignore principale
.env*                    # Configurazioni ambiente
dev.db*                  # File SQLite locali (residui)
node_modules/            # Dipendenze
.next/                   # Build Next.js
*.log                    # Log files

# ✅ File DA COMMITTARE:
prisma/migrations/       # SEMPRE committare (corretto!)
prisma/schema.prisma     # Schema database
```

## 🎯 Caratteristiche App
- **Multi-Account**: Isolamento dati per utente
- **Portfolio**: DCA Bitcoin + Crypto Multi-Asset  
- **Transazioni**: Income/Expenses con categorie
- **Budget**: Gestione budget fissi/illimitati
- **Conti**: Bancari e Investimento
- **Auth**: JWT con sistema login/register

## 🔧 Troubleshooting Comune

### App non si avvia su EC2
```bash
pm2 logs finance-app     # Vedi errori dettagliati
pm2 restart finance-app  # Riavvia processo
./deploy.sh              # Deploy completo
```

### Migration errors
```bash
# Stato migrations
npx prisma migrate status

# Reset solo se necessario (ATTENZIONE: cancella dati!)
npx prisma migrate reset --force

# Forza risoluzione migration specifica
npx prisma migrate resolve --applied "20250630135140_initial_migration"
```

### Database connection issues
```bash
# Test connessione
npx prisma db pull

# Regenera client
npx prisma generate

# Controlla variabili ambiente
echo $DATABASE_URL
```

### Build fail con ESLint
- **next.config.js** configurato per ignorare ESLint/TypeScript errors durante build produzione

### Git e Migrations
```bash
# Se migrations non sono tracked
git add prisma/migrations/ --force

# Verifica .gitignore non ignori migrations
grep -v "prisma/migrations" .gitignore
```

## 📊 Monitoring e Performance

### PM2 Monitoring
```bash
pm2 monit                # Dashboard interattivo
pm2 info finance-app     # Info dettagliate processo
pm2 logs finance-app --lines 100  # Ultimi 100 log
```

### Database Performance
- **Connection pooling**: Max 5 connessioni Neon
- **Query optimization**: Indici su campi frequenti
- **Backup strategy**: Automatico Neon + manual exports

## 📅 Cronologia Setup

### ✅ Giugno 2025 - Setup Migrations Completato
- **Data**: 30/06/2025 - 15:51
- **Migration iniziale**: `20250630135140_initial_migration`
- **Problema risolto**: Migrations in gitignore
- **Deploy script**: Aggiornato con `migrate deploy`
- **Workflow**: Stabilito per futuro

---
**Ultimo aggiornamento**: 30 Giugno 2025 - Setup migrations completo e testato
**Ambiente**: Database Neon condiviso, migrations attive, deploy automatizzato