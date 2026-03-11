export default function CustomerLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-6">
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-[var(--color-primary)] rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Preparing Menu</h3>
                <p className="text-sm text-gray-500">Just a moment...</p>
            </div>
        </div>
    )
}
