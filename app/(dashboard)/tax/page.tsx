export default function TaxPage() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center max-w-lg mx-auto mt-10">
      <p className="text-4xl mb-4">🧾</p>
      <h2 className="text-xl font-semibold text-gray-800">Tax Planning Not Available</h2>
      <p className="text-gray-500 text-sm mt-3 leading-relaxed">
        Providing personalised tax advice requires a registered tax practitioner licence.
        For tax planning, please consult a qualified Chartered Accountant (CA) or registered tax advisor.
      </p>
      <p className="text-gray-400 text-xs mt-4">
        Tip: You can mark individual transactions as tax-relevant in the{' '}
        <a href="/transactions" className="text-indigo-500 hover:underline">Transactions</a> page.
      </p>
    </div>
  )
}
