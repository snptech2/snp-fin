'use client'

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CurrencyEuroIcon, ChartPieIcon, BanknotesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [btcPrice, setBtcPrice] = useState(null); // ✅ NUOVO: Bitcoin price
  const [dashboardData, setDashboardData] = useState({
    accounts: [],
    investments: [],
    budgets: [],
    budgetTotals: { totalLiquidity: 0, totalAllocated: 0 },
    transactions: [],
    enhancedCashFlow: null, // ✅ NUOVO: Enhanced Cash Flow stats
    totals: {
      bankLiquidity: 0,
      investmentLiquidity: 0,
      holdingsValue: 0,
      totalPatrimony: 0
    }
  });

  // Format functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  // ✅ NUOVO: Fetch Bitcoin price
  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/bitcoin-price');
      if (response.ok) {
        const data = await response.json();
        setBtcPrice(data);
        console.log('🟠 Bitcoin Price loaded:', data.btcEur, 'EUR');
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
    }
  };

  // ✅ NUOVO: DCA Current Value Calculator (same as investments page)
  const getDCACurrentValue = (portfolio, btcPrice) => {
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
      console.log(`🟠 DCA ${portfolio.name}: ${portfolio.stats.netBTC} BTC × €${btcPrice.btcEur} = €${value}`);
      return value;
    }
    
    // Fallback: totalBTC
    if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null && portfolio.stats.totalBTC > 0) {
      const value = portfolio.stats.totalBTC * btcPrice.btcEur;
      console.log(`🟠 DCA ${portfolio.name}: ${portfolio.stats.totalBTC} BTC × €${btcPrice.btcEur} = €${value} (using totalBTC)`);
      return value;
    }
    
    console.warn(`DCA ${portfolio.name}: No BTC data available`);
    return 0;
  };

  // 🔧 FIX: Fetch data with corrected budget fields and Enhanced Cash Flow
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [accountsRes, investmentsRes, dcaRes, budgetsRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/crypto-portfolios'), 
        fetch('/api/dca-portfolios'),
        fetch('/api/budgets'),
        fetch('/api/transactions?limit=5')
      ]);

      const accounts = accountsRes.ok ? await accountsRes.json() : [];
      const cryptoPortfolios = investmentsRes.ok ? await investmentsRes.json() : [];
      const dcaPortfolios = dcaRes.ok ? await dcaRes.json() : [];
      const budgetsResponse = budgetsRes.ok ? await budgetsRes.json() : null;
      const transactions = transactionsRes.ok ? await transactionsRes.json() : [];

      // ✅ CORREZIONE: L'API budget restituisce un oggetto, non un array diretto
      const budgets = budgetsResponse?.budgets || [];
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
        .filter(account => account.type === 'bank')
        .reduce((sum, account) => sum + account.balance, 0);

      const investmentLiquidity = accounts
        .filter(account => account.type === 'investment')  
        .reduce((sum, account) => sum + account.balance, 0);

      // ✅ FIX: Calculate holdings value using same logic as investments page
      let holdingsValue = 0;
      
      // Calculate crypto portfolios value
      const cryptoValue = cryptoPortfolios.reduce((sum, portfolio) => {
        const value = portfolio.stats?.totalValueEur || 0;
        console.log(`🚀 Crypto ${portfolio.name}: €${value} (from backend)`);
        return sum + value;
      }, 0);
      
      // Calculate DCA portfolios value
      const dcaValue = dcaPortfolios.reduce((sum, portfolio) => {
        const value = getDCACurrentValue(portfolio, btcPrice);
        console.log(`🟠 DCA ${portfolio.name}: €${value} (calculated with BTC price)`);
        return sum + value;
      }, 0);
      
      holdingsValue = cryptoValue + dcaValue;

      console.log(`🎯 Total Holdings Value: €${holdingsValue}`);

      // ✅ NUOVO: Calculate Enhanced Cash Flow totals - UNIFICATO
      const allPortfolios = [...cryptoPortfolios, ...dcaPortfolios];
      const enhancedCashFlow = allPortfolios.length > 0 ? {
        totalInvested: allPortfolios.reduce((sum, p) => sum + (p.stats?.totalInvested || 0), 0),
        capitalRecovered: allPortfolios.reduce((sum, p) => sum + (p.stats?.capitalRecovered || 0), 0),
        effectiveInvestment: allPortfolios.reduce((sum, p) => sum + (p.stats?.effectiveInvestment || 0), 0),
        realizedProfit: allPortfolios.reduce((sum, p) => sum + (p.stats?.realizedProfit || 0), 0),
        isFullyRecovered: allPortfolios.every(p => p.stats?.isFullyRecovered || false)
      } : null;

      const totalPatrimony = bankLiquidity + investmentLiquidity + holdingsValue;

      setDashboardData({
        accounts,
        investments: [...cryptoPortfolios, ...dcaPortfolios],
        budgets,
        budgetTotals,
        transactions: Array.isArray(transactions) ? transactions.slice(0, 5) : [],
        enhancedCashFlow, // ✅ NUOVO
        totals: {
          bankLiquidity,
          investmentLiquidity, 
          holdingsValue,
          totalPatrimony
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitcoinPrice(); // ✅ NUOVO: Fetch Bitcoin price first
    fetchDashboardData();
  }, []);

  // ✅ NUOVO: Ricalcola holdings value quando btcPrice cambia
  useEffect(() => {
    if (btcPrice && dashboardData.investments.length > 0) {
      console.log('🔄 Recalculating holdings value with Bitcoin price...');
      
      const cryptoPortfolios = dashboardData.investments.filter(p => p.type === 'crypto_wallet');
      const dcaPortfolios = dashboardData.investments.filter(p => p.type === 'dca_bitcoin');
      
      // Calculate crypto portfolios value
      const cryptoValue = cryptoPortfolios.reduce((sum, portfolio) => {
        const value = portfolio.stats?.totalValueEur || 0;
        console.log(`🚀 Crypto ${portfolio.name}: €${value} (from backend)`);
        return sum + value;
      }, 0);
      
      // Calculate DCA portfolios value with current Bitcoin price
      const dcaValue = dcaPortfolios.reduce((sum, portfolio) => {
        const value = getDCACurrentValue(portfolio, btcPrice);
        console.log(`🟠 DCA ${portfolio.name}: €${value} (calculated with BTC price)`);
        return sum + value;
      }, 0);
      
      const newHoldingsValue = cryptoValue + dcaValue;
      console.log(`🎯 Updated Total Holdings Value: €${newHoldingsValue} (Crypto: €${cryptoValue} + DCA: €${dcaValue})`);
      
      // Update totals with new holdings value
      setDashboardData(prev => ({
        ...prev,
        totals: {
          ...prev.totals,
          holdingsValue: newHoldingsValue,
          totalPatrimony: prev.totals.bankLiquidity + prev.totals.investmentLiquidity + newHoldingsValue
        }
      }));
    }
  }, [btcPrice, dashboardData.investments]);

  // ✅ MIGLIORAMENTO: Calculate allocation data for pie chart con nuove etichette
  const allocationData = [
    { 
      name: 'Conti Bancari', 
      value: dashboardData.totals.bankLiquidity, 
      color: '#3B82F6',
      percentage: dashboardData.totals.totalPatrimony > 0 
        ? (dashboardData.totals.bankLiquidity / dashboardData.totals.totalPatrimony) * 100 
        : 0
    },
    { 
      name: 'Conti Investimento', 
      value: dashboardData.totals.investmentLiquidity, 
      color: '#8B5CF6',
      percentage: dashboardData.totals.totalPatrimony > 0
        ? (dashboardData.totals.investmentLiquidity / dashboardData.totals.totalPatrimony) * 100
        : 0
    },
    { 
      name: 'Holdings Investimenti', 
      value: dashboardData.totals.holdingsValue, 
      color: '#10B981',
      percentage: dashboardData.totals.totalPatrimony > 0
        ? (dashboardData.totals.holdingsValue / dashboardData.totals.totalPatrimony) * 100
        : 0
    }
  ];

  // ✅ CORREZIONE: Calculate budget summary usando i campi corretti
  const budgetSummary = dashboardData.budgetTotals?.totalAllocated > 0 ? {
    total: dashboardData.budgetTotals.totalLiquidity,
    allocated: dashboardData.budgetTotals.totalAllocated
  } : (Array.isArray(dashboardData.budgets) ? dashboardData.budgets : []).reduce((acc, budget) => {
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

  // ✅ CORREZIONE: Calculate budget breakdown con campi corretti
  const budgetBreakdown = Array.isArray(dashboardData.budgets) ? dashboardData.budgets.map(budget => {
    // 🔧 FIX: Usa targetAmount e allocatedAmount invece di amount/currentAmount
    const target = budget.targetAmount || 0;
    const allocated = budget.allocatedAmount || 0;
    
    console.log(`📊 Budget Breakdown for "${budget.name}":`, { target, allocated, budget });
    
    return {
      name: budget.name,
      allocated: allocated,
      target: target,
      percentage: target > 0 ? (allocated / target) * 100 : 0
    };
  }) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-adaptive-50 flex items-center justify-center">
        <div className="text-adaptive-600">Caricamento dashboard...</div>
      </div>
    );
  }

  return (
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
            <div className="text-6xl opacity-20">
              💎
            </div>
          </div>
        </div>

        {/* ✅ NUOVO: Enhanced Cash Flow Breakdown - Consistente con investments page */}
        {dashboardData.enhancedCashFlow && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-adaptive-900 mb-4">🔄 Enhanced Cash Flow</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Investito</h3>
                <p className="text-2xl font-bold text-adaptive-900">
                  {formatCurrency(dashboardData.enhancedCashFlow.totalInvested)}
                </p>
                <p className="text-sm text-adaptive-600">Storico investimenti</p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardData.enhancedCashFlow.capitalRecovered)}
                </p>
                <p className="text-sm text-adaptive-600">
                  {dashboardData.enhancedCashFlow.totalInvested > 0 ? 
                    ((dashboardData.enhancedCashFlow.capitalRecovered / dashboardData.enhancedCashFlow.totalInvested) * 100).toFixed(1) : 0}%
                  {dashboardData.enhancedCashFlow.isFullyRecovered && <span className="text-green-600 ml-1">✅</span>}
                </p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <h3 className="text-sm font-medium text-adaptive-500">⚠️ Soldi a Rischio</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dashboardData.enhancedCashFlow.effectiveInvestment)}
                </p>
                <p className="text-sm text-adaptive-600">
                  {dashboardData.enhancedCashFlow.isFullyRecovered ? '🎉 Investimento gratis!' : 'Non ancora recuperato'}
                </p>
              </div>

              <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
                <h3 className="text-sm font-medium text-adaptive-500">💹 Profitti Realizzati</h3>
                <p className={`text-2xl font-bold ${dashboardData.enhancedCashFlow.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboardData.enhancedCashFlow.realizedProfit)}
                </p>
                <p className="text-sm text-adaptive-600">Da vendite</p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ MIGLIORAMENTO: Quick Stats con etichette corrette */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/accounts">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">🏦 Totale Conti Bancari</p>
                  <p className="text-2xl font-bold text-adaptive-900">
                    {formatCurrency(dashboardData.totals.bankLiquidity)}
                  </p>
                  <p className="text-xs text-adaptive-600">Liquidità disponibile</p>
                </div>
                <BanknotesIcon className="w-10 h-10 text-blue-600" />
              </div>
            </div>
          </Link>

          <Link href="/accounts">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">📊 Totale Conti Investimento</p>
                  <p className="text-2xl font-bold text-adaptive-900">
                    {formatCurrency(dashboardData.totals.investmentLiquidity)}
                  </p>
                  <p className="text-xs text-adaptive-600">Pronta per investire</p>
                </div>
                <CurrencyEuroIcon className="w-10 h-10 text-purple-600" />
              </div>
            </div>
          </Link>

          <Link href="/investments">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">💎 Totale Valore Holdings</p>
                  <p className="text-2xl font-bold text-adaptive-900">
                    {formatCurrency(dashboardData.totals.holdingsValue)}
                  </p>
                  <p className="text-xs text-adaptive-600">Investimenti attuali</p>
                </div>
                <ChartPieIcon className="w-10 h-10 text-green-600" />
              </div>
            </div>
          </Link>

          <Link href="/budget">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">💰 Budget Allocato</p>
                  <p className="text-2xl font-bold text-adaptive-900">
                    {formatCurrency(budgetSummary.allocated)}
                  </p>
                  <p className="text-xs text-adaptive-600">di {formatCurrency(budgetSummary.total)}</p>
                </div>
                <div className="text-orange-600 text-2xl">🎯</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Allocazione Patrimonio */}
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-adaptive-900">📊 Allocazione Patrimonio</h3>
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
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="flex-1 space-y-3">
                {allocationData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
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

          {/* Ripartizione Budget */}
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-adaptive-900">🔥 Ripartizione Budget</h3>
              <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-700">
                Dettagli →
              </Link>
            </div>
            
            <div className="space-y-4">
              {budgetBreakdown.length > 0 ? 
                budgetBreakdown.map((budget, index) => (
                  <div key={index} className="p-3 rounded-lg border border-adaptive bg-adaptive-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-adaptive-700">{budget.name}</span>
                      <span className="text-xs text-adaptive-500">{formatPercentage(budget.percentage)}</span>
                    </div>
                    <div className="w-full bg-adaptive-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-adaptive-600">
                      <span>{formatCurrency(budget.allocated)}</span>
                      <span>Target: {formatCurrency(budget.target)}</span>
                    </div>
                  </div>
                )) : (
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
              {dashboardData.investments.slice(0, 3).map((portfolio, index) => (
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
                      {(portfolio.stats?.totalROI || 0) >= 0 ? '+' : ''}{(portfolio.stats?.totalROI || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
              {dashboardData.investments.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-adaptive-500">Nessun investimento attivo</p>
                  <Link href="/investments" className="text-sm text-blue-600 hover:text-blue-700">
                    Inizia ad investire →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-adaptive-900">📝 Transazioni Recenti</h3>
              <Link href="/income" className="text-sm text-blue-600 hover:text-blue-700">
                Vedi tutte →
              </Link>
            </div>
            <div className="space-y-4">
              {dashboardData.transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-adaptive bg-adaptive-50">
                  <div>
                    <p className="text-sm font-medium text-adaptive-900">{transaction.description || 'Transazione'}</p>
                    <p className="text-xs text-adaptive-500">
                      {new Date(transaction.date).toLocaleDateString('it-IT')}
                    </p>
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
      </div>
    </div>
  );
};

export default Dashboard;