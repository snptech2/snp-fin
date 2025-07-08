// src/utils/constants.ts - Costanti centralizzate per l'applicazione

// ========== CONFIGURAZIONE API ==========
export const API_ENDPOINTS = {
  ACCOUNTS: '/api/accounts',
  CATEGORIES: '/api/categories', 
  TRANSACTIONS: '/api/transactions',
  BUDGETS: '/api/budgets',
  TRANSFERS: '/api/transfers',
  DCA_PORTFOLIOS: '/api/dca-portfolios',
  DCA_TRANSACTIONS: '/api/dca-transactions',
  NETWORK_FEES: '/api/network-fees',
  BITCOIN_PRICE: '/api/bitcoin-price'
} as const

// ========== BITCOIN / CRYPTO ==========
export const BITCOIN_CONFIG = {
  SATOSHIS_PER_BTC: 100_000_000,
  PRICE_REFRESH_INTERVAL_MINUTES: 15,
  PRICE_CACHE_DURATION_MINUTES: 5,
  BTC_DECIMAL_PLACES: 8,
  SATS_DECIMAL_PLACES: 0
} as const

// ========== FORMATTAZIONE ==========
export const CURRENCY_CONFIG = {
  DEFAULT_CURRENCY: 'EUR',
  LOCALE: 'it-IT',
  DECIMAL_PLACES: 2
} as const

export const DATE_CONFIG = {
  DEFAULT_LOCALE: 'it-IT',
  SHORT_FORMAT: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  } as const,
  LONG_FORMAT: {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  } as const
} as const

// ========== PAGINAZIONE ==========
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100
} as const

// ========== UI CONFIGURAZIONE ==========
export const UI_CONFIG = {
  DEBOUNCE_DELAY_MS: 300,
  TOAST_DURATION_MS: 5000,
  MODAL_ANIMATION_DURATION_MS: 200,
  LOADING_SPINNER_DELAY_MS: 200,
  AUTO_SAVE_DELAY_MS: 1000
} as const

// ========== VALIDAZIONE ==========
export const VALIDATION_CONFIG = {
  MIN_ACCOUNT_BALANCE: -999999.99,
  MAX_ACCOUNT_BALANCE: 999999.99,
  MIN_TRANSACTION_AMOUNT: 0.01,
  MAX_TRANSACTION_AMOUNT: 999999.99,
  MIN_BTC_AMOUNT: 0.00000001,
  MAX_BTC_AMOUNT: 21000000,
  MIN_SATS_AMOUNT: 1,
  MAX_SATS_AMOUNT: 2100000000000000,
  
  // Lunghezze stringhe
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 255,
  MAX_NOTES_LENGTH: 500
} as const

// ========== COLORI THEME ==========
export const THEME_COLORS = {
  SUCCESS: 'text-green-600',
  ERROR: 'text-red-600', 
  WARNING: 'text-orange-600',
  INFO: 'text-blue-600',
  NEUTRAL: 'text-adaptive-900',
  
  // Sfondo
  SUCCESS_BG: 'bg-green-600',
  ERROR_BG: 'bg-red-600',
  WARNING_BG: 'bg-orange-600', 
  INFO_BG: 'bg-blue-600',
  
  // Bitcoin colore brand
  BITCOIN: 'text-orange-600'
} as const

// ========== TIPI PORTFOLIO ==========
export const PORTFOLIO_TYPES = {
  DCA_BITCOIN: 'dca_bitcoin',
  CRYPTO_WALLET: 'crypto_wallet',
  STOCKS: 'stocks',
  BONDS: 'bonds'
} as const

// ========== TIPI TRANSAZIONE ==========
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
} as const

// ========== TIPI TRANSAZIONE CRYPTO ==========
export const CRYPTO_TRANSACTION_TYPES = {
  BUY: 'buy',
  SELL: 'sell',
  SWAP_IN: 'swap_in',
  SWAP_OUT: 'swap_out',
  STAKE_REWARD: 'stake_reward'
} as const

// ========== TIPI BUDGET ==========
export const BUDGET_TYPES = {
  FIXED: 'fixed',
  UNLIMITED: 'unlimited'
} as const

// ========== CATEGORIE FISCALI ==========
export const TAX_CATEGORIES = {
  PARTITA_IVA_TAXES: 'Tasse Partita IVA',
  PARTITA_IVA_INCOME: 'Entrate Partita IVA',
  TAX_PAYMENTS: 'Pagamenti Fiscali',
  IRPEF: 'IRPEF',
  INPS: 'INPS',
  IRAP: 'IRAP'
} as const

// Lista nomi di categorie che devono essere escluse dalle statistiche operative
export const FISCAL_CATEGORY_NAMES = [
  TAX_CATEGORIES.PARTITA_IVA_TAXES,
  TAX_CATEGORIES.TAX_PAYMENTS,
  TAX_CATEGORIES.IRPEF,
  TAX_CATEGORIES.INPS,
  TAX_CATEGORIES.IRAP,
  // Varianti possibili
  'Tasse',
  'Imposte',
  'Contributi',
  'F24',
  'Pagamenti Tasse'
] as const

// ========== STATUS ==========
export const STATUS_CONFIG = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  IDLE: 'idle'
} as const

// ========== LOCAL STORAGE KEYS ==========
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'snp_finance_preferences',
  LAST_SELECTED_ACCOUNT: 'snp_finance_last_account',
  FILTERS: 'snp_finance_filters',
  GRID_STATE: 'snp_finance_grid_state'
} as const

// ========== PLACEHOLDER / DEFAULT VALUES ==========
export const DEFAULTS = {
  USER_ID: 1, // TODO: Sostituire con autenticazione reale
  DEFAULT_BUDGET_COLOR: '#3B82F6',
  DEFAULT_CATEGORY_COLOR: '#3B82F6',
  NEW_ACCOUNT_BALANCE: 0,
  DEFAULT_CURRENCY: 'EUR'
} as const

// Type helpers per TypeScript
export type PortfolioType = typeof PORTFOLIO_TYPES[keyof typeof PORTFOLIO_TYPES]
export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES]  
export type CryptoTransactionType = typeof CRYPTO_TRANSACTION_TYPES[keyof typeof CRYPTO_TRANSACTION_TYPES]
export type BudgetType = typeof BUDGET_TYPES[keyof typeof BUDGET_TYPES]