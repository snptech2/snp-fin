// Script di test per la nuova funzionalità di tracciamento guadagni investimenti
// Esegui con: node test-investment-gains.js

const API_BASE = 'http://localhost:3000/api';

// Funzione helper per le richieste API
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Aggiungi qui il tuo token di autenticazione se necessario
      // 'Authorization': 'Bearer YOUR_TOKEN'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Errore API:', data);
    throw new Error(data.error || 'Errore sconosciuto');
  }
  
  return data;
}

async function testInvestmentGains() {
  console.log('🚀 Test tracciamento guadagni investimenti\n');
  
  try {
    // 1. Ottieni lista conti per trovare un conto investment e uno bancario
    console.log('1. Recupero conti...');
    const accounts = await apiRequest('/accounts');
    
    const investmentAccount = accounts.accounts?.find(a => a.type === 'investment');
    const bankAccount = accounts.accounts?.find(a => a.type === 'bank');
    
    if (!investmentAccount || !bankAccount) {
      console.error('❌ Devi avere almeno un conto investment e uno bancario per eseguire il test');
      return;
    }
    
    console.log(`✅ Conto investimenti: ${investmentAccount.name} (balance: €${investmentAccount.balance})`);
    console.log(`✅ Conto bancario: ${bankAccount.name} (balance: €${bankAccount.balance})\n`);
    
    // 2. Test 1: Trasferimento normale (senza guadagni)
    console.log('2. Test trasferimento normale (senza guadagni)...');
    const transferAmount = 1000;
    
    if (investmentAccount.balance < transferAmount) {
      console.log('⚠️  Balance insufficiente per il test. Simuliamo comunque il comportamento.\n');
    }
    
    console.log(`   Trasferimento: €${transferAmount} da ${investmentAccount.name} a ${bankAccount.name}`);
    console.log('   Nessun guadagno specificato\n');
    
    // 3. Test 2: Trasferimento con guadagni
    console.log('3. Test trasferimento con guadagni...');
    const transferWithGains = 5000;
    const gains = 1500;
    
    console.log(`   Trasferimento: €${transferWithGains} da ${investmentAccount.name} a ${bankAccount.name}`);
    console.log(`   Di cui guadagni: €${gains}`);
    console.log(`   Capitale recuperato: €${transferWithGains - gains}\n`);
    
    // Esempio di chiamata API (commentato per non eseguire realmente)
    console.log('4. Esempio di chiamata API:');
    console.log('```javascript');
    console.log(`const response = await fetch('/api/transfers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    amount: ${transferWithGains},
    fromAccountId: ${investmentAccount.id},
    toAccountId: ${bankAccount.id},
    investmentGainAmount: ${gains}, // ← NUOVO CAMPO!
    description: "Prelievo con guadagni da investimenti"
  })
});`);
    console.log('```\n');
    
    console.log('5. Risultato atteso:');
    console.log(`   - Transfer creato: €${transferWithGains}`);
    console.log(`   - Income transaction creata: €${gains} (categoria: "Guadagni Investimenti")`);
    console.log(`   - Balance ${investmentAccount.name}: -€${transferWithGains}`);
    console.log(`   - Balance ${bankAccount.name}: +€${transferWithGains}`);
    console.log(`   - Guadagno netto tracciato: €${gains}`);
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

// Esegui il test
testInvestmentGains();