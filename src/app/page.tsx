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
      const budgets = budgetsRes.ok ? await budgetsRes.json() : [];
      const transactions = transactionsRes.ok ? await transactionsRes.json() : [];

      // Calculate totals
      const bankAccounts = accounts.filter(acc => acc.type === 'bank');
      const investmentAccounts = accounts.filter(acc => acc.type === 'investment');
      
      const bankLiquidity = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      const investmentLiquidity = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      // Calculate holdings value from all portfolios
      const allPortfolios = [...cryptoPortfolios, ...dcaPortfolios];
      let holdingsValue = 0;
      
      allPortfolios.forEach(portfolio => {
        if (portfolio.stats) {
          if (portfolio.type === 'crypto_wallet') {
            holdingsValue += portfolio.stats.totalValueEur || 0;
          } else {
            // For DCA portfolios, we need Bitcoin price to calculate current value
            // For now, use a fallback or fetch Bitcoin price
            holdingsValue += portfolio.stats.totalValueEur || 0;
          }
        }
      });

      const totalPatrimony = bankLiquidity + investmentLiquidity + holdingsValue;

      setDashboardData({
        accounts,
        investments: allPortfolios,
        budgets,
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

  // Calculate allocation data for pie chart
  const allocationData = [
    { 
      name: 'Liquidità Bancaria', 
      value: dashboardData.totals.bankLiquidity, 
      color: '#3B82F6',
      percentage: dashboardData.totals.totalPatrimony > 0 
        ? (dashboardData.totals.bankLiquidity / dashboardData.totals.totalPatrimony) * 100 
        : 0
    },
    { 
      name: 'Liquidità Investment', 
      value: dashboardData.totals.investmentLiquidity, 
      color: '#8B5CF6',
      percentage: dashboardData.totals.totalPatrimony > 0
        ? (dashboardData.totals.investmentLiquidity / dashboardData.totals.totalPatrimony) * 100
        : 0
    },
    { 
      name: 'Holdings Crypto', 
      value: dashboardData.totals.holdingsValue, 
      color: '#10B981',
      percentage: dashboardData.totals.totalPatrimony > 0
        ? (dashboardData.totals.holdingsValue / dashboardData.totals.totalPatrimony) * 100
        : 0
    }
  ];

  // Calculate budget summary
  const budgetSummary = dashboardData.budgets.reduce((acc, budget) => {
    acc.total += budget.amount || 0;
    acc.allocated += budget.currentAmount || 0;
    return acc;
  }, { total: 0, allocated: 0 });

  const budgetRemaining = budgetSummary.total - budgetSummary.allocated;

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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/conti">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">💳 Liquidità Bancaria</p>
                  <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(dashboardData.totals.bankLiquidity)}</p>
                  <p className="text-sm text-adaptive-600">Budget disponibile</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <BanknotesIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </Link>

          <Link href="/conti">
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive hover:bg-adaptive-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-adaptive-500">💰 Liquidità Investment</p>
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
                  <p className="text-sm font-medium text-adaptive-500">📈 Holdings Crypto</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.totals.holdingsValue)}</p>
                  <p className="text-sm text-adaptive-600">Valore corrente</p>
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
                
                <div className="space-y-4">
                  {allocationData.filter(item => item.value > 0).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: item.color }}
                        />
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

          {/* Budget Overview */}
          <div>
            <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-adaptive-900">💰 Riepilogo Budget</h3>
                <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-700">
                  Dettagli →
                </Link>
              </div>
              <div className="space-y-4">
                {dashboardData.budgets.slice(0, 3).map((budget, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-adaptive bg-adaptive-50">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-adaptive-700">{budget.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-adaptive-900">{formatCurrency(budget.currentAmount || 0)}</div>
                      <div className="text-xs text-adaptive-500">Target: {formatCurrency(budget.amount || 0)}</div>
                    </div>
                  </div>
                ))}
                {dashboardData.budgets.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-adaptive-500">Nessun budget configurato</p>
                    <Link href="/budget" className="text-sm text-blue-600 hover:text-blue-700">
                      Crea il primo budget →
                    </Link>
                  </div>
                )}
              </div>
            </div>
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
              <Link href="/entrate" className="text-sm text-blue-600 hover:text-blue-700">
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
            <Link href="/conti">
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
            <Link href="/entrate">
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