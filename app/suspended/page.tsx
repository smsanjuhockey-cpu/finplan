export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-red-200 p-12 text-center max-w-md shadow-sm">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-semibold text-gray-900">Account Suspended</h1>
        <p className="text-gray-500 text-sm mt-3 leading-relaxed">
          Your account has been suspended by an administrator.
          Please contact support to resolve this.
        </p>
        <a
          href="/login"
          className="inline-block mt-6 text-sm text-indigo-600 hover:underline"
        >
          Back to login
        </a>
      </div>
    </div>
  )
}
