'use client'

import { useState, useRef } from 'react'
import { api } from '@/lib/trpc'
import { formatINR } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface ParsedRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense' | 'investment' | 'transfer'
  direction: 'credit' | 'debit'
  notes?: string
  _valid: boolean
  _error?: string
}

const EXPECTED_HEADERS = ['date', 'description', 'amount', 'type']

const SAMPLE_CSV = `date,description,amount,type,notes
2026-04-01,April Salary,85000,income,
2026-04-02,D-Mart Groceries,3200,expense,Monthly groceries
2026-04-03,HDFC Home Loan EMI,32000,expense,
2026-04-05,HDFC Mutual Fund SIP,10000,investment,
2026-04-06,Zomato Order,450,expense,
2026-04-10,Freelance Payment,15000,income,Client project`

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))

  const dateIdx = headers.indexOf('date')
  const descIdx = headers.indexOf('description')
  const amountIdx = headers.indexOf('amount')
  const typeIdx = headers.indexOf('type')
  const notesIdx = headers.indexOf('notes')

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1 || typeIdx === -1) {
    return []
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))

    const date = cols[dateIdx] ?? ''
    const description = cols[descIdx] ?? ''
    const amountStr = cols[amountIdx] ?? ''
    const typeRaw = (cols[typeIdx] ?? '').toLowerCase()
    const notes = notesIdx >= 0 ? cols[notesIdx] : undefined

    const amount = parseFloat(amountStr.replace(/[₹,\s]/g, ''))
    const validTypes = ['income', 'expense', 'investment', 'transfer']
    const type = validTypes.includes(typeRaw) ? typeRaw as ParsedRow['type'] : 'expense'
    const direction: 'credit' | 'debit' = type === 'income' ? 'credit' : 'debit'

    let _valid = true
    let _error: string | undefined

    if (!date || isNaN(new Date(date).getTime())) {
      _valid = false; _error = `Row ${i + 2}: invalid date "${date}"`
    } else if (!description) {
      _valid = false; _error = `Row ${i + 2}: missing description`
    } else if (isNaN(amount) || amount <= 0) {
      _valid = false; _error = `Row ${i + 2}: invalid amount "${amountStr}"`
    } else if (!validTypes.includes(typeRaw)) {
      _error = `Row ${i + 2}: unknown type "${typeRaw}", defaulted to expense`
    }

    return { date, description, amount, type, direction, notes: notes || undefined, _valid, _error }
  })
}

interface BulkUploadModalProps {
  onClose: () => void
}

export function BulkUploadModal({ onClose }: BulkUploadModalProps) {
  const utils = api.useUtils()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  const bulkCreate = api.transactions.bulkCreate.useMutation({
    onSuccess: (data) => {
      utils.transactions.list.invalidate()
      utils.transactions.monthlySummary.invalidate()
      utils.accounts.totalBalance.invalidate()
      alert(`✅ ${data.count} transactions imported successfully!`)
      onClose()
    },
  })

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const validRows = rows.filter(r => r._valid)
  const errorRows = rows.filter(r => !r._valid)

  const handleImport = () => {
    if (validRows.length === 0) return
    bulkCreate.mutate(validRows.map(r => ({
      amount: r.amount,
      type: r.type,
      direction: r.direction,
      description: r.description,
      date: r.date,
      notes: r.notes,
    })))
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'finplan_sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const TYPE_COLOR: Record<string, string> = {
    income: 'text-green-600',
    expense: 'text-red-600',
    investment: 'text-blue-600',
    transfer: 'text-gray-600',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Transactions</h2>
            <p className="text-xs text-gray-500 mt-0.5">Import up to 500 transactions from a CSV file</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {step === 'upload' ? (
            <div className="space-y-5">
              {/* Format guide */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-medium text-gray-700 mb-2">Required CSV columns:</p>
                <div className="flex flex-wrap gap-2">
                  {['date (YYYY-MM-DD)', 'description', 'amount (number)', 'type (income/expense/investment/transfer)'].map(c => (
                    <span key={c} className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-600">{c}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Optional: <span className="font-mono">notes</span></p>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleFile(file)
                }}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <p className="text-3xl mb-2">📂</p>
                <p className="font-medium text-gray-700">Drop your CSV here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Supports .csv files from any bank export</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>

              <div className="text-center">
                <button
                  onClick={downloadSample}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  ↓ Download sample CSV template
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
                  <span className="font-semibold text-green-700">{validRows.length}</span>
                  <span className="text-green-600"> ready to import</span>
                </div>
                {errorRows.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
                    <span className="font-semibold text-red-700">{errorRows.length}</span>
                    <span className="text-red-600"> rows will be skipped</span>
                  </div>
                )}
                <button
                  onClick={() => { setRows([]); setStep('upload') }}
                  className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Change file
                </button>
              </div>

              {/* Errors */}
              {errorRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600 space-y-1">
                  {errorRows.map((r, i) => <p key={i}>⚠ {r._error}</p>)}
                </div>
              )}

              {/* Preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2.5">Date</th>
                      <th className="text-left px-4 py-2.5">Description</th>
                      <th className="text-left px-4 py-2.5">Type</th>
                      <th className="text-right px-4 py-2.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {validRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{row.date}</td>
                        <td className="px-4 py-2.5 text-gray-800 max-w-[200px] truncate">{row.description}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('capitalize text-xs font-medium', TYPE_COLOR[row.type])}>
                            {row.type}
                          </span>
                        </td>
                        <td className={cn('px-4 py-2.5 text-right font-medium', TYPE_COLOR[row.type])}>
                          {row.direction === 'credit' ? '+' : '-'}{formatINR(BigInt(Math.round(row.amount * 100)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 50 && (
                  <p className="text-xs text-gray-400 text-center py-2 bg-gray-50">
                    Showing first 50 of {validRows.length} rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="p-6 border-t flex-shrink-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0 || bulkCreate.isPending}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {bulkCreate.isPending ? 'Importing…' : `Import ${validRows.length} Transactions`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
