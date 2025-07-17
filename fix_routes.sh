#!/bin/bash

# Script to fix Next.js 15.3.3 route parameter structure
# Changes { params }: { params: { id: string } } to context: { params: Promise<{ id: string }> }

# List of files to fix
FILES=(
    "src/app/api/crypto-portfolios/[id]/route.ts"
    "src/app/api/dca-portfolios/[id]/route.ts"
    "src/app/api/dca-transactions/[id]/route.ts"
    "src/app/api/holdings-snapshots/[id]/route.ts"
    "src/app/api/network-fees/[id]/route.ts"
    "src/app/api/non-current-assets/[id]/route.ts"
    "src/app/api/partita-iva/income/[id]/route.ts"
    "src/app/api/partita-iva/tax-payments/[id]/route.ts"
    "src/app/api/transactions/[id]/route.ts"
    "src/app/api/transfers/[id]/route.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing $file..."
        
        # Fix the parameter structure
        sed -i 's/{ params }: { params: { id: string } }/context: { params: Promise<{ id: string }> }/g' "$file"
        sed -i 's/{ params }: { params: { id: string; }; }/context: { params: Promise<{ id: string }> }/g' "$file"
        
        # Fix the parameter usage
        sed -i 's/parseInt(params\.id)/parseInt((await context.params).id)/g' "$file"
        sed -i 's/params\.id/(await context.params).id/g' "$file"
        
        echo "Fixed $file"
    else
        echo "File $file not found"
    fi
done

echo "All files fixed!"