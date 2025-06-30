# SNP Finance App - Setup Guide

## 🏗️ Architettura

- **Frontend**: Next.js 15 con TypeScript
- **Database**: PostgreSQL Neon (CONDIVISO tra dev e prod)
- **Deploy**: AWS EC2 Ubuntu con PM2
- **Auth**: JWT con bcrypt

## 🌍 Ambienti

### 🏠 Sviluppo Locale (VSCode Windows)
- **Database**: Neon PostgreSQL (stesso di produzione)
- **URL**: `http://localhost:3000`
- **Node**: `development`

### 🌐 Produzione (EC2 AWS)
- **Database**: Neon PostgreSQL (stesso di sviluppo)
- **URL**: `http://56.228.35.85:3000`
- **Node**: `production`
- **PM2**: Auto-restart e gestione processi

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

## 🔄 Database Migrations

### Setup
- **Prisma Migrations**: Attivate per gestione sicura cambiamenti
- **Database condiviso**: Una migration vale per entrambi gli ambienti
- **Folder**: `prisma/migrations/` (committato su Git)

### Workflow Sviluppo
```bash
# 1. Modifica schema.prisma
# 2. Crea migration
npx prisma migrate dev --name "descrizione-modifica"
# 3. Commit e push
git add prisma/migrations/
git commit -m "Add: descrizione modifica"
git push origin main
```

### Deploy Produzione
```bash
# Script automatico
./deploy.sh
# Include: npx prisma migrate deploy
```

## 🚀 Deploy Process

### Script Deploy (/var/www/finance-app/deploy.sh)
```bash
#!/bin/bash
echo "🚀 Deploying Finance App with Neon DB..."
cd /var/www/finance-app
pm2 stop finance-app
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy  # Applica migrations sicure
npm run build
pm2 start finance-app
echo "✅ Deploy completed!"
```

### Comandi Utili EC2
```bash
# Status app
pm2 status

# Logs
pm2 logs finance-app

# Restart
pm2 restart finance-app

# Deploy completo
./deploy.sh
```

## 🛡️ Sicurezza

### AWS EC2 Security Groups
- **Porta 22**: SSH
- **Porta 80**: HTTP
- **Porta 443**: HTTPS
- **Porta 3000**: Next.js App

### Database Neon
- **SSL**: Sempre attivo
- **Connection Pooling**: 5 connessioni max
- **Backup**: Automatico Neon

## 📝 File Importanti NON Committati
- `.env` (configurazioni ambiente)
- `dev.db*` (file SQLite locali - non usati)
- `node_modules/`
- `.next/`

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
pm2 logs finance-app  # Vedi errori
pm2 restart finance-app  # Riavvia
```

### Database migration fail
```bash
npx prisma migrate status  # Stato migrations
npx prisma migrate resolve --applied "migration_name"  # Forza risoluzione
```

### Build fail con ESLint
- **next.config.js** configurato per ignorare ESLint/TypeScript errors durante build produzione

---
**Ultimo aggiornamento**: Setup completato con database condiviso Neon e migrations attive