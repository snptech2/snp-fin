// src/components/transactions/CSVImportModal.tsx
import React from 'react'
import { ImportModal } from '@/components/base/ImportModal'

interface Account {
  id: number
  name: string
  isDefault: boolean
  type: string
}

interface ImportProgress {
  current: number
  total: number
  currentBatch?: number
  totalBatches?: number
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  createdCategories?: string[]
}

interface CSVRow {
  originalLine: string
  lineNumber: number
  data: string
  descrizione: string
  importo: string
  categoria: string
  conto: string
  contoEffettivo: string
  usaFallback: boolean
  valuesCount: number
}

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  transactionType: 'income' | 'expense'
  // File handling
  csvFile: File | null
  onFileSelect: (file: File) => void
  // Settings
  useDefaultAccount: boolean
  onUseDefaultAccountChange: (use: boolean) => void
  accounts: Account[]
  // Preview
  showPreview: boolean
  csvData: CSVRow[]
  onBackToFileSelect: () => void
  // Import
  isImporting: boolean
  onStartImport: () => void
  importProgress?: ImportProgress
  importResult?: ImportResult | null
  // Reset
  onReset: () => void
}

export const CSVImportModal = ({
  isOpen,
  onClose,
  transactionType,
  csvFile,
  onFileSelect,
  useDefaultAccount,
  onUseDefaultAccountChange,
  accounts,
  showPreview,
  csvData,
  onBackToFileSelect,
  isImporting,
  onStartImport,
  importProgress,
  importResult,
  onReset
}: CSVImportModalProps) => {
  
  const title = `Import CSV ${transactionType === 'income' ? 'Entrate' : 'Uscite'}`
  
  const defaultAccount = accounts.find(acc => acc.isDefault && acc.type === 'bank') || 
                         accounts.find(acc => acc.type === 'bank')

  const renderFileSelection = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">📋 Formato CSV Richiesto</h3>
        <p className="text-sm text-blue-800 mb-2">Il file CSV deve contenere le seguenti colonne nell'ordine esatto:</p>
        <div className="bg-gray-100 rounded border p-2 font-mono text-sm text-gray-900 font-semibold">
          data,descrizione,importo,categoria,conto
        </div>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• <strong>data:</strong> formato DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD o DD MMM YYYY</li>
          <li>• <strong>descrizione:</strong> descrizione della transazione</li>
          <li>• <strong>importo:</strong> importo positivo (es: 25.50, €25.50, $25.50)</li>
          <li>• <strong>categoria:</strong> nome categoria (verrà creata automaticamente se non esiste)</li>
          <li>• <strong>conto:</strong> nome del conto bancario esistente (opzionale se fallback abilitato)</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={useDefaultAccount}
            onChange={(e) => onUseDefaultAccountChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Usa conto predefinito per righe senza conto specificato
          </span>
        </label>
        {useDefaultAccount && (
          <p className="text-xs text-gray-500 mt-1 ml-7">
            Verrà usato: {defaultAccount?.name || 'Nessun conto disponibile'}
          </p>
        )}
      </div>
    </div>
  )

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-adaptive-900">Anteprima Dati ({csvData.length} righe)</h3>
        <button
          onClick={onBackToFileSelect}
          className="px-4 py-2 text-adaptive-600 border border-adaptive rounded-lg hover:bg-adaptive-50"
        >
          Indietro
        </button>
      </div>

      <div className="bg-adaptive-50 rounded-lg p-4 max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-adaptive">
              <th className="text-left p-2 text-adaptive-900">Data</th>
              <th className="text-left p-2 text-adaptive-900">Descrizione</th>
              <th className="text-left p-2 text-adaptive-900">Importo</th>
              <th className="text-left p-2 text-adaptive-900">Categoria</th>
              <th className="text-left p-2 text-adaptive-900">Conto</th>
            </tr>
          </thead>
          <tbody>
            {csvData.slice(0, 10).map((row, index) => (
              <tr key={index} className={`border-b border-adaptive ${row.usaFallback ? 'bg-blue-50' : ''}`}>
                <td className="p-2 text-adaptive-900">{row.data}</td>
                <td className="p-2 text-adaptive-900">{row.descrizione}</td>
                <td className="p-2 text-adaptive-900">€{row.importo}</td>
                <td className="p-2 text-adaptive-900">{row.categoria}</td>
                <td className="p-2">
                  {row.usaFallback ? (
                    <div className="flex items-center gap-1">
                      <span className="text-blue-600 font-medium">{row.contoEffettivo}</span>
                      <span className="text-xs text-blue-500">(predefinito)</span>
                    </div>
                  ) : (
                    <span className="text-adaptive-900">{row.conto}</span> || <span className="text-red-500 text-xs">Mancante</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {csvData.length > 10 && (
          <p className="text-center text-adaptive-500 mt-2">
            ... e altre {csvData.length - 10} righe
          </p>
        )}
        
        {/* Legenda */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
            <span className="text-adaptive-600">Righe che useranno il conto predefinito</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-500">Mancante</span>
            <span className="text-adaptive-600">= Conto non specificato e fallback disabilitato</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderResult = () => {
    if (!importResult) return null
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-adaptive-900">Risultato Import</h3>
        
        <div className={`p-4 rounded-lg ${
          importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-lg ${importResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {importResult.success ? '✅' : '❌'}
            </span>
            <span className={`font-medium ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
              {importResult.success ? 'Import completato' : 'Import fallito'}
            </span>
          </div>
          
          {importResult.imported > 0 && (
            <p className="text-green-800 text-sm">
              ✅ {importResult.imported} transazioni importate con successo
            </p>
          )}
          
          {importResult.createdCategories && importResult.createdCategories.length > 0 && (
            <p className="text-blue-800 text-sm">
              🏷️ Categorie create: {importResult.createdCategories.join(', ')}
            </p>
          )}
          
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-red-800 text-sm font-medium">Errori:</p>
              <ul className="text-red-700 text-sm mt-1 space-y-1">
                {importResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  const getContent = () => {
    if (importResult) {
      return renderResult()
    }
    if (showPreview) {
      return renderPreview()
    }
    return renderFileSelection()
  }

  return (
    <ImportModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      isImporting={isImporting}
      progress={importProgress}
      result={importResult}
      onFileSelect={onFileSelect}
      acceptedFileTypes=".csv"
      onStartImport={showPreview && !isImporting ? onStartImport : undefined}
      onReset={onReset}
      showProgress={true}
      showResult={true}
    >
      {getContent()}
    </ImportModal>
  )
}