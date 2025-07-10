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
- **URL**: `http://YOUR_SERVER_IP:3000`
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
DATABASE_URL="postgresql://[DB_USER]:[DB_PASSWORD]@[DB_HOST]/[DB_NAME]?sslmode=require&connection_limit=5"
JWT_SECRET="[YOUR_JWT_SECRET_HERE_MIN_32_CHARS]"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[YOUR_NEXTAUTH_SECRET_HERE]"
NODE_ENV="development"
```

### Produzione EC2 (.env)
```bash
DATABASE_URL="postgresql://[DB_USER]:[DB_PASSWORD]@[DB_HOST]/[DB_NAME]?sslmode=require&connection_limit=5"
JWT_SECRET="[YOUR_JWT_SECRET_HERE_MIN_32_CHARS]"
NEXTAUTH_URL="http://[YOUR_SERVER_IP]:3000"
NEXTAUTH_SECRET="[YOUR_NEXTAUTH_SECRET_HERE]"
NODE_ENV="production"
```

## 🚨 IMPORTANTE: Sicurezza
- **MAI** committare file .env con credenziali reali
- **MAI** includere password o chiavi segrete nella documentazione
- Utilizzare sempre placeholder nei file di esempio
- Ruotare regolarmente le credenziali
- Mantenere le credenziali in un password manager sicuro

## 🔑 Generazione Chiavi Sicure

### JWT Secret (minimo 32 caratteri)
```bash
openssl rand -base64 32
```

### NextAuth Secret
```bash
openssl rand -hex 32
```

## 📝 Checklist Pre-Deploy
- [ ] Verificare che .env NON sia tracciato su Git
- [ ] Controllare che non ci siano credenziali hardcoded nel codice
- [ ] Assicurarsi che il .gitignore sia configurato correttamente
- [ ] Testare l'applicazione in ambiente locale
- [ ] Verificare che le migrazioni siano aggiornate

## 🛠️ Comandi Utili

### Sviluppo
```bash
npm run dev          # Avvia in modalità development
npm run build        # Build per produzione
npm run start        # Avvia build di produzione
```

### Database
```bash
npx prisma migrate dev     # Crea e applica migrations (dev)
npx prisma migrate deploy  # Applica migrations (prod)
npx prisma studio         # GUI per esplorare il database
```

### PM2 (Produzione)
```bash
pm2 start npm --name "snp-finance" -- start
pm2 logs snp-finance
pm2 restart snp-finance
pm2 stop snp-finance
```

## 📚 Risorse
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Neon PostgreSQL](https://neon.tech/docs)