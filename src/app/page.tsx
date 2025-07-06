'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CurrencyEuroIcon, ChartPieIcon, BanknotesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute'

// Interfaces
interface BitcoinPrice {
  btcUsd: number;
  btcEur: number;
  cached: boolean;
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

interface DashboardData {
  accounts: Account[];
  investments: Portfolio[];
  budgets: Budget[];
  budgetTotals: { totalLiquidity: number; totalAllocated: number };
  transactions: Transaction[];
  enhancedCashFlow: EnhancedCashFlow | null;
  totals: DashboardTotals;
  partitaIVAStats: PartitaIVAGlobalStats | null;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null);
  const [showColorSettings, setShowColorSettings] = useState<boolean>(false);
  const [chartColors, setChartColors] = useState({
    fondiDisponibili: '#22D3EE',
    contiInvestimento: '#A855F7',
    holdingsInvestimenti: '#F59E0B'
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
      totalPatrimony: 0
    },
    partitaIVAStats: null
  });

  // Format functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // ✅ NUOVO: Fetch Bitcoin price
  const fetchBitcoinPrice = async (): Promise<void> => {
    try {
      const response = await fetch('/api/bitcoin-price');
      if (response.ok) {
        const data: BitcoinPrice = await response.json();
        setBtcPrice(data);
        console.log('🟠 Bitcoin Price loaded:', data.btcEur, 'EUR');
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
    }
  };

  // ✅ NUOVO: DCA Current Value Calculator (same as investments page)
  const getDCACurrentValue = (portfolio: Portfolio, btcPrice: BitcoinPrice | null): number => {
    if (portfolio.type !== 'dca_bitcoin' && !portfolio.stats?.totalBTC && !portfolio.stats?.netBTC) {
      return 0;
    }
    
    if (!btcPrice?.btcEur) {
      console.warn('Bitcoin price not available for DCA calculation');
      return 0;
    }
    
    // Priority: netBTC (includes network fees)
    if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
      const value = portfolio.stats.netBTC * btcPrice.btcEur;
      console.log(`🟠 DCA ${portfolio.name}: €${value} (netBTC: ${portfolio.stats.netBTC})`);
      return value;
    }
    
    // Fallback: totalBTC (may not include network fees)
    if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
      const value = portfolio.stats.totalBTC * btcPrice.btcEur;
      console.log(`🟠 DCA ${portfolio.name}: €${value} (totalBTC: ${portfolio.stats.totalBTC})`);
      return value;
    }
    
    return 0;
  };

  useEffect(() => {
    loadDashboardData();
    fetchBitcoinPrice(); // ✅ NUOVO: Load Bitcoin price
  }, []);

  // ✅ FIX: Ricarica dati quando arriva il prezzo Bitcoin
  useEffect(() => {
    if (btcPrice) {
      // Recalculate dashboard data with Bitcoin price
      loadDashboardData();
    }
  }, [btcPrice]);

  const loadDashboardData = async (): Promise<void> => {
    try {
      // Fetch all data in parallel
      const [
        accountsRes, 
        dcaRes, 
        cryptoRes, 
        budgetsRes, 
        transactionsRes,
        partitaIVARes
      ] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios'),
        fetch('/api/budgets'),
        fetch('/api/transactions?limit=5'),
        fetch('/api/partita-iva/stats-global')
      ]);

      // Parse responses
      const accounts: Account[] = accountsRes.ok ? await accountsRes.json() : [];
      const dcaPortfolios: Portfolio[] = dcaRes.ok ? await dcaRes.json() : [];
      const cryptoPortfolios: Portfolio[] = cryptoRes.ok ? await cryptoRes.json() : [];
      const budgetsResponse = budgetsRes.ok ? await budgetsRes.json() : null;
      const transactions: Transaction[] = transactionsRes.ok ? 
        await transactionsRes.json() : [];
      const partitaIVAStats: PartitaIVAGlobalStats | null = partitaIVARes.ok ? 
        await partitaIVARes.json() : null;

      // ✅ CORREZIONE: L'API budget restituisce un oggetto, non un array diretto
      const budgets: Budget[] = budgetsResponse?.budgets || [];
      const budgetTotals = {
        totalLiquidity: budgetsResponse?.totalLiquidity || 0,
        totalAllocated: budgetsResponse?.totalAllocated || 0
      };

      // ✅ DEBUG: Vediamo cosa arriva dall'API budgets
      console.log('🏦 DEBUG Budgets API Response:', budgetsResponse);
      console.log('🏦 Budget Totals from API:', budgetTotals);
      console.log('🏦 Budgets Array Length:', Array.isArray(budgets) ? budgets.length : 'Not an array');

      // Calculate totals
      const bankLiquidity = accounts
        .filter((account: Account) => account.type === 'bank')
        .reduce((sum: number, account: Account) => sum + account.balance, 0);

      const investmentLiquidity = accounts
        .filter((account: Account) => account.type === 'investment')  
        .reduce((sum: number, account: Account) => sum + account.balance, 0);

      // ✅ FIX: Calculate holdings value using same logic as investments page
      let holdingsValue = 0;
      
      // Calculate crypto portfolios value
      const cryptoValue = cryptoPortfolios.reduce((sum: number, portfolio: Portfolio) => {
        const value = portfolio.stats?.totalValueEur || 0;
        console.log(`🚀 Crypto ${portfolio.name}: €${value} (from backend)`);
        return sum + value;
      }, 0);
      
      // Calculate DCA portfolios value
      const dcaValue = dcaPortfolios.reduce((sum: number, portfolio: Portfolio) => {
        const value = getDCACurrentValue(portfolio, btcPrice);
        console.log(`🟠 DCA ${portfolio.name}: €${value} (calculated with BTC price)`);
        return sum + value;
      }, 0);
      
      holdingsValue = cryptoValue + dcaValue;

      console.log(`🎯 Total Holdings Value: €${holdingsValue}`);

      // ✅ NUOVO: Calculate Enhanced Cash Flow totals - UNIFICATO
      const allPortfolios: Portfolio[] = [...cryptoPortfolios, ...dcaPortfolios];
      const enhancedCashFlow: EnhancedCashFlow | null = allPortfolios.length > 0 ? {
        totalInvested: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.totalInvested || 0), 0),
        capitalRecovered: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.capitalRecovered || 0), 0),
        effectiveInvestment: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.effectiveInvestment || 0), 0),
        realizedProfit: allPortfolios.reduce((sum: number, p: Portfolio) => sum + (p.stats?.realizedProfit || 0), 0),
        isFullyRecovered: allPortfolios.every((p: Portfolio) => p.stats?.isFullyRecovered || false)
      } : null;

      const totalPatrimony = bankLiquidity + investmentLiquidity + holdingsValue;

      setDashboardData({
        accounts,
        investments: [...cryptoPortfolios, ...dcaPortfolios],
        budgets,
        budgetTotals,
        transactions: Array.isArray(transactions) ? transactions.slice(0, 5) : [],
        enhancedCashFlow,
        totals: {
          bankLiquidity,
          investmentLiquidity,
          holdingsValue,
          totalPatrimony
        },
        partitaIVAStats
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
        <div className="min-h-screen bg-adaptive-50 flex items-center justify-center">
          <div className="text-adaptive-600">Caricamento dashboard...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-adaptive-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-adaptive-900">Dashboard</h1>
            <p className="text-adaptive-600 mt-1">Panoramica completa del tuo patrimonio</p>
          </div>

          {/* Patrimonio Totale */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white mb-8 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold opacity-90">💎 Patrimonio Totale</h2>
                <p className="text-4xl font-bold mt-2">{formatCurrency(dashboardData.totals.totalPatrimony)}</p>
                <div className="flex items-center mt-2 text-blue-100">
                  <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
                  <span>Aggiornato in tempo reale</span>
                </div>
              </div>
              <div className="text-6xl opacity-120">
                💎
              </div>
            </div>
          </div>
          {/* Liquidità Overview - Seconda Riga */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/accounts">
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BanknotesIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-blue-600 text-2xl">🏦</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Conti Bancari</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardData.totals.bankLiquidity)}
                </p>
                <p className="text-sm text-adaptive-600">
                  {dashboardData.accounts.filter(acc => acc.type === 'bank').length} conti bancari
                </p>
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
                  {formatCurrency(dashboardData.totals.investmentLiquidity)}
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
                  {formatCurrency(dashboardData.totals.holdingsValue)}
                </p>
                <p className="text-sm text-adaptive-600">{dashboardData.investments.length} portfolio attivi</p>
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
                    {formatCurrency(dashboardData.partitaIVAStats.totali.saldoTasse)}
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
                  {formatCurrency(dashboardData.enhancedCashFlow.totalInvested)}
                </p>
                <p className="text-sm text-adaptive-600">Storico investimenti</p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-blue-600 text-xl">🔄</div>
                </div>
                <h3 className="text-lg font-semibold text-adaptive-900">Capitale Recuperato</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardData.enhancedCashFlow.capitalRecovered)}
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
                <h3 className="text-lg font-semibold text-adaptive-900">Soldi a Rischio</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dashboardData.enhancedCashFlow.effectiveInvestment)}
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
                  {formatCurrency(dashboardData.enhancedCashFlow.realizedProfit)}
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
                <h3 className="text-lg font-semibold text-adaptive-900">💰 Liquidità + Assets</h3>
                <button
                  onClick={() => setShowColorSettings(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Personalizza colori"
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
                          {formatCurrency(item.value)}
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
                          {formatCurrency(budget.allocated)} / {formatCurrency(budget.target)}
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
                    <span className="font-semibold text-adaptive-900">{formatCurrency(budgetSummary.allocated)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-adaptive-700">Fondi Disponibili:</span>
                    <span className="font-semibold text-adaptive-900">
                      {formatCurrency(dashboardData.totals.bankLiquidity - budgetSummary.allocated)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Investments Overview */}
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-adaptive-900">🚀 Investimenti</h3>
                <Link href="/investments" className="text-sm text-blue-600 hover:text-blue-700">
                  Dettagli →
                </Link>
              </div>
              <div className="space-y-4">
                {dashboardData.investments.slice(0, 3).map((portfolio: Portfolio, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-adaptive bg-adaptive-50">
                    <div>
                      <p className="text-sm font-medium text-adaptive-900">{portfolio.name}</p>
                      <p className="text-xs text-adaptive-500">
                        {portfolio.type === 'crypto_wallet' ? '🚀 Crypto Wallet' : '🟠 DCA Bitcoin'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(portfolio.stats?.totalValueEur || getDCACurrentValue(portfolio, btcPrice))}
                      </div>
                      <div className={`text-xs ${(portfolio.stats?.totalROI || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(portfolio.stats?.totalROI || 0) >= 0 ? '+' : ''}{(portfolio.stats?.totalROI || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
                {dashboardData.investments.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-adaptive-500">Nessun investimento attivo</p>
                    <Link href="/investments" className="text-sm text-blue-600 hover:text-blue-700">
                      Inizia a investire →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-adaptive-900">📋 Transazioni Recenti</h3>
                <Link href="/income" className="text-sm text-blue-600 hover:text-blue-700">
                  Tutte →
                </Link>
              </div>
              <div className="space-y-4">
                {dashboardData.transactions.map((transaction: Transaction, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-adaptive-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-adaptive-900">
                          {transaction.description || 'Transazione'}
                        </p>
                        <p className="text-xs text-adaptive-500">
                          {new Date(transaction.date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </div>
                  </div>
                ))}
                {dashboardData.transactions.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-adaptive-500">Nessuna transazione recente</p>
                  </div>
                )}
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

          {/* Modal Personalizzazione Colori */}
          {showColorSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🎨 Personalizza Colori Grafico</h3>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Sezioni fisse del grafico */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Fondi Disponibili
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={chartColors.fondiDisponibili}
                        onChange={(e) => setChartColors(prev => ({ ...prev, fondiDisponibili: e.target.value }))}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={chartColors.fondiDisponibili}
                        onChange={(e) => setChartColors(prev => ({ ...prev, fondiDisponibili: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                        placeholder="#22D3EE"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Conti Investimento
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={chartColors.contiInvestimento}
                        onChange={(e) => setChartColors(prev => ({ ...prev, contiInvestimento: e.target.value }))}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={chartColors.contiInvestimento}
                        onChange={(e) => setChartColors(prev => ({ ...prev, contiInvestimento: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                        placeholder="#A855F7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Holdings Investimenti
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={chartColors.holdingsInvestimenti}
                        onChange={(e) => setChartColors(prev => ({ ...prev, holdingsInvestimenti: e.target.value }))}
                        className="w-12 h-8 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={chartColors.holdingsInvestimenti}
                        onChange={(e) => setChartColors(prev => ({ ...prev, holdingsInvestimenti: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
                        placeholder="#F59E0B"
                      />
                    </div>
                  </div>

                  {/* Separatore */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Budget Individuali</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      I colori dei budget si modificano dalla pagina Budget
                    </p>
                    
                    {/* Lista budget con preview colori */}
                    <div className="space-y-2">
                      {dashboardData.budgets.filter(budget => budget.allocatedAmount > 0).map((budget, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border" 
                              style={{ backgroundColor: budget.color || '#3B82F6' }}
                            />
                            <span className="text-sm text-gray-700">{budget.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatCurrency(budget.allocatedAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => {
                      setChartColors({
                        fondiDisponibili: '#22D3EE',
                        contiInvestimento: '#A855F7',
                        holdingsInvestimenti: '#F59E0B'
                      });
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset Default
                  </button>
                  <button
                    onClick={() => setShowColorSettings(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;