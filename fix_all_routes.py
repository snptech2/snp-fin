#!/usr/bin/env python3

import re
import os

# List of files that need fixing
files_to_fix = [
    "src/app/api/dca-portfolios/[id]/route.ts",
    "src/app/api/dca-transactions/[id]/route.ts",
    "src/app/api/holdings-snapshots/[id]/route.ts",
    "src/app/api/network-fees/[id]/route.ts",
    "src/app/api/non-current-assets/[id]/route.ts",
    "src/app/api/partita-iva/income/[id]/route.ts",
    "src/app/api/partita-iva/tax-payments/[id]/route.ts",
    "src/app/api/transactions/[id]/route.ts",
    "src/app/api/transfers/[id]/route.ts",
    "src/app/api/debug/crypto-portfolio/route.ts"
]

def fix_file(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix the parameter structure
    content = re.sub(
        r'{ params }: { params: { id: string }? }',
        r'context: { params: Promise<{ id: string }> }',
        content
    )
    
    # Fix multi-param structures
    content = re.sub(
        r'{ params }: { params: Promise<{ id: string; (\w+): string }> }',
        r'context: { params: Promise<{ id: string; \1: string }> }',
        content
    )
    
    # Fix single-line function declarations
    content = re.sub(
        r'export async function (\w+)\(request: NextRequest, { params }: { params: { id: string } }\) {',
        r'export async function \1(request: NextRequest, context: { params: Promise<{ id: string }> }) {',
        content
    )
    
    # Fix parameter usage - look for lines with params.id
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line uses params.id and needs async await
        if re.search(r'parseInt\(params\.id\)', line) and 'await context.params' not in line:
            # Add await params line before this line
            indent = len(line) - len(line.lstrip())
            await_line = ' ' * indent + 'const params = await context.params'
            new_lines.append(await_line)
            
        new_lines.append(line)
        i += 1
    
    content = '\n'.join(new_lines)
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")

# Fix all files
for file_path in files_to_fix:
    fix_file(file_path)

print("All files fixed!")