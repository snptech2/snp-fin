'use client'

import { useState, useEffect } from 'react'
import {
  PageHeader,
  StatCard,
  ContentCard,
  DataList,
  ActionButton,
  Modal,
  FormField,
  ButtonGroup,
  StatsGrid,
  EmptyState
} from '@/components/base'

// 🎯 Interfacce
interface ExampleItem {
  id: number
  name: string
  value: number
  date: string
  category: string
  status: 'active' | 'inactive'
}

export default function ExamplePage() {
  // 📊 States
  const [items, setItems] = useState<ExampleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ExampleItem | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // 📝 Form state
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  })

  // 🔄 Load data
  useEffect(() => {
    // Simula caricamento
    setTimeout(() => {
      const mockData: ExampleItem[] = [
        { 
          id: 1, 
          name: 'Elemento 1', 
          value: 150.50, 
          date: '2025-06-18', 
          category: 'Categoria A', 
          status: 'active' 
        },
        { 
          id: 2, 
          name: 'Elemento 2', 
          value: 89.99, 
          date: '2025-06-17', 
          category: 'Categoria B', 
          status: 'inactive' 
        }
      ]
      setItems(mockData)
      setLoading(false)
    }, 1000)
  }, [])

  // 📊 Calcoli statistiche
  const stats = {
    total: items.reduce((sum, item) => sum + item.value, 0),
    count: items.length,
    active: items.filter(item => item.status === 'active').length,
    thisMonth: items.filter(item => {
      const itemDate = new Date(item.date)
      const now = new Date()
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
    }).length
  }

  // 🔧 Handlers
  const handleAdd = () => {
    setEditingItem(null)
    setFormData({ 
      name: '', 
      value: '', 
      category: '', 
      date: new Date().toISOString().split('T')[0] 
    })
    setShowModal(true)
  }

  const handleEdit = (item: ExampleItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      value: item.value.toString(),
      category: item.category,
      date: item.date
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questo elemento?')) return
    setItems(items.filter(item => item.id !== id))
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.value) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      
      if (editingItem) {
        // Update
        const updatedItem = {
          ...editingItem,
          name: formData.name,
          value: parseFloat(formData.value),
          category: formData.category,
          date: formData.date
        }
        setItems(items.map(item => item.id === editingItem.id ? updatedItem : item))
      } else {
        // Create
        const newItem: ExampleItem = {
          id: Date.now(),
          name: formData.name,
          value: parseFloat(formData.value),
          category: formData.category,
          date: formData.date,
          status: 'active'
        }
        setItems([...items, newItem])
      }
      
      handleCloseModal()
    } catch (error) {
      console.error('Errore salvataggio:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({ 
      name: '', 
      value: '', 
      category: '', 
      date: new Date().toISOString().split('T')[0] 
    })
  }

  // 🎨 Utilities
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  // 📱 Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Caricamento...</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-300 rounded-lg"></div>
          <div className="h-64 bg-gray-300 rounded-lg"></div>
        </div>
      </div>
    )
  }

  // 📱 Render principale
  return (
    <div className="space-y-6">
      {/* 🎯 HEADER */}
      <PageHeader
        title="Pagina Esempio"
        subtitle="Esempio di utilizzo del Design System"
        actionLabel="Nuovo Elemento"
        onAction={handleAdd}
      />

      {/* 📊 STATISTICHE */}
      <StatsGrid columns={4}>
        <StatCard
          title="Totale Valore"
          value={formatCurrency(stats.total)}
          color="text-green-600"
          icon="💰"
        />
        <StatCard
          title="Elementi Totali"
          value={stats.count}
          detail={`${stats.active} attivi`}
          color="text-blue-600"
          icon="📦"
        />
        <StatCard
          title="Questo Mese"
          value={stats.thisMonth}
          detail="elementi creati"
          color="text-purple-600"
          icon="📅"
        />
        <StatCard
          title="Media Valore"
          value={stats.count > 0 ? formatCurrency(stats.total / stats.count) : formatCurrency(0)}
          color="text-orange-600"
          icon="📈"
        />
      </StatsGrid>

      {/* 📋 LISTA PRINCIPALE */}
      <ContentCard
        title={`Elementi (${items.length})`}
        action={{
          label: "➕ Aggiungi",
          onClick: handleAdd,
          variant: 'primary'
        }}
      >
        {items.length > 0 ? (
          <DataList
            items={items}
            renderItem={(item) => (
              <>
                <div className="text-sm text-adaptive-600 min-w-[80px]">
                  {formatDate(item.date)}
                </div>
                <div className="text-sm font-medium text-adaptive-900 min-w-[120px]">
                  {item.name}
                </div>
                <div className="text-sm text-adaptive-900 min-w-[100px]">
                  {formatCurrency(item.value)}
                </div>
                <div className="text-sm text-adaptive-500 min-w-[100px]">
                  {item.category}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.status === 'active' ? 'Attivo' : 'Inattivo'}
                </div>
              </>
            )}
            actions={(item) => (
              <>
                <ActionButton variant="edit" onClick={() => handleEdit(item)} />
                <ActionButton variant="delete" onClick={() => handleDelete(item.id)} />
              </>
            )}
            emptyMessage="Nessun elemento trovato!"
          />
        ) : (
          <EmptyState
            message="Nessun elemento ancora creato"
            actionLabel="Crea il primo elemento"
            onAction={handleAdd}
            icon="📦"
          />
        )}
      </ContentCard>

      {/* 🔧 MODAL */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingItem ? 'Modifica Elemento' : 'Nuovo Elemento'}
        size="md"
      >
        <div className="space-y-4">
          <FormField
            label="Nome"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="Inserisci nome elemento"
            required
          />
          
          <FormField
            label="Valore"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(value) => setFormData({ ...formData, value })}
            placeholder="0.00"
            required
          />
          
          <FormField
            label="Categoria"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            placeholder="Categoria elemento"
          />
          
          <FormField
            label="Data"
            type="date"
            value={formData.date}
            onChange={(value) => setFormData({ ...formData, date: value })}
          />

          <ButtonGroup
            onCancel={handleCloseModal}
            onConfirm={handleSubmit}
            cancelLabel="Annulla"
            confirmLabel={editingItem ? 'Aggiorna' : 'Crea'}
            loading={submitLoading}
            confirmDisabled={!formData.name || !formData.value}
          />
        </div>
      </Modal>
    </div>
  )
}