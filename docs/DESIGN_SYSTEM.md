# 🎨 SNP Finance - Design System

## 📋 **STILE REALE DEL PROGETTO**

Questo documento definisce il **vero design system** basato sulle pagine Income/Expenses esistenti.

---

## 🎯 **LAYOUT BASE PAGINA**

### **Struttura Standard:**
```tsx
<div className="space-y-6">
  {/* Header con sfondo scuro */}
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-white">Titolo Pagina</h1>
      <p className="text-white opacity-80">Sottotitolo descrittivo</p>
    </div>
    <button className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
      <PlusIcon className="w-5 h-5" />
      Azione Principale
    </button>
  </div>

  {/* Statistiche - 4 colonne responsive */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div className="card-adaptive p-4 rounded-lg border-adaptive">
      <h3 className="text-sm font-medium text-adaptive-500">Metrica</h3>
      <p className="text-2xl font-bold text-green-600">Valore</p>
      <p className="text-sm text-adaptive-600">Dettaglio</p>
    </div>
  </div>

  {/* Card Principale */}
  <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
    <div className="p-6 border-b border-adaptive">
      <h3 className="text-lg font-medium text-adaptive-900">Sezione</h3>
    </div>
    <div className="p-6">
      {/* Contenuto */}
    </div>
  </div>
</div>
```

---

## 🎨 **CLASSI CSS REALI**

### **🖼️ Contenitori:**
- **Pagina**: `space-y-6`
- **Card principale**: `card-adaptive rounded-lg shadow-sm border-adaptive`
- **Header card**: `p-6 border-b border-adaptive`
- **Contenuto card**: `p-6`

### **📝 Testi:**
- **Titolo pagina**: `text-3xl font-bold text-white`
- **Sottotitolo**: `text-white opacity-80`
- **Titolo sezione**: `text-lg font-medium text-adaptive-900`
- **Etichette**: `text-sm font-medium text-adaptive-500`
- **Valori**: `text-2xl font-bold text-[colore]`
- **Dettagli**: `text-sm text-adaptive-600`

### **🔘 Bottoni:**
- **Primario**: `btn-primary px-4 py-2 rounded-lg`
- **Secondario**: `px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50`
- **Pericoloso**: `px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700`
- **Azioni icone**: `text-blue-600 hover:text-blue-800 p-1` / `text-red-600 hover:text-red-800 p-1`

---

## 🌈 **COLORI SEMANTICI**

### **Statistiche Card:**
- **Entrate/Positivo**: `text-green-600`
- **Uscite/Negativo**: `text-red-600`  
- **Generale**: `text-blue-600`
- **Speciale**: `text-purple-600`
- **Warning**: `text-orange-600`
- **Neutro**: `text-adaptive-900`

### **Categorie (Income):**
```tsx
const incomeColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
]
```

### **Categorie (Expenses):**
```tsx
const expenseColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', 
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'
]
```

---

## 📊 **PATTERN LISTE**

### **Righe Standard:**
```tsx
<div className="space-y-3">
  {items.map((item) => (
    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        {/* Checkbox selezione */}
        <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
        
        {/* Contenuto principale */}
        <div className="flex-1">
          <div className="text-sm text-adaptive-900">{item.nome}</div>
          <div className="text-sm text-adaptive-600">{item.dettaglio}</div>
        </div>
      </div>
      
      {/* Azioni */}
      <div className="flex items-center gap-2 ml-4">
        <button className="text-blue-600 hover:text-blue-800 p-1">
          <PencilIcon className="w-4 h-4" />
        </button>
        <button className="text-red-600 hover:text-red-800 p-1">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  ))}
</div>
```

---

## 🎭 **MODALI STANDARD**

### **Struttura Modal:**
```tsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
      <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
        Titolo Modal
      </h3>
      
      <div className="space-y-4">
        {/* Form fields */}
        <div>
          <label className="block text-sm font-medium text-adaptive-700 mb-2">
            Campo *
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Bottoni */}
        <div className="flex justify-end space-x-3 pt-4">
          <button className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800">
            Annulla
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Conferma
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 🔍 **RICERCA E FILTRI**

### **Barra Ricerca:**
```tsx
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <h3 className="text-lg font-medium text-adaptive-900">Sezione</h3>
  
  <div className="flex flex-col md:flex-row gap-3">
    {/* Ricerca */}
    <div className="relative">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-adaptive-400" />
      <input
        type="text"
        placeholder="Cerca..."
        className="pl-9 pr-3 py-2 border border-adaptive rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      />
    </div>
    
    {/* Filtri */}
    <button className="flex items-center gap-2 px-3 py-2 border border-adaptive rounded-md text-sm text-adaptive-600 hover:bg-gray-50">
      <FunnelIcon className="w-4 h-4" />
      Filtri
    </button>
  </div>
</div>
```

---

## 📐 **LAYOUT RESPONSIVE**

### **Grid Statistiche:**
- **Mobile**: `grid-cols-1` (1 colonna)
- **Tablet**: `md:grid-cols-2` (2 colonne)  
- **Desktop**: `md:grid-cols-4` (4 colonne)

### **Spaziature Standard:**
- **Pagina**: `space-y-6`
- **Card interna**: `space-y-3` o `space-y-4`
- **Form**: `space-y-4`
- **Bottoni**: `space-x-3`

---

## 🚀 **COMPONENTI HELPER**

### **StatCard:**
```tsx
const StatCard = ({ title, value, detail, color = "text-adaptive-900" }) => (
  <div className="card-adaptive p-4 rounded-lg border-adaptive">
    <h3 className="text-sm font-medium text-adaptive-500">{title}</h3>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {detail && <p className="text-sm text-adaptive-600">{detail}</p>}
  </div>
)
```

### **PageHeader:**
```tsx
const PageHeader = ({ title, subtitle, actionLabel, onAction }) => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-white">{title}</h1>
      <p className="text-white opacity-80">{subtitle}</p>
    </div>
    {actionLabel && (
      <button onClick={onAction} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
        <PlusIcon className="w-5 h-5" />
        {actionLabel}
      </button>
    )}
  </div>
)
```

---

## ✅ **CHECKLIST NUOVE PAGINE**

### **Prima di creare una nuova pagina:**

**Layout Base:**
- [ ] `<div className="space-y-6">` come container principale
- [ ] Header con `text-white` e bottone `btn-primary`
- [ ] Grid statistiche `grid-cols-1 md:grid-cols-4 gap-4`

**Contenitori:**
- [ ] Card con `card-adaptive rounded-lg shadow-sm border-adaptive`
- [ ] Header sezioni con `p-6 border-b border-adaptive`
- [ ] Contenuto con `p-6`

**Liste:**
- [ ] Righe con `bg-gray-50 hover:bg-gray-100 transition-colors`
- [ ] Spaziatura con `space-y-3`
- [ ] Azioni a destra con icone colorate

**Colori:**
- [ ] Verde per entrate/positivo: `text-green-600`
- [ ] Rosso per uscite/negativo: `text-red-600`
- [ ] Blu per generale: `text-blue-600`
- [ ] Classi `text-adaptive-*` per testi standard

**Modali:**
- [ ] Container con `modal-content`
- [ ] Form con `space-y-4`
- [ ] Bottoni in `justify-end space-x-3`

---

## 🎯 **TEMPLATE COMPLETO**

```tsx
export default function NewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Nuova Pagina</h1>
          <p className="text-white opacity-80">Descrizione della pagina</p>
        </div>
        <button className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Nuova Azione
        </button>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Metrica 1</h3>
          <p className="text-2xl font-bold text-green-600">€ 1.234</p>
          <p className="text-sm text-adaptive-600">Dettaglio</p>
        </div>
        {/* Ripeti per altre 3 card */}
      </div>

      {/* Contenuto Principale */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">Sezione Principale</h3>
        </div>
        <div className="p-6">
          {/* Contenuto della sezione */}
        </div>
      </div>
    </div>
  )
}
```

---

## 🎉 **CONCLUSIONI**

Seguendo questo design system, ogni nuova pagina avrà:

✅ **Aspetto identico** alle pagine Income/Expenses  
✅ **Classi CSS corrette** (`card-adaptive`, `text-white`, etc.)  
✅ **Colori semantici** coerenti  
✅ **Layout responsive** funzionante  
✅ **Componenti standard** riutilizzabili  

**Usa questo come riferimento per tutte le nuove pagine!** 🚀