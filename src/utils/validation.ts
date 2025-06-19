// src/utils/validation.ts - Helper di validazione centralizzati

import { VALIDATION_CONFIG, BITCOIN_CONFIG } from './constants'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// ========== VALIDAZIONI GENERICHE ==========

/**
 * Valida che un campo non sia vuoto
 */
export const validateRequired = (value: unknown, fieldName: string): ValidationResult => {
  const errors: string[] = []
  
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} è obbligatorio`)
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida lunghezza stringa
 */
export const validateStringLength = (
  value: string, 
  fieldName: string, 
  min: number = VALIDATION_CONFIG.MIN_NAME_LENGTH,
max: number = VALIDATION_CONFIG.MAX_NAME_LENGTH
): ValidationResult => {
  const errors: string[] = []
  
  if (value.length < min) {
    errors.push(`${fieldName} deve essere di almeno ${min} caratteri`)
  }
  
  if (value.length > max) {
    errors.push(`${fieldName} non può essere più lungo di ${max} caratteri`)
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida che un numero sia in un range
 */
export const validateNumberRange = (
  value: number, 
  fieldName: string, 
  min: number, 
  max: number
): ValidationResult => {
  const errors: string[] = []
  
  if (isNaN(value)) {
    errors.push(`${fieldName} deve essere un numero valido`)
    return { isValid: false, errors }
  }
  
  if (value < min) {
    errors.push(`${fieldName} deve essere almeno ${min}`)
  }
  
  if (value > max) {
    errors.push(`${fieldName} non può essere maggiore di ${max}`)
  }
  
  return { isValid: errors.length === 0, errors }
}

// ========== VALIDAZIONI SPECIFICHE DOMINIO ==========

/**
 * Valida dati account bancario
 */
export const validateAccount = (data: {
  name: string
  balance: number
}): ValidationResult => {
  const errors: string[] = []
  
  // Nome obbligatorio
  const nameValidation = validateRequired(data.name, 'Nome account')
  errors.push(...nameValidation.errors)
  
  if (nameValidation.isValid) {
    const lengthValidation = validateStringLength(data.name, 'Nome account')
    errors.push(...lengthValidation.errors)
  }
  
  // Saldo nel range valido
  const balanceValidation = validateNumberRange(
    data.balance, 
    'Saldo', 
    VALIDATION_CONFIG.MIN_ACCOUNT_BALANCE, 
    VALIDATION_CONFIG.MAX_ACCOUNT_BALANCE
  )
  errors.push(...balanceValidation.errors)
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida dati categoria
 */
export const validateCategory = (data: {
  name: string
  type: string
  color?: string
}): ValidationResult => {
  const errors: string[] = []
  
  // Nome obbligatorio
  const nameValidation = validateRequired(data.name, 'Nome categoria')
  errors.push(...nameValidation.errors)
  
  if (nameValidation.isValid) {
    const lengthValidation = validateStringLength(data.name, 'Nome categoria')
    errors.push(...lengthValidation.errors)
  }
  
  // Tipo valido
  if (!['income', 'expense'].includes(data.type)) {
    errors.push('Tipo categoria deve essere "income" o "expense"')
  }
  
  // Colore hex valido (opzionale)
  if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
    errors.push('Colore deve essere in formato hex valido (#RRGGBB)')
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida dati transazione
 */
export const validateTransaction = (data: {
  description?: string
  amount: number
  type: string
  accountId: number
  categoryId: number
}): ValidationResult => {
  const errors: string[] = []
  
  // Descrizione (opzionale ma se presente deve essere valida)
  if (data.description) {
    const descValidation = validateStringLength(
      data.description, 
      'Descrizione', 
      0, 
      VALIDATION_CONFIG.MAX_DESCRIPTION_LENGTH
    )
    errors.push(...descValidation.errors)
  }
  
  // Importo positivo
  const amountValidation = validateNumberRange(
    data.amount, 
    'Importo', 
    VALIDATION_CONFIG.MIN_TRANSACTION_AMOUNT, 
    VALIDATION_CONFIG.MAX_TRANSACTION_AMOUNT
  )
  errors.push(...amountValidation.errors)
  
  // Tipo valido
  if (!['income', 'expense'].includes(data.type)) {
    errors.push('Tipo transazione deve essere "income" o "expense"')
  }
  
  // ID validi
  if (!Number.isInteger(data.accountId) || data.accountId <= 0) {
    errors.push('Account ID deve essere un numero intero positivo')
  }
  
  if (!Number.isInteger(data.categoryId) || data.categoryId <= 0) {
    errors.push('Categoria ID deve essere un numero intero positivo')
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida dati budget
 */
export const validateBudget = (data: {
  name: string
  targetAmount: number
  type: string
}): ValidationResult => {
  const errors: string[] = []
  
  // Nome obbligatorio
  const nameValidation = validateRequired(data.name, 'Nome budget')
  errors.push(...nameValidation.errors)
  
  if (nameValidation.isValid) {
    const lengthValidation = validateStringLength(data.name, 'Nome budget')
    errors.push(...lengthValidation.errors)
  }
  
  // Importo target positivo
  if (data.targetAmount <= 0) {
    errors.push('Importo target deve essere maggiore di zero')
  }
  
  // Tipo valido
  if (!['fixed', 'unlimited'].includes(data.type)) {
    errors.push('Tipo budget deve essere "fixed" o "unlimited"')
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida transazione DCA Bitcoin
 */
export const validateDCATransaction = (data: {
  broker: string
  info: string
  btcQuantity: number
  eurPaid: number
  notes?: string
}): ValidationResult => {
  const errors: string[] = []
  
  // Broker obbligatorio
  const brokerValidation = validateRequired(data.broker, 'Broker')
  errors.push(...brokerValidation.errors)
  
  // Info obbligatoria
  const infoValidation = validateRequired(data.info, 'Info')
  errors.push(...infoValidation.errors)
  
  // Quantità BTC valida
  const btcValidation = validateNumberRange(
    data.btcQuantity,
    'Quantità BTC',
    VALIDATION_CONFIG.MIN_BTC_AMOUNT,
    VALIDATION_CONFIG.MAX_BTC_AMOUNT
  )
  errors.push(...btcValidation.errors)
  
  // EUR pagati positivi
  const eurValidation = validateNumberRange(
    data.eurPaid,
    'EUR pagati',
    VALIDATION_CONFIG.MIN_TRANSACTION_AMOUNT,
    VALIDATION_CONFIG.MAX_TRANSACTION_AMOUNT
  )
  errors.push(...eurValidation.errors)
  
  // Note opzionali
  if (data.notes) {
    const notesValidation = validateStringLength(
      data.notes,
      'Note',
      0,
      VALIDATION_CONFIG.MAX_NOTES_LENGTH
    )
    errors.push(...notesValidation.errors)
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida fee di rete Bitcoin
 */
export const validateNetworkFee = (data: {
  sats: number
  description?: string
}): ValidationResult => {
  const errors: string[] = []
  
  // Sats validi
  const satsValidation = validateNumberRange(
    data.sats,
    'Satoshi',
    VALIDATION_CONFIG.MIN_SATS_AMOUNT,
    VALIDATION_CONFIG.MAX_SATS_AMOUNT
  )
  errors.push(...satsValidation.errors)
  
  // Descrizione opzionale
  if (data.description) {
    const descValidation = validateStringLength(
      data.description,
      'Descrizione',
      0,
      VALIDATION_CONFIG.MAX_DESCRIPTION_LENGTH
    )
    errors.push(...descValidation.errors)
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Valida trasferimento tra conti
 */
export const validateTransfer = (data: {
  fromAccountId: number
  toAccountId: number
  amount: number
  description?: string
}): ValidationResult => {
  const errors: string[] = []
  
  // Account diversi
  if (data.fromAccountId === data.toAccountId) {
    errors.push('Non puoi trasferire denaro allo stesso conto')
  }
  
  // ID account validi
  if (!Number.isInteger(data.fromAccountId) || data.fromAccountId <= 0) {
    errors.push('Conto sorgente non valido')
  }
  
  if (!Number.isInteger(data.toAccountId) || data.toAccountId <= 0) {
    errors.push('Conto destinazione non valido')
  }
  
  // Importo positivo
  const amountValidation = validateNumberRange(
    data.amount,
    'Importo trasferimento',
    VALIDATION_CONFIG.MIN_TRANSACTION_AMOUNT,
    VALIDATION_CONFIG.MAX_TRANSACTION_AMOUNT
  )
  errors.push(...amountValidation.errors)
  
  return { isValid: errors.length === 0, errors }
}

// ========== HELPER UTILI ==========

/**
 * Combina più risultati di validazione
 */
export const combineValidations = (...validations: ValidationResult[]): ValidationResult => {
  const allErrors = validations.flatMap(v => v.errors)
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

/**
 * Valida email semplice
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return {
    isValid: emailRegex.test(email),
    errors: emailRegex.test(email) ? [] : ['Email non valida']
  }
}