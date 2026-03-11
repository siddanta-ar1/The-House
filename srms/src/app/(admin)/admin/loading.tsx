export default function AdminLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-in fade-in duration-500">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Loading amazing things...</p>
        </div>
    )
}
