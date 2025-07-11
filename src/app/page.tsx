'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CurrencyEuroIcon, ChartPieIcon, BanknotesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { ColorSettingsModal } from '@/components/dashboard/ColorSettingsModal';
import { PatrimonyColorModal } from '@/components/dashboard/PatrimonyColorModal';
import { LiquidityColorModal } from '@/components/dashboard/LiquidityColorModal';
import FinanceNewsTickerBar from '@/components/dashboard/FinanceNewsTickerBar';

// Interfaces
interface BitcoinPrice {
  btcPrice: number;
  currency: string;
  cached: boolean;
  timestamp: string;
}

interface Account {
  id: number;
  name: string;
  type: 'bank' | 'investment';
  balance: number;
}

interface Portfolio {
  id: number;
  name: string;
  type: 'dca_bitcoin' | 'crypto_wallet';
  stats: {
    totalInvested?: number;
    capitalRecovered?: number;
    effectiveInvestment?: number;
    realizedProfit?: number;
    stakeRewards?: number;
    isFullyRecovered?: boolean;
    totalValueEur?: number;
    netBTC?: number;
    totalBTC?: number;
    totalROI?: number;
  };
}

interface Budget {
  id: number;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  color: string;
}

interface Transaction {
  id: number;
  description?: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
}

interface EnhancedCashFlow {
  totalInvested: number;
  capitalRecovered: number;
  effectiveInvestment: number;
  realizedProfit: number;
  isFullyRecovered: boolean;
}

interface DashboardTotals {
  bankLiquidity: number;
  investmentLiquidity: number;
  holdingsValue: number;
  totalPatrimony: number;
  nonCurrentAssets: number;
  credits: number;
  liquiditaBancaria: number; // bankLiquidity - riservaTasse
}

interface PartitaIVAGlobalStats {
  totali: {
    entrate: number;
    imponibile: number;
    imposta: number;
    contributi: number;
    tasseDovute: number;
    tassePagate: number;
    saldoTasse: number;
    percentualeTasse: number;
  };
  conteggi: {
    numeroFatture: number;
    numeroPagamenti: number;
    anniAttivi: number;
  };
  riepilogo: {
    haEntrate: boolean;
    haPagamenti: boolean;
    inRegola: boolean;
    importoDaRiservare: number;
  };
}

interface NonCurrentAsset {
  id: number;
  name: string;
  description?: string;
  value: number;
}

interface Credit {
  id: number;
  name: string;
  description?: string;
  amount: number;
}

interface DashboardData {
  accounts: Account[];
  investments: Portfolio[];
  budgets: Budget[];
  budgetTotals: { totalLiquidity: number; totalAllocated: number };
  transactions: Transaction[];
  enhancedCashFlow: EnhancedCashFlow | null;
  totals: DashboardTotals;
  partitaIVAStats: PartitaIVAGlobalStats | null;
  nonCurrentAssets: NonCurrentAsset[];
  credits: Credit[];
}

interface AllocationDataItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface BudgetBreakdownItem {
  name: string;
  allocated: number;
  target: number;
  percentage: number;
  color: string;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null);
  const [showColorSettings, setShowColorSettings] = useState<boolean>(false);
  const [showPatrimonyColors, setShowPatrimonyColors] = useState<boolean>(false);
  const [showLiquidityColors, setShowLiquidityColors] = useState<boolean>(false);
  const [chartColors, setChartColors] = useState(() => {
    const defaultColors = {
      fondiDisponibili: '#22D3EE',
      contiInvestimento: '#A855F7',
      holdingsInvestimenti: '#F59E0B',
      // Colori per il grafico patrimonio
      contiBancari: '#3B82F6',
      contiInvestimentoPatr: '#8B5CF6',
      assets: '#F59E0B',
      beniNonCorrenti: '#10B981',
      crediti: '#EF4444'
    };
    
    // Carica i colori salvati dal localStorage o usa i default
    if (typeof window !== 'undefined') {
      const savedColors = localStorage.getItem('dashboardChartColors');
      if (savedColors) {
        try {
          const parsed = JSON.parse(savedColors);
          // Verifica che tutti i colori necessari siano presenti
          return {
            ...defaultColors,
            ...parsed
          };
        } catch (e) {
          console.error('Errore nel parsing dei colori salvati:', e);
          localStorage.removeItem('dashboardChartColors'); // Rimuovi dati corrotti
        }
      }
    }
    return defaultColors;
  });
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    accounts: [],
    investments: [],
    budgets: [],
    budgetTotals: { totalLiquidity: 0, totalAllocated: 0 },
    transactions: [],
    enhancedCashFlow: null,
    totals: {
      bankLiquidity: 0,
      investmentLiquidity: 0,
      holdingsValue: 0,
      totalPatrimony: 0,
      nonCurrentAssets: 0,
      credits: 0,
      liquiditaBancaria: 0
    },
    partitaIVAStats: null,
    nonCurrentAssets: [],
    credits: []
  });

  // Format functions
  const formatCurrencyWithUserCurrency = (amount: number): string => {
    return formatCurrency(amount, user?.currency || 'EUR');
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // ✅ NUOVO: Fetch Bitcoin price
  const fetchBitcoinPrice = async (): Promise<void> => {
    try {
      console.log('🔄 Fetching Bitcoin price...');
      const response = await fetch('/api/bitcoin-price');
      if (response.ok) {
        const data: BitcoinPrice = await response.json();
        setBtcPrice(data);
        console.log('🟠 Bitcoin Price loaded:', data.btcPrice, data.currency);
      } else {
        console.error('❌ Bitcoin price fetch failed:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching Bitcoin price:', error);
    }
  };

  // ✅ NUOVO: DCA Current Value Calculator (same as investments page)
  const getDCACurrentValue = (portfolio: Portfolio, btcPrice: BitcoinPrice | null): number => {
    console.log(`🔍 getDCACurrentValue called for ${portfolio.name}:`, {
      type: portfolio.type,
      netBTC: portfolio.stats?.netBTC,
      totalBTC: portfolio.stats?.totalBTC,
      btcPriceAvailable: !!btcPrice?.btcPrice
    });
    
    if (portfolio.type !== 'dca_bitcoin' && !portfolio.stats?.totalBTC && !portfolio.stats?.netBTC) {
      console.log(`❌ Portfolio ${portfolio.name} skipped: not DCA bitcoin and no BTC stats`);
      return 0;
    }
    
    if (!btcPrice?.btcPrice) {
      console.warn(`❌ Bitcoin price not available for DCA calculation for ${portfolio.name}`);
      return 0;
    }
    
    // Priority: netBTC (includes network fees)
    if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
      const value = portfolio.stats.netBTC * btcPrice.btcPrice;
      console.log(`✅ DCA ${portfolio.name}: €${value} (netBTC: ${portfolio.stats.netBTC})`);
      return value;
    }
    
    // Fallback: totalBTC (may not include network fees)
    if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
      const value = portfolio.stats.totalBTC * btcPrice.btcPrice;
      console.log(`✅ DCA ${portfolio.name}: €${value} (totalBTC: ${portfolio.stats.totalBTC})`);
      return value;
    }
    
    console.log(`❌ No BTC stats found for ${portfolio.name}`);
    return 0;
  };

  useEffect(() => {
    // Only load data if user is authenticated
    if (!user || authLoading) {
      return;
    }
    
    // Load dashboard data and Bitcoin price in parallel
    const loadData = async () => {
      // Start both fetches in parallel
      const dataPromise = loadDashboardData();
      const pricePromise = fetchBitcoinPrice();
      
      // Wait for both to complete
      await Promise.all([dataPromise, pricePromise]);
    };
    
    loadData();
  }, [user, authLoading]);

  // ✅ FIX: Ricarica dati quando arriva il prezzo Bitcoin
  useEffect(() => {
    if (btcPrice && user && !authLoading) {
      // Recalculate dashboard data with Bitcoin price
      loadDashboardData();
    }
  }, [btcPrice, user, authLoading]);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setDataLoading(true); // Show data loading state
      console.log('🔄 Loading dashboard data, btcPrice available:', !!btcPrice);
      
      // 🚀 PERFORMANCE: Single unified API call instead of 8 separate calls
      const dashboardRes = await fetch('/api/dashboard');
      
      if (!dashboardRes.ok) {
        const errorText = await dashboardRes.text();
        console.error('Dashboard API Error:', dashboardRes.status, errorText);
        throw new Error(`Dashboard API failed: ${dashboardRes.status} - ${errorText}`);
      }
      
      const dashboardData = await dashboardRes.json();
      
      // Extract data from unified response
      const accounts: Account[] = dashboardData.accounts || [];
      const dcaPortfolios: Portfolio[] = dashboardData.portfolios?.dca || [];
      const cryptoPortfolios: Portfolio[] = dashboardData.portfolios?.crypto || [];
      const budgets: Budget[] = dashboardData.budgets || [];
      const transactions: Transaction[] = dashboardData.transactions || [];
      const partitaIVAStats: PartitaIVAGlobalStats | null = dashboardData.partitaIVA;
      const nonCurrentAssets: NonCurrentAsset[] = dashboardData.nonCurrentAssets || [];
      const credits: Credit[] = dashboardData.credits || [];

      // 📊 AGGIUNTA: Fetch entrate Partita IVA per le transazioni recenti
      let partitaIVAIncomes: Transaction[] = [];
      try {
        const pivaRes = await fetch('/api/partita-iva/income');
        if (pivaRes.ok) {
          const pivaData = await pivaRes.json();
          // Trasforma le entrate partita IVA in formato Transaction
          partitaIVAIncomes = pivaData.slice(0, 5).map((income: any) => ({
            id: income.id,
            description: income.riferimento || 'Fattura Partita IVA',
            amount: income.entrata,
            date: income.dataIncasso,
            type: 'income' as const
          }));
        }
      } catch (error) {
        console.log('Partita IVA incomes not available:', error);
      }

      // Combina transazioni regolari e partita IVA
      const allTransactions = [...transactions, ...partitaIVAIncomes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10); // Prendiamo le 10 più recenti

      // Use precalculated totals from unified API
      const budgetTotals = {
        totalLiquidity: dashboardData.totals?.bankLiquidity || 0,
        totalAllocated: dashboardData.totals?.budgetAllocated || 0
      };

      // ✅ DEBUG: Dashboard unified response
      console.log('🚀 Dashboard unified data loaded:', dashboardData.meta?.timestamp);
      console.log('🏦 Budget Totals:', budgetTotals);

      // 🚀 PERFORMANCE: Use precalculated totals from unified API
      const bankLiquidity = dashboardData.totals?.bankLiquidity || 0;
      const investmentLiquidity = dashboardData.totals?.investmentLiquidity || 0;

      // ✅ FIX: Calculate holdings value using same logic as investments page
      let holdingsValue = 0;
      
      // Calculate crypto portfolios value
      const cryptoValue = cryptoPortfolios.reduce((sum: number, portfolio: Portfolio) => {
        const value = portfolio.stats?.totalValueEur || 0;
        console.log(`🚀 Crypto ${portfolio.name}: €${value} (from backend)`);
        return sum + value;
      }, 0);
      
      // Calculate DCA portfolios value - only if btcPrice is available
      const dcaValue = btcPrice ? dcaPortfolios.reduce((sum: number, portfolio: Portfolio) => {
        const value = getDCACurrentValue(portfolio, btcPrice);
        console.log(`🟠 DCA ${portfolio.name}: €${value} (calculated with BTC price)`);
        return sum + value;
      }, 0) : 0;
      
      if (!btcPrice && dcaPortfolios.length > 0) {
        console.log('⚠️ DCA portfolios found but Bitcoin price not available yet');
      }
      
      holdingsValue = cryptoValue + dcaValue;

      console.log(`🎯 Total Holdings Value: €${holdingsValue} (crypto: €${cryptoValue}, dca: €${dcaValue})`);
      
      // 🚀 PERFORMANCE: Use precalculated totals from unified API
      const totalNonCurrentAssets = dashboardData.totals?.totalNonCurrentAssets || 0;
      const totalCredits = dashboardData.totals?.totalCredits || 0;
      
      // ✅ NUOVO: Calcola Riserva Tasse dai budget
      const riservaTasse = budgets.find(budget => 
        ['RISERVA TASSE', 'Riserva Tasse'].includes(budget.name)
      )?.allocatedAmount || 0;
      
      // ✅ NUOVO: Liquidità bancaria effettiva (senza riserva tasse)
      const liquiditaBancaria = bankLiquidity - riservaTasse;

      // ✅ NUOVO: Calculate Enhanced Cash Flow totals - UNIFICATO
      const allPortfolios: Portfolio[] = [...cryptoPortfolios, ...dcaPortfolios];
      const enhancedCashFlow: EnhancedCashFlow | null = allPortfolios.length > 0 ? {
        totalInvested: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.totalInvested || 0), 0),
        capitalRecovered: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.capitalRecovered || 0), 0),
        effectiveInvestment: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.effectiveInvestment || 0), 0),
        realizedProfit: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.realizedProfit || 0), 0),
        isFullyRecovered: allPortfolios.every((p: Portfolio) => p.stats?.isFullyRecovered || false)
      } : null;

      // ✅ NUOVO: Calcolo patrimonio con 5 componenti
      const totalPatrimony = liquiditaBancaria + investmentLiquidity + holdingsValue + totalNonCurrentAssets + totalCredits;

      setDashboardData({
        accounts,
        investments: [...cryptoPortfolios, ...dcaPortfolios],
        budgets,
        budgetTotals,
        transactions: allTransactions.slice(0, 5),
        enhancedCashFlow,
        totals: {
          bankLiquidity,
          investmentLiquidity,
          holdingsValue,
          totalPatrimony,
          nonCurrentAssets: totalNonCurrentAssets,
          credits: totalCredits,
          liquiditaBancaria
        },
        partitaIVAStats,
        nonCurrentAssets,
        credits
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setDataLoading(false);
    }
  };

  // ✅ CORREZIONE: Calculate budget summary usando i campi corretti
  const budgetSummary = dashboardData.budgetTotals?.totalAllocated > 0 ? {
    total: dashboardData.budgetTotals.totalLiquidity,
    allocated: dashboardData.budgetTotals.totalAllocated
  } : (Array.isArray(dashboardData.budgets) ? dashboardData.budgets : []).reduce((acc: { total: number; allocated: number }, budget: Budget) => {
    // 🔧 FIX: Usa targetAmount e allocatedAmount invece di amount/currentAmount
    const budgetTarget = budget.targetAmount || 0;
    const budgetAllocated = budget.allocatedAmount || 0;
    
    console.log(`🏦 Budget "${budget.name}":`, {
      targetAmount: budget.targetAmount,
      allocatedAmount: budget.allocatedAmount,
      budget
    });
    
    acc.total += budgetTarget;
    acc.allocated += budgetAllocated;
    return acc;
  }, { total: 0, allocated: 0 });

  console.log('💰 Budget Summary Final:', budgetSummary);

  // ✅ NUOVO: Allocation data dettagliata con budget individuali
  const allocationData: AllocationDataItem[] = useMemo(() => {
    const data: AllocationDataItem[] = [];
    const totalPatrimony = dashboardData.totals.totalPatrimony;
    
    // Budget individuali
    if (Array.isArray(dashboardData.budgets)) {
      dashboardData.budgets.forEach((budget: Budget) => {
        if (budget.allocatedAmount > 0) {
          data.push({
            name: budget.name,
            value: budget.allocatedAmount,
            color: budget.color || '#3B82F6',
            percentage: totalPatrimony > 0 ? (budget.allocatedAmount / totalPatrimony) * 100 : 0
          });
        }
      });
    }
    
    // Fondi disponibili (liquidità bancaria non allocata nei budget)
    const totalBudgetAllocated = budgetSummary.allocated || 0;
    const availableFunds = Math.max(0, dashboardData.totals.bankLiquidity - totalBudgetAllocated);
    if (availableFunds > 0) {
      data.push({
        name: 'Fondi Disponibili',
        value: availableFunds,
        color: chartColors.fondiDisponibili,
        percentage: totalPatrimony > 0 ? (availableFunds / totalPatrimony) * 100 : 0
      });
    }
    
    // Conti di investimento
    if (dashboardData.totals.investmentLiquidity > 0) {
      data.push({
        name: 'Conti Investimento',
        value: dashboardData.totals.investmentLiquidity,
        color: chartColors.contiInvestimento,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.investmentLiquidity / totalPatrimony) * 100 : 0
      });
    }
    
    // Holdings investimenti
    if (dashboardData.totals.holdingsValue > 0) {
      data.push({
        name: 'Holdings Investimenti',
        value: dashboardData.totals.holdingsValue,
        color: chartColors.holdingsInvestimenti,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.holdingsValue / totalPatrimony) * 100 : 0
      });
    }
    
    // Ordina per importo decrescente
    return data.sort((a, b) => b.value - a.value);
  }, [dashboardData, budgetSummary, chartColors]);

  // ✅ NUOVO: Patrimonio data per grafico
  const patrimonioData = useMemo(() => {
    const data = [];
    const totalPatrimony = dashboardData.totals.totalPatrimony;
    
    // Liquidità Bancaria (senza riserva tasse)
    if (dashboardData.totals.liquiditaBancaria > 0) {
      data.push({
        name: 'Conti Bancari - Tasse',
        value: dashboardData.totals.liquiditaBancaria,
        color: chartColors.contiBancari,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.liquiditaBancaria / totalPatrimony) * 100 : 0
      });
    }
    
    // Conti Investimento
    if (dashboardData.totals.investmentLiquidity > 0) {
      data.push({
        name: 'Conti Investimento',
        value: dashboardData.totals.investmentLiquidity,
        color: chartColors.contiInvestimentoPatr,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.investmentLiquidity / totalPatrimony) * 100 : 0
      });
    }
    
    // Assets (Holdings Investimenti)
    if (dashboardData.totals.holdingsValue > 0) {
      data.push({
        name: 'Assets',
        value: dashboardData.totals.holdingsValue,
        color: chartColors.assets,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.holdingsValue / totalPatrimony) * 100 : 0
      });
    }
    
    // Beni Non Correnti
    if (dashboardData.totals.nonCurrentAssets > 0) {
      data.push({
        name: 'Beni Non Correnti',
        value: dashboardData.totals.nonCurrentAssets,
        color: chartColors.beniNonCorrenti,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.nonCurrentAssets / totalPatrimony) * 100 : 0
      });
    }
    
    // Crediti
    if (dashboardData.totals.credits > 0) {
      data.push({
        name: 'Crediti',
        value: dashboardData.totals.credits,
        color: chartColors.crediti,
        percentage: totalPatrimony > 0 ? (dashboardData.totals.credits / totalPatrimony) * 100 : 0
      });
    }
    
    // Ordina per valore decrescente
    return data.sort((a, b) => b.value - a.value);
  }, [dashboardData, chartColors]);

  // ✅ CORREZIONE: Calculate budget breakdown con campi corretti
  const budgetBreakdown: BudgetBreakdownItem[] = Array.isArray(dashboardData.budgets) ? 
    dashboardData.budgets.map((budget: Budget) => {
      // 🔧 FIX: Usa targetAmount e allocatedAmount invece di amount/currentAmount
      const target = budget.targetAmount || 0;
      const allocated = budget.allocatedAmount || 0;
      
      console.log(`📊 Budget Breakdown for "${budget.name}":`, { target, allocated, budget });
      
      return {
        name: budget.name,
        allocated: allocated,
        target: target,
        percentage: target > 0 ? (allocated / target) * 100 : 0,
        color: budget.color || '#3B82F6'
      };
    }) : [];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-adaptive-600">
              {dataLoading ? "⚡ Aggiornamento dati..." : "📊 Caricamento dashboard..."}
            </div>
            <div className="text-adaptive-500 text-sm">
              🚀 Ottimizzazioni performance attive
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Finance News Ticker - ALLINEATO AL CONTENUTO */}
          <FinanceNewsTickerBar className="mb-8" />
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-adaptive-900">Dashboard</h1>
            <p className="text-adaptive-600 mt-1">Panoramica completa del tuo patrimonio</p>
          </div>

          {/* Patrimonio Totale con Grafico */}
          <div className="rounded-xl p-8 text-white mb-8 shadow-lg" style={{
            background: 'linear-gradient(to right, oklch(0.35 0.1 265.43), oklch(0.24 0.06 265.97))'
          }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Informazioni Patrimonio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold opacity-90">💎 Patrimonio Totale</h2>
                  <button
                    onClick={() => setShowPatrimonyColors(true)}
                    className="text-sm text-white hover:text-white flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                    title="Personalizza colori patrimonio"
                  >
                    🎨 Colori
                  </button>
                </div>
                <p className="text-4xl font-bold mt-2">{formatCurrencyWithUserCurrency(dashboardData.totals.totalPatrimony)}</p>
                <div className="flex items-center mt-2 text-white mb-4">
                  <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
                  <span>Aggiornato in tempo reale</span>
                </div>
                
                {/* Riepilogo componenti */}
                <div className="space-y-2 text-sm">
                  {patrimonioData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-white">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{formatCurrencyWithUserCurrency(item.value)}</div>
                        <div className="text-white text-xs opacity-90">{formatPercentage(item.percentage)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Grafico Patrimonio */}
              <div className="flex justify-center">
                {patrimonioData.length > 0 ? (
                  <div className="w-64 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={patrimonioData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {patrimonioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">💎</div>
                      <div>Nessun dato disponibile</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Liquidità Overview - Seconda Riga */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/accounts">
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-info-adaptive rounded-lg">
                    <BanknotesIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-blue-600 text-2xl">🏦</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Conti Bancari</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrencyWithUserCurrency(dashboardData.totals.bankLiquidity)}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-adaptive-600">
                    {dashboardData.accounts.filter(acc => acc.type === 'bank').length} conti bancari
                  </p>
                  {(() => {
                    // Calcola riserva tasse dai budget
                    const riservaTasse = dashboardData.budgets.find(budget => 
                      ['RISERVA TASSE', 'Riserva Tasse', 'riserva tasse'].includes(budget.name)
                    )?.allocatedAmount || 0;
                    
                    // Mostra netto solo se c'è una riserva tasse significativa (>50€)
                    const shouldShowNetto = riservaTasse > 50;
                    
                    return shouldShowNetto ? (
                      <p className="text-xs font-extrabold text-adaptive-700">
                        Netto: {formatCurrencyWithUserCurrency(dashboardData.totals.liquiditaBancaria)}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            </Link>

            <Link href="/accounts">
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ChartPieIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-purple-600 text-2xl">📈</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Conti Investimento</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrencyWithUserCurrency(dashboardData.totals.investmentLiquidity)}
                </p>
                <p className="text-sm text-adaptive-600">
                  {dashboardData.accounts.filter(acc => acc.type === 'investment').length} conti investimento
                </p>
              </div>
            </Link>

            <Link href="/investments">
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-green-600 text-2xl">💎</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Assets</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrencyWithUserCurrency(dashboardData.totals.holdingsValue)}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-adaptive-600">{dashboardData.investments.length} portfolio attivi</p>
                  {(() => {
                    // Calcola ROI% totale da tutti i portfolio
                    const totalROI = dashboardData.investments.reduce((sum, portfolio) => {
                      const roi = portfolio.stats?.totalROI || 0
                      return sum + roi
                    }, 0)
                    const avgROI = dashboardData.investments.length > 0 ? totalROI / dashboardData.investments.length : 0
                    const roiColor = avgROI >= 0 ? 'text-green-600' : 'text-red-600'
                    const roiIcon = avgROI >= 0 ? '📈' : '📉'
                    
                    return (
                      <p className={`text-base font-semibold ${roiColor}`}>
                        {roiIcon} {avgROI.toFixed(1)}%
                      </p>
                    )
                  })()}
                </div>
              </div>
            </Link>

            {/* Widget Partita IVA */}
            {dashboardData.partitaIVAStats && dashboardData.partitaIVAStats.riepilogo.haEntrate && (
              <Link href="/partita-iva">
                <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 ${dashboardData.partitaIVAStats.riepilogo.inRegola ? 'bg-green-100' : 'bg-red-100'} rounded-lg`}>
                      <CurrencyEuroIcon className={`w-6 h-6 ${dashboardData.partitaIVAStats.riepilogo.inRegola ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className={`text-2xl ${dashboardData.partitaIVAStats.riepilogo.inRegola ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.partitaIVAStats.riepilogo.inRegola ? '✅' : '⚠️'}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-adaptive-900">Tasse da Pagare</h3>
                  <p className={`text-2xl font-bold ${dashboardData.partitaIVAStats.riepilogo.inRegola ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyWithUserCurrency(dashboardData.partitaIVAStats.totali.saldoTasse)}
                  </p>
                  <p className="text-sm text-adaptive-600">
                    {dashboardData.partitaIVAStats.riepilogo.inRegola ? 'In regola' : 'Da pagare'} • {dashboardData.partitaIVAStats.conteggi.anniAttivi} anni attivi
                  </p>
                </div>
              </Link>
            )}
          </div>
          {/* Enhanced Cash Flow - Terza Riga */}
          {dashboardData.enhancedCashFlow && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CurrencyEuroIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="text-gray-600 text-xl">💰</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Totale Investito</h3>
                <p className="text-2xl font-bold text-adaptive-900">
                  {formatCurrencyWithUserCurrency(dashboardData.enhancedCashFlow.totalInvested)}
                </p>
                <p className="text-sm text-adaptive-600">Storico investimenti</p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-info-adaptive rounded-lg">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-blue-600 text-xl">🔄</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Capitale Recuperato</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrencyWithUserCurrency(dashboardData.enhancedCashFlow.capitalRecovered)}
                </p>
                <p className="text-sm text-adaptive-600">
                  {dashboardData.enhancedCashFlow.totalInvested > 0 ? 
                    `${((dashboardData.enhancedCashFlow.capitalRecovered / dashboardData.enhancedCashFlow.totalInvested) * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-orange-600 text-xl">⚠️</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Capitale a Rischio</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrencyWithUserCurrency(dashboardData.enhancedCashFlow.effectiveInvestment)}
                </p>
                <p className="text-sm text-adaptive-600">
                  {dashboardData.enhancedCashFlow.isFullyRecovered ? '🎉 Investimento gratis!' : 'Non ancora recuperato'}
                </p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ChartPieIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-green-600 text-xl">🎯</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Profitto Realizzato</h3>
                <p className={`text-2xl font-bold ${dashboardData.enhancedCashFlow.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrencyWithUserCurrency(dashboardData.enhancedCashFlow.realizedProfit)}
                </p>
                <p className="text-sm text-adaptive-600">Solo vendite realizzate</p>
              </div>
            </div>
          )}



          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Allocazione Patrimonio */}
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-adaptive-900">💰 Liquidità + Assets</h3>
                  <p className="text-sm text-adaptive-600">
                    Totale: {formatCurrencyWithUserCurrency(allocationData.reduce((sum, item) => sum + item.value, 0))}
                  </p>
                </div>
                <button
                  onClick={() => setShowLiquidityColors(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Personalizza colori liquidità"
                >
                  🎨 Colori
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Pie Chart */}
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {allocationData.map((entry: AllocationDataItem, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {allocationData.map((item: AllocationDataItem, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-adaptive-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-adaptive-900">
                          {formatCurrencyWithUserCurrency(item.value)}
                        </div>
                        <div className="text-xs text-adaptive-500">
                          {formatPercentage(item.percentage)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Overview */}
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-adaptive-900">🎯 Budget Overview</h3>
                <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-700">
                  Gestisci →
                </Link>
              </div>
              
              <div className="space-y-4">
                {budgetBreakdown.slice(0, 4).map((budget: BudgetBreakdownItem, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: budget.color }}
                          />
                          <span className="text-sm font-medium text-adaptive-900">{budget.name}</span>
                        </div>
                        <span className="text-sm text-adaptive-600">
                          {formatCurrencyWithUserCurrency(budget.allocated)} / {formatCurrencyWithUserCurrency(budget.target)}
                        </span>
                      </div>
                      <div className="w-full bg-adaptive-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(budget.percentage, 100)}%`,
                            backgroundColor: budget.color 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {budgetBreakdown.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-adaptive-500">Nessun budget configurato</p>
                    <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-700">
                      Crea il primo budget →
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Summary Budget */}
              {budgetBreakdown.length > 0 && (
                <div className="mt-4 pt-4 border-t border-adaptive">
                  <div className="flex justify-between text-sm">
                    <span className="text-adaptive-700">Totale Allocato:</span>
                    <span className="font-semibold text-adaptive-900">{formatCurrencyWithUserCurrency(budgetSummary.allocated)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-adaptive-700">Fondi Disponibili:</span>
                    <span className="font-semibold text-adaptive-900">
                      {formatCurrencyWithUserCurrency(dashboardData.totals.bankLiquidity - budgetSummary.allocated)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="space-y-8">
            {/* Investments Overview - Full Width */}
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-adaptive-900">🚀 Investimenti</h3>
                <Link href="/investments" className="text-sm text-blue-600 hover:text-blue-700">
                  Dettagli →
                </Link>
              </div>
              
              {dashboardData.investments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {dashboardData.investments.map((portfolio: Portfolio, index: number) => (
                    <div key={index} className="p-4 rounded-lg border border-adaptive bg-adaptive-50 hover:bg-adaptive-100 transition-colors">
                      <div className="mb-3">
                        <p className="text-base font-semibold text-adaptive-900">{portfolio.name}</p>
                        <p className="text-sm text-adaptive-500">
                          {portfolio.type === 'crypto_wallet' ? '🚀 Crypto Wallet' : '🟠 DCA Bitcoin'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-green-600">
                          {formatCurrencyWithUserCurrency(portfolio.stats?.totalValueEur || getDCACurrentValue(portfolio, btcPrice))}
                        </div>
                        <div className={`text-sm font-medium ${(portfolio.stats?.totalROI || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(portfolio.stats?.totalROI || 0) >= 0 ? '+' : ''}{(portfolio.stats?.totalROI || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-adaptive-500">Nessun investimento attivo</p>
                  <Link href="/investments" className="text-sm text-blue-600 hover:text-blue-700">
                    Inizia a investire →
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Transactions - Split into Income and Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Income */}
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-adaptive-900">📈 Entrate Recenti</h3>
                  <Link href="/income" className="text-sm text-green-600 hover:text-green-700">
                    Tutte →
                  </Link>
                </div>
                <div className="space-y-4">
                  {dashboardData.transactions.filter(t => t.type === 'income').slice(0, 4).map((transaction: Transaction, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium text-adaptive-900">
                            {transaction.description || 'Entrata'}
                          </p>
                          <p className="text-xs text-adaptive-500">
                            {new Date(transaction.date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        +{formatCurrencyWithUserCurrency(Math.abs(transaction.amount))}
                      </div>
                    </div>
                  ))}
                  {dashboardData.transactions.filter(t => t.type === 'income').length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-adaptive-500">Nessuna entrata recente</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-adaptive-900">📉 Uscite Recenti</h3>
                  <Link href="/expenses" className="text-sm text-red-600 hover:text-red-700">
                    Tutte →
                  </Link>
                </div>
                <div className="space-y-4">
                  {dashboardData.transactions.filter(t => t.type === 'expense').slice(0, 4).map((transaction: Transaction, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div>
                          <p className="text-sm font-medium text-black">
                            {transaction.description || 'Uscita'}
                          </p>
                          <p className="text-xs text-black">
                            {new Date(transaction.date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-red-600">
                        -{formatCurrencyWithUserCurrency(Math.abs(transaction.amount))}
                      </div>
                    </div>
                  ))}
                  {dashboardData.transactions.filter(t => t.type === 'expense').length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-adaptive-500">Nessuna uscita recente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">⚡ Azioni Rapide</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/accounts">
                <button className="p-4 text-center border border-adaptive rounded-lg hover:bg-adaptive-100 transition-colors w-full">
                  <div className="text-2xl mb-2">💸</div>
                  <div className="text-sm font-medium text-adaptive-700">Trasferimento</div>
                </button>
              </Link>
              <Link href="/investments">
                <button className="p-4 text-center border border-adaptive rounded-lg hover:bg-adaptive-100 transition-colors w-full">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-sm font-medium text-adaptive-700">Investimenti</div>
                </button>
              </Link>
              <Link href="/income">
                <button className="p-4 text-center border border-adaptive rounded-lg hover:bg-adaptive-100 transition-colors w-full">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-sm font-medium text-adaptive-700">Nuova Entrata</div>
                </button>
              </Link>
              <Link href="/budget">
                <button className="p-4 text-center border border-adaptive rounded-lg hover:bg-adaptive-100 transition-colors w-full">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium text-adaptive-700">Budget</div>
                </button>
              </Link>
            </div>
          </div>

          {/* Color Settings Modals */}
          <ColorSettingsModal
            isOpen={showColorSettings}
            onClose={() => setShowColorSettings(false)}
            chartColors={chartColors}
            onColorsChange={setChartColors}
            budgets={dashboardData.budgets}
            userCurrency={user?.currency}
          />
          
          {/* Patrimony Color Modal */}
          <PatrimonyColorModal
            isOpen={showPatrimonyColors}
            onClose={() => setShowPatrimonyColors(false)}
            colors={{
              contiBancari: chartColors.contiBancari,
              contiInvestimentoPatr: chartColors.contiInvestimentoPatr,
              assets: chartColors.assets,
              beniNonCorrenti: chartColors.beniNonCorrenti,
              crediti: chartColors.crediti
            }}
            onColorsChange={(newColors) => setChartColors(prev => ({ ...prev, ...newColors }))}
          />
          
          {/* Liquidity Color Modal */}
          <LiquidityColorModal
            isOpen={showLiquidityColors}
            onClose={() => setShowLiquidityColors(false)}
            colors={{
              fondiDisponibili: chartColors.fondiDisponibili,
              contiInvestimento: chartColors.contiInvestimento,
              holdingsInvestimenti: chartColors.holdingsInvestimenti
            }}
            onColorsChange={(newColors) => setChartColors(prev => ({ ...prev, ...newColors }))}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;