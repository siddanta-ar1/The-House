export default function KitchenLoading() {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-100 space-y-4 p-6">
            <div className="w-12 h-12 border-4 border-gray-700 border-t-yellow-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 font-medium animate-pulse">Loading kitchen queue...</p>
        </div>
    )
}
