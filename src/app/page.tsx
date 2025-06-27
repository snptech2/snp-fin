'use client'

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CurrencyEuroIcon, ChartPieIcon, BanknotesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    accounts: [],
    investments: [],
    budgets: [],
    budgetTotals: { totalLiquidity: 0, totalAllocated: 0 }, // ✅ NUOVO
    transactions: [],
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

  // Fetch real data from APIs
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
      if (Array.isArray(budgets) && budgets.length > 0) {
        console.log('🏦 First Budget Object:', budgets[0]);
      }

      // Calculate totals
      const bankAccounts = accounts.filter(acc => acc.type === 'bank');
      const investmentAccounts = accounts.filter(acc => acc.type === 'investment');
      
      const bankLiquidity = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      const investmentLiquidity = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      // ✅ CORREZIONE: Calculate holdings value from ALL portfolios (crypto + DCA)
      const allPortfolios = [...cryptoPortfolios, ...dcaPortfolios];
      let holdingsValue = 0;
      
      // Debug logging migliorato
      console.log('🔍 DEBUG Portfolio Analysis:');
      console.log('Crypto Portfolios:', cryptoPortfolios.length);
      console.log('DCA Portfolios:', dcaPortfolios.length);
      
      allPortfolios.forEach(portfolio => {
        let portfolioValue = 0;
        
        if (portfolio.stats) {
          // Per Crypto Wallet portfolios
          if (portfolio.type === 'crypto_wallet') {
            portfolioValue = portfolio.stats.totalValueEur || 0;
          }
          // Per DCA portfolios - calcola valore usando Bitcoin
          else if (portfolio.type === 'dca_bitcoin' || portfolio.stats.totalBuyBTC) {
            // Usa il prezzo Bitcoin per calcolare il valore (circa 58.000€ da screenshot)
            const btcPriceEur = 58700; // Approssimativo, dovresti fare API call
            const totalBTC = portfolio.stats.totalBuyBTC || 0;
            portfolioValue = totalBTC * btcPriceEur;
            console.log(`🟠 DCA Calculation: ${totalBTC} BTC × €${btcPriceEur} = €${portfolioValue}`);
          }
          // Fallback per altri tipi
          else {
            portfolioValue = portfolio.stats.totalValueEur || 
                            portfolio.stats.currentValue || 
                            portfolio.stats.valueEur || 0;
          }
        }
        
        holdingsValue += portfolioValue;
        console.log(`📊 Portfolio "${portfolio.name}" (${portfolio.type || 'unknown'}): €${portfolioValue}`);
        console.log(`   - stats object:`, portfolio.stats);
      });

      console.log(`🎯 Total Holdings Value: €${holdingsValue}`);

      const totalPatrimony = bankLiquidity + investmentLiquidity + holdingsValue;

      setDashboardData({
        accounts,
        investments: allPortfolios,
        budgets,
        budgetTotals, // ✅ NUOVO: Aggiungo i totali dal backend
        transactions: Array.isArray(transactions) ? transactions.slice(0, 5) : [],
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
    fetchDashboardData();
  }, []);

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

  // ✅ CORREZIONE: Calculate budget summary usando i dati dell'API
  const budgetSummary = dashboardData.budgetTotals?.totalAllocated > 0 ? {
    total: dashboardData.budgetTotals.totalLiquidity,
    allocated: dashboardData.budgetTotals.totalAllocated
  } : (Array.isArray(dashboardData.budgets) ? dashboardData.budgets : []).reduce((acc, budget) => {
    // Debug per ogni budget solo se non abbiamo i totali dall'API
    console.log(`🏦 Budget "${budget.name}":`, {
      amount: budget.amount,
      currentAmount: budget.currentAmount,
      target: budget.target,
      allocated: budget.allocated
    });
    
    // Prova diversi campi possibili per amount e currentAmount
    const budgetTarget = budget.amount || budget.target || 0;
    const budgetAllocated = budget.currentAmount || budget.allocated || budgetTarget || 0;
    
    acc.total += budgetTarget;
    acc.allocated += budgetAllocated;
    return acc;
  }, { total: 0, allocated: 0 });

  console.log('💰 Budget Summary Final:', budgetSummary);

  // ✅ CORREZIONE: Calculate budget breakdown con campi corretti
  const budgetBreakdown = Array.isArray(dashboardData.budgets) ? dashboardData.budgets.map(budget => {
    // Usa i campi corretti dall'API budgets
    const target = budget.amount || budget.target || 0;
    const allocated = budget.currentAmount || budget.allocated || budget.amount || 0;
    
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

        {/* ✅ MIGLIORAMENTO: Quick Stats con etichette corrette */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/accounts">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">🏦 Totale Conti Bancari</p>
                  <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(dashboardData.totals.bankLiquidity)}</p>
                  <p className="text-sm text-adaptive-600">Liquidità disponibile</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <BanknotesIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/accounts">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">💰 Totale Conti Investimento</p>
                  <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(dashboardData.totals.investmentLiquidity)}</p>
                  <p className="text-sm text-adaptive-600">Pronta per investire</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <CurrencyEuroIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/investments">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">📈 Totale Valore Holdings</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.totals.holdingsValue)}</p>
                  <p className="text-sm text-adaptive-600">Investimenti attuali</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/budget">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">💸 Budget Allocato</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(budgetSummary.allocated)}</p>
                  <p className="text-sm text-adaptive-600">di {formatCurrency(budgetSummary.total)}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <ChartPieIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Allocazione Patrimonio */}
          <div className="lg:col-span-2">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <h3 className="text-lg font-semibold text-adaptive-900 mb-6">📊 Allocazione Patrimonio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData.filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {allocationData.filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {allocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium text-adaptive-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-adaptive-900">{formatCurrency(item.value)}</div>
                        <div className="text-xs text-adaptive-500">{formatPercentage(item.percentage)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ NUOVO: Budget Breakdown Dettagliato */}
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-adaptive-900">💰 Ripartizione Budget</h3>
              <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-700">
                Dettagli →
              </Link>
            </div>
            <div className="space-y-4">
              {budgetBreakdown.length > 0 ? budgetBreakdown.map((budget, index) => (
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

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Investment Summary */}
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-adaptive-900">📈 Investimenti</h3>
              <Link href="/investments" className="text-sm text-blue-600 hover:text-blue-700">
                Dettagli →
              </Link>
            </div>
            <div className="space-y-3">
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
                      {formatCurrency(portfolio.stats?.totalValueEur || 0)}
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