export default function PageSkeleton({ rows = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
          <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 mb-2" />
          <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}
