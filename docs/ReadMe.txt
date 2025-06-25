# SNP-FIN: Enhanced Cash Flow Investment Tracker

A comprehensive Next.js investment tracking application featuring **Enhanced Cash Flow Logic** for clear, unified portfolio management across DCA Bitcoin and multi-asset crypto portfolios.

## 🎯 Key Features

### 💰 Enhanced Cash Flow Tracking
- **Clear Risk Assessment**: Track exactly how much money is still "at risk" vs recovered
- **Unified Logic**: Same calculation methodology for all portfolio types
- **Realistic Profit Tracking**: Separate realized profits (from sales) vs unrealized profits (potential)
- **Recovery Tracking**: Know when your investment has been "paid back"

### 📊 Portfolio Management
- **DCA Bitcoin Portfolios**: Dollar-cost averaging with network fee tracking
- **Crypto Wallet Portfolios**: Multi-asset wallets with unified tracking
- **Account Integration**: Investment account breakdowns with Enhanced metrics
- **Real-time Updates**: Live Bitcoin price integration for current valuations

### 🔍 Data Integrity & Consistency
- **Cross-page Validation**: Same metrics displayed consistently everywhere
- **Type Safety**: Robust TypeScript implementation with error prevention
- **Performance Optimized**: Smart caching and memoization for fast updates

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/snp-fin.git
cd snp-fin

# Install dependencies
npm install
# or
yarn install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Run database migrations
npx prisma migrate dev
# or
npx prisma db push

# Start development server
npm run dev
# or
yarn dev
```

### First Run
1. Open [http://localhost:3000](http://localhost:3000)
2. Create your first investment account
3. Add a DCA Bitcoin or Crypto Wallet portfolio
4. Start tracking your investments with Enhanced Cash Flow logic!

## 🏗️ Enhanced Cash Flow Logic

### Core Concepts
```
totalInvested = Sum of all BUY transactions (never changes)
capitalRecovered = Sum of all SELL transactions
effectiveInvestment = Money still "at risk" (totalInvested - capitalRecovered)
realizedProfit = Profit only after full capital recovery
unrealizedProfit = Current value minus effective investment
```

### Example Scenario
```
Investment: 1000€ → Current Value: 1500€ → Sold: 600€

Enhanced Breakdown:
✅ Total Invested: 1000€ (historical total)
✅ Capital Recovered: 600€ (from sales)
✅ Effective Investment: 400€ (still at risk)
✅ Realized Profit: 0€ (haven't recovered full investment yet)
✅ Unrealized Profit: 1100€ (1500€ current - 400€ at risk)
✅ Total ROI: +110% ((0€ + 1100€) / 1000€)
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # Backend API routes
│   │   ├── accounts/           # Account management
│   │   ├── dca-portfolios/     # DCA Bitcoin portfolio APIs
│   │   └── crypto-portfolios/  # Crypto wallet portfolio APIs
│   ├── investments/            # Investment tracking pages
│   │   ├── page.tsx           # Portfolio overview with Enhanced stats
│   │   ├── [id]/              # DCA portfolio details
│   │   └── crypto-portfolio/  # Crypto wallet details
│   ├── accounts/              # Account management pages
│   └── components/            # Reusable UI components
├── docs/                      # Documentation
│   ├── EnhancedCashFlowLogic.txt      # Core logic documentation
│   ├── ProjectStatus.txt              # Implementation status
│   └── DeveloperQuickReference.txt    # Developer guide
└── prisma/                    # Database schema and migrations
```

## 🧪 Testing & Validation

The application includes comprehensive test scenarios with real portfolio data:

### Test Portfolio: testbtc (DCA Bitcoin)
- **Investment**: 0.01 BTC for 500€
- **Sale**: 0.005 BTC for 400€
- **Network Fee**: 1000 sats
- **Holdings**: 0.0049 BTC (net after fees)
- **Expected ROI**: +70.68% (validated across all pages)

### Test Portfolio: testcrypto (Crypto Wallet)
- **Investment**: 2 SOL for 50€
- **Sale**: 1 SOL for 110€
- **Holdings**: 1 SOL
- **Expected ROI**: +170.00% (validated across all pages)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with adaptive theming
- **Icons**: Heroicons
- **Deployment**: Vercel-ready configuration

## 🔧 Development Guidelines

### Enhanced Cash Flow Pattern
```javascript
// Always use Enhanced stats from backend
const enhancedStats = calculateEnhancedStats(transactions)

// Type-safe portfolio determination
const isCryptoWallet = cryptoPortfolios.includes(portfolio)

// Safe current value calculation
const currentValue = isCryptoWallet 
  ? (portfolio.stats.totalValueEur || 0)
  : getDCACurrentValue(portfolio)

// Enhanced ROI calculation
const totalROI = totalInvested > 0 ? 
  ((realizedProfit + unrealizedProfit) / totalInvested) * 100 : 0
```

### Safety Checks
- Always validate portfolio types before calculations
- Use `Math.max(0, ...)` to prevent negative values
- Implement null-safe calculations with `|| 0` fallbacks
- Add `useMemo` for expensive calculations

## 📊 Features in Detail

### Investment Tracking
- **Multi-portfolio Support**: DCA Bitcoin and Crypto Wallets
- **Enhanced Cash Flow Metrics**: Clear risk vs recovery tracking
- **Real-time Valuations**: Current market price integration
- **Historical Analysis**: Complete transaction history with context

### Account Management
- **Investment Account Breakdowns**: Enhanced metrics per account
- **Cross-portfolio Aggregation**: Unified view across all investments
- **Unknown Funds Tracking**: Identify non-tracked account balances
- **Transfer Management**: Inter-account transfer tracking

### User Experience
- **Consistent Interface**: Same calculations displayed everywhere
- **Performance Optimized**: Fast loading with smart caching
- **Type-Safe**: Robust error prevention and validation
- **Responsive Design**: Works across desktop and mobile devices

## 🚀 Deployment

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Bitcoin Price API (optional)
BITCOIN_API_URL="https://api.example.com"

# App Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Run database migrations in production
```

## 📚 Documentation

- **[Enhanced Cash Flow Logic](docs/EnhancedCashFlowLogic.txt)**: Core system documentation
- **[Project Status](docs/ProjectStatus.txt)**: Implementation status and validation
- **[Developer Quick Reference](docs/DeveloperQuickReference.txt)**: Development patterns and best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the Enhanced Cash Flow patterns documented in `/docs`
4. Ensure all tests pass and calculations are consistent
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Principles
- **Enhanced Cash Flow First**: All new features must use Enhanced logic
- **Type Safety**: Maintain comprehensive TypeScript coverage
- **Cross-page Consistency**: Validate same calculations everywhere
- **Performance**: Use memoization for expensive operations

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Status

**✅ PRODUCTION READY**
- Enhanced Cash Flow Logic: ✅ Implemented and Validated
- Cross-page Consistency: ✅ 100% Verified
- Test Cases: ✅ All Passing
- Type Safety: ✅ Comprehensive Coverage
- Performance: ✅ Optimized

---

**Built with ❤️ for clear, honest investment tracking**