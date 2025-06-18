# 🎨 SNP Finance - Design System Guide

## 📋 **STANDARD VISUAL COMPLETO**

Questo documento definisce gli standard per mantenere **continuità visiva perfetta** in tutto il progetto.

---

## 🎯 **STRUTTURA BASE PAGINA**

### **Layout Standard:**
```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-adaptive-900">Titolo Pagina</h1>
      <p className="text-adaptive-600">Sottotitolo descrittivo</p>
    </div>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
      ➕ Azione Principale
    </button>
  </div>

  {/* Card Statistiche */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div className="card-adaptive p-4 rounded-lg border-adaptive">
      <h3 className="text-sm font-medium text-adaptive-500">Metrica</h3>
      <p className="text-2xl font-bold text-green-600">Valore</p>
      <p className="text-sm text-adaptive-600">Dettaglio</p>
    </div>
  </div>

  {/* Contenitore Principale */}
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

## 🎨 **CLASSI CSS STANDARD**

### **🖼️ Contenitori:**
- **Pagina**: `space-y-6` (spaziatura verticale)
- **Card principale**: `card-adaptive rounded-lg shadow-sm border-adaptive`
- **Header card**: `p-6 border-b border-adaptive`
- **Contenuto card**: `p-6`

### **📝 Testi:**
- **Titolo pagina**: `text-3xl font-bold text-adaptive-900`
- **Sottotitolo**: `text-adaptive-600`
- **Titolo sezione**: `text-lg font-medium text-adaptive-900`
- **Etichette**: `text-sm font-medium text-adaptive-500`
- **Contenuto**: `text-adaptive-700` / `text-adaptive-900`

### **📊 Liste/Righe:**
- **Container liste**: sempre dentro `card-adaptive`
- **Righe dati**: `flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors`
- **Spaziatura liste**: `space-y-3`

### **🔘 Bottoni:**
- **Primario**: `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700`
- **Secondario**: `px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50`
- **Pericoloso**: `px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700`
- **Azioni**: `text-blue-600 hover:text-blue-800 p-1` (✏️) / `text-red-600 hover:text-red-800 p-1` (🗑️)

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
        <div className="flex justify-end space-x-3">
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

## 📊 **PATTERN LISTE DATI**

### **Lista Standard:**
```tsx
<div className="card-adaptive rounded-lg shadow-sm border-adaptive">
  <div className="p-6 border-b border-adaptive">
    <h3 className="text-lg font-medium text-adaptive-900">Lista Elementi</h3>
  </div>
  <div className="p-6">
    {items.length > 0 ? (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-sm text-adaptive-600 min-w-[80px]">
                {item.data}
              </div>
              <div className="text-sm text-adaptive-900 min-w-[120px]">
                {item.valore}
              </div>
              <div className="text-sm text-adaptive-500 flex-1">
                {item.descrizione}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button className="text-blue-600 hover:text-blue-800 p-1">
                ✏️
              </button>
              <button className="text-red-600 hover:text-red-800 p-1">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-8">
        <p className="text-adaptive-600">Nessun elemento trovato.</p>
      </div>
    )}
  </div>
</div>
```

---

## 🎨 **COLORI STANDARD**

### **Colori Semantici:**
- **Successo**: `text-green-600` / `bg-green-600`
- **Errore**: `text-red-600` / `bg-red-600`  
- **Warning**: `text-orange-600` / `bg-orange-600`
- **Info**: `text-blue-600` / `bg-blue-600`
- **Neutro**: `text-adaptive-*` / `card-adaptive`

### **Statistiche Card:**
- **Entrate**: `text-green-600`
- **Uscite**: `text-red-600`
- **Totali**: `text-adaptive-900`
- **Percentuali**: `text-purple-600`

---

## 📐 **LAYOUT RESPONSIVE**

### **Grid Statistiche:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="card-adaptive p-4 rounded-lg border-adaptive">
    <h3 className="text-sm font-medium text-adaptive-500">Metrica</h3>
    <p className="text-2xl font-bold text-green-600">€ 1.234,56</p>
    <p className="text-sm text-adaptive-600">2 transazioni</p>
  </div>
</div>
```

### **Layout Liste:**
- **Mobile**: Elementi impilati verticalmente
- **Desktop**: Flex con `min-w-[*px]` per colonne fisse
- **Azioni**: Sempre a destra con `ml-4`

---

## 🚀 **COMPONENTI RIUTILIZZABILI**

### **StatCard Component:**
```tsx
interface StatCardProps {
  title: string
  value: string | number
  detail?: string
  color?: string
}

const StatCard = ({ title, value, detail, color = "text-adaptive-900" }: StatCardProps) => (
  <div className="card-adaptive p-4 rounded-lg border-adaptive">
    <h3 className="text-sm font-medium text-adaptive-500">{title}</h3>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {detail && <p className="text-sm text-adaptive-600">{detail}</p>}
  </div>
)
```

### **PageHeader Component:**
```tsx
interface PageHeaderProps {
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
}

const PageHeader = ({ title, subtitle, actionLabel, onAction }: PageHeaderProps) => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-adaptive-900">{title}</h1>
      <p className="text-adaptive-600">{subtitle}</p>
    </div>
    {actionLabel && onAction && (
      <button 
        onClick={onAction}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {actionLabel}
      </button>
    )}
  </div>
)
```

---

## 📋 **CHECKLIST NUOVE PAGINE**

### **Prima di creare una nuova pagina, verifica:**

✅ **Layout Base:**
- [ ] Struttura `<div className="space-y-6">`
- [ ] Header con `PageHeader` o struttura standard
- [ ] Card statistiche con grid responsive

✅ **Contenitori:**
- [ ] Usa sempre `card-adaptive` per sezioni principali
- [ ] Header sezioni con `border-b border-adaptive`
- [ ] Padding corretto `p-6`

✅ **Liste:**
- [ ] Righe con `bg-gray-50 hover:bg-gray-100`
- [ ] Spaziatura `space-y-3`
- [ ] Azioni a destra con bottoni standard

✅ **Modali:**
- [ ] Classe `.modal-content` obbligatoria
- [ ] Struttura standard con `space-y-4`
- [ ] Bottoni standard in `justify-end space-x-3`

✅ **Testi:**
- [ ] Sempre classi `text-adaptive-*`
- [ ] Dimensioni standard (3xl, lg, sm)
- [ ] Colori semantici per stati

✅ **Responsive:**
- [ ] Grid che si adatta (1 → 2 → 4 colonne)
- [ ] Liste che funzionano su mobile
- [ ] Modali con `max-w-md mx-4`

---

## 🎯 **ESEMPI PAGINE COMPLETE**

### **Template Pagina Lista:**
```tsx
export default function NewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Nuova Sezione"
        subtitle="Gestisci i tuoi dati"
        actionLabel="➕ Nuovo Elemento"
        onAction={() => setShowModal(true)}
      />

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Totale" value="€ 1.234" color="text-green-600" />
        <StatCard title="Questo Mese" value="€ 456" detail="3 elementi" />
      </div>

      {/* Lista Principale */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">Elementi</h3>
        </div>
        <div className="p-6">
          {/* Lista con pattern standard */}
        </div>
      </div>
    </div>
  )
}
```

---

## 📚 **CONCLUSIONI**

Seguendo questi standard, **ogni nuova pagina** avrà automaticamente:

✅ **Aspetto identico** alle pagine esistenti  
✅ **Responsive design** perfetto  
✅ **Accessibilità** mantenuta  
✅ **Performance** ottimali  
✅ **Manutenibilità** elevata  

**Copia questo template per ogni nuova pagina e mantieni la coerenza!** 🎉