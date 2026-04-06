export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">FinPlan</h1>
          <p className="text-gray-500 text-sm mt-1">Your Financial Operating System</p>
        </div>
        {children}
      </div>
    </div>
  )
}
