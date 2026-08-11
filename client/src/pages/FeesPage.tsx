import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react'

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableFooter,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from '@/components/layout/DataTable'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { Modal } from '@/components/layout/Modal'
import { StatCards } from '@/components/layout/StatCards'
import { StatusBadge } from '@/components/layout/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import {
  apiGet,
  apiSend,
  type FeePayment,
  type FeeSummary,
  type FeeType,
  type Student,
  type User,
} from '@/lib/api'
import { canManageFees, canViewFees } from '@/lib/permissions'

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
]

const emptyBill = {
  student_id: '',
  fee_type_name: 'Monthly Fee',
  fee_type_id: '',
  amount: '',
  paid_amount: '0',
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  due_date: '',
  note: '',
}

function monthLabel(month: number) {
  return MONTHS.find((m) => m.value === Number(month))?.label || String(month)
}

function printBill(item: FeePayment) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  const balance = Number(item.amount) - Number(item.paid_amount)
  const html = `<!doctype html>
  <html>
    <head>
      <title>Fee Bill - ${item.student_code}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
        .wrap { max-width: 760px; margin: 0 auto; }
        .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
        .title { font-size:28px; font-weight:700; margin:0; }
        .muted { color:#64748b; }
        .card { border:1px solid #cbd5e1; border-radius:16px; padding:20px; margin:16px 0; }
        .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:14px 24px; }
        .label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; }
        .value { font-size:16px; font-weight:600; margin-top:4px; }
        .summary { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; margin-top:20px; }
        .pill { border-radius:999px; display:inline-block; padding:6px 12px; font-size:12px; font-weight:700; text-transform:capitalize; background:#e2e8f0; }
        .paid { background:#dcfce7; color:#166534; }
        .partial { background:#fef3c7; color:#92400e; }
        .unpaid { background:#e2e8f0; color:#475569; }
        .box { border:1px solid #cbd5e1; border-radius:12px; padding:16px; }
        .footer { margin-top:28px; font-size:12px; color:#64748b; }
        @media print { body { padding: 0; } .wrap { max-width: none; } }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="head">
          <div>
            <h1 class="title">Student Fee Bill</h1>
            <div class="muted">Generated from MIS system</div>
          </div>
          <div class="pill ${item.status}">${item.status}</div>
        </div>
        <div class="card">
          <div class="grid">
            <div><div class="label">Student</div><div class="value">${item.full_name}</div></div>
            <div><div class="label">Student Code</div><div class="value">${item.student_code}</div></div>
            <div><div class="label">Fee Type</div><div class="value">${item.fee_type_name}</div></div>
            <div><div class="label">Billing Period</div><div class="value">${monthLabel(Number(item.month))}/${item.year}</div></div>
            <div><div class="label">Due Date</div><div class="value">${item.due_date || '-'}</div></div>
            <div><div class="label">Paid At</div><div class="value">${item.paid_at ? String(item.paid_at).slice(0, 10) : '-'}</div></div>
          </div>
        </div>
        <div class="summary">
          <div class="box"><div class="label">Total Amount</div><div class="value">${Number(item.amount).toLocaleString()}</div></div>
          <div class="box"><div class="label">Paid Amount</div><div class="value">${Number(item.paid_amount).toLocaleString()}</div></div>
          <div class="box"><div class="label">Balance</div><div class="value">${balance.toLocaleString()}</div></div>
        </div>
        <div class="card">
          <div class="label">Note</div>
          <div class="value">${item.note || '-'}</div>
        </div>
        <div class="footer">Printed on ${new Date().toLocaleString()}</div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
  </html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
}

export default function FeesPage() {
  const { user } = useOutletContext<{ user: User }>()
  const canView = canViewFees(user.role)
  const canManageBills = canManageFees(user.role)

  const [types, setTypes] = useState<FeeType[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [summary, setSummary] = useState<FeeSummary | null>(null)
  const [billForm, setBillForm] = useState(emptyBill)
  const [editingBillId, setEditingBillId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1))
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const panelTitle = useMemo(
    () => (editingBillId ? 'Update bill' : 'Create bill'),
    [editingBillId]
  )

  const paid = Number(billForm.paid_amount || 0)
  const amount = Number(billForm.amount || 0)
  const billStatus =
    paid <= 0 ? 'unpaid' : paid >= amount && amount > 0 ? 'paid' : 'partial'
  const needsDueDate = billStatus === 'partial'

  async function load() {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams()
      if (statusFilter) query.set('status', statusFilter)
      if (monthFilter) query.set('month', monthFilter)
      if (yearFilter) query.set('year', yearFilter)

      const summaryQuery = new URLSearchParams()
      if (monthFilter) summaryQuery.set('month', monthFilter)
      if (yearFilter) summaryQuery.set('year', yearFilter)

      const [feeTypes, stuList, bills, sum] = await Promise.all([
        apiGet<FeeType[]>('/api/fee-types'),
        apiGet<Student[]>('/api/students?status=active'),
        apiGet<FeePayment[]>(`/api/fee-payments?${query.toString()}`),
        apiGet<FeeSummary>(`/api/fee-payments/summary?${summaryQuery.toString()}`),
      ])
      setTypes(feeTypes)
      setStudents(stuList)
      setPayments(bills)
      setSummary(sum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) void load()
  }, [canView]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!canView) return <Navigate to="/dashboard" replace />

  function openCreate() {
    setEditingBillId(null)
    setBillForm({
      ...emptyBill,
      month: monthFilter,
      year: yearFilter,
    })
    setError('')
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingBillId(null)
    setBillForm(emptyBill)
    setError('')
  }

  function startEditBill(item: FeePayment) {
    setEditingBillId(item.id)
    setBillForm({
      student_id: String(item.student_id),
      fee_type_id: String(item.fee_type_id ?? ''),
      fee_type_name: item.fee_type_name || '',
      amount: String(item.amount),
      paid_amount: String(item.paid_amount),
      month: String(item.month),
      year: String(item.year),
      due_date: item.due_date ? String(item.due_date).slice(0, 10) : '',
      note: item.note || '',
    })
    setError('')
    setPanelOpen(true)
  }

  function onFeeTypeChange(name: string) {
    const selected = types.find((t) => t.name.toLowerCase() === name.trim().toLowerCase())
    setBillForm((f) => ({
      ...f,
      fee_type_name: name,
      fee_type_id: selected ? String(selected.id) : '',
      amount: selected ? String(selected.default_amount) : f.amount,
    }))
  }

  async function onSaveBill(e: FormEvent) {
    e.preventDefault()
    if (!canManageBills) return

    const feeTypeName = billForm.fee_type_name.trim()
    const amountValue = Number(billForm.amount)
    const paidValue = Number(billForm.paid_amount || 0)

    if (!editingBillId && !billForm.student_id) {
      setError('Please select a student.')
      return
    }
    if (!editingBillId && !feeTypeName) {
      setError('Please enter a fee type name.')
      return
    }
    if (!(amountValue > 0)) {
      setError('Amount must be greater than 0.')
      return
    }
    if (needsDueDate && !billForm.due_date) {
      setError('Due date is required when the payment is partial.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingBillId) {
        await apiSend(`/api/fee-payments/${editingBillId}`, 'PUT', {
          amount: amountValue,
          paid_amount: paidValue,
          due_date: needsDueDate ? billForm.due_date : null,
          note: billForm.note || null,
        })
      } else {
        await apiSend('/api/fee-payments', 'POST', {
          student_id: Number(billForm.student_id),
          fee_type_id: billForm.fee_type_id ? Number(billForm.fee_type_id) : null,
          fee_type_name: feeTypeName,
          amount: amountValue,
          paid_amount: paidValue,
          month: Number(billForm.month),
          year: Number(billForm.year),
          due_date: needsDueDate ? billForm.due_date : null,
          note: billForm.note || null,
        })
      }
      closePanel()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteBill(id: number) {
    if (!canManageBills) return
    if (!confirm('Delete this fee bill?')) return
    try {
      await apiSend(`/api/fee-payments/${id}`, 'DELETE')
      if (editingBillId === id) closePanel()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="Create fee bills, track payments, and print student invoices."
        actions={
          canManageBills ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              Create bill
            </Button>
          ) : undefined
        }
      />

      {error && !panelOpen ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <StatCards
        items={[
          { label: 'Total bills', value: summary?.total_bills ?? 0 },
          {
            label: 'Unpaid students',
            value: summary?.unpaid_count ?? 0,
            hint: summary?.month
              ? `No payment in ${monthLabel(summary.month)}/${summary.year}`
              : undefined,
          },
          { label: 'Total billed', value: Number(summary?.total_amount ?? 0).toLocaleString() },
          { label: 'Collected', value: Number(summary?.collected_amount ?? 0).toLocaleString() },
        ]}
      />

      <PageToolbar>
        <div className="flex w-full flex-wrap items-center gap-3">
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="unpaid">Unpaid / No payment</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </SelectField>
          <SelectField
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-32"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </SelectField>
          <Input
            type="number"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-28"
            placeholder="Year"
          />
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Apply filters
          </Button>
        </div>
      </PageToolbar>

      <DataTable minWidth="760px">
        <DataTableHead>
          <DataTableHeaderCell>Student</DataTableHeaderCell>
          <DataTableHeaderCell>Type</DataTableHeaderCell>
          <DataTableHeaderCell>Period</DataTableHeaderCell>
          <DataTableHeaderCell>Paid / Amount</DataTableHeaderCell>
          <DataTableHeaderCell>Due</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </DataTableHead>
        <DataTableBody>
          {payments.map((item) => {
            const isMissingBill = Boolean(item.missing_bill)
            const rowKey = item.id ?? `missing-${item.student_id}-${item.month}-${item.year}`

            return (
              <DataTableRow key={rowKey}>
                <DataTableCell>
                  <div className="font-medium">{item.full_name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{item.student_code}</div>
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {isMissingBill ? '—' : item.fee_type_name}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {monthLabel(Number(item.month))}/{item.year}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {isMissingBill
                    ? '—'
                    : `${Number(item.paid_amount).toLocaleString()} / ${Number(item.amount).toLocaleString()}`}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">{item.due_date || '—'}</DataTableCell>
                <DataTableCell>
                  {isMissingBill ? (
                    <>
                      <StatusBadge status="unpaid" />
                      <span className="ml-2 text-xs text-muted-foreground">No payment</span>
                    </>
                  ) : (
                    <>
                      <StatusBadge status={item.status} />
                      {item.status === 'partial' ? (
                        <span className="ml-2 text-xs text-muted-foreground">Partial payment</span>
                      ) : null}
                    </>
                  )}
                </DataTableCell>
                <DataTableCell className="text-right">
                  {!isMissingBill ? (
                    <div className="inline-flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => printBill(item)} title="Print">
                        <Printer className="size-3.5" />
                      </Button>
                      {canManageBills ? (
                        <>
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEditBill(item)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => item.id && void onDeleteBill(item.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </DataTableCell>
              </DataTableRow>
            )
          })}
          {!loading && payments.length === 0 ? (
            <DataTableEmpty
              colSpan={7}
              message={
                statusFilter === 'unpaid'
                  ? 'No unpaid students for this month. All active students have paid.'
                  : 'No fee bills found.'
              }
            />
          ) : null}
          {loading ? <DataTableEmpty colSpan={7} loading /> : null}
        </DataTableBody>
      </DataTable>
      <DataTableFooter>
        <span>
          {loading
            ? 'Loading…'
            : statusFilter === 'unpaid'
              ? `${payments.length} unpaid student(s)`
              : `${payments.length} bill(s)`}
        </span>
      </DataTableFooter>

      <Modal
        open={panelOpen}
        onClose={closePanel}
        title={panelTitle}
        description="Due date is only required for partial payments."
        wide
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closePanel}>
              Cancel
            </Button>
            <Button type="submit" form="bill-form" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editingBillId ? 'Save changes' : 'Create bill'}
            </Button>
          </div>
        }
      >
        {error && panelOpen ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form id="bill-form" className="space-y-4" onSubmit={onSaveBill}>
          {!editingBillId ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="bill-stu">Student</Label>
                <SelectField
                  id="bill-stu"
                  required
                  value={billForm.student_id}
                  onChange={(e) => setBillForm((f) => ({ ...f, student_id: e.target.value }))}
                >
                  <option value="">Select student</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.student_code} — {stu.full_name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-type">Fee type</Label>
                <Input
                  id="bill-type"
                  required
                  list="fee-type-options"
                  value={billForm.fee_type_name}
                  onChange={(e) => onFeeTypeChange(e.target.value)}
                  placeholder="Monthly Fee"
                />
                <datalist id="fee-type-options">
                  {types.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bill-month">Month</Label>
                  <SelectField
                    id="bill-month"
                    required
                    value={billForm.month}
                    onChange={(e) => setBillForm((f) => ({ ...f, month: e.target.value }))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-year">Year</Label>
                  <Input
                    id="bill-year"
                    type="number"
                    required
                    value={billForm.year}
                    onChange={(e) => setBillForm((f) => ({ ...f, year: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bill-amount">Amount</Label>
              <Input
                id="bill-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={billForm.amount}
                onChange={(e) => setBillForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-paid">Paid amount</Label>
              <Input
                id="bill-paid"
                type="number"
                min="0"
                step="0.01"
                required
                value={billForm.paid_amount}
                onChange={(e) => setBillForm((f) => ({ ...f, paid_amount: e.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="font-medium">Status: {billStatus}</div>
            <p className="mt-1 text-muted-foreground">
              {needsDueDate
                ? 'Add a due date for the remaining balance.'
                : 'Due date is not needed unless payment is partial.'}
            </p>
          </div>

          {needsDueDate ? (
            <div className="space-y-2">
              <Label htmlFor="bill-due">Due date</Label>
              <Input
                id="bill-due"
                type="date"
                required
                value={billForm.due_date}
                onChange={(e) => setBillForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="bill-note">Note</Label>
            <Input
              id="bill-note"
              value={billForm.note}
              onChange={(e) => setBillForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
