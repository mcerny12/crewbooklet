import Foundation

// MARK: - Development Performance Monitor
@MainActor
class PerformanceMonitor: ObservableObject {
    static let shared = PerformanceMonitor()
    
    @Published var queryStats: [QueryStat] = []
    @Published var cacheHitRate: Double = 0.0
    
    private var cacheHits: Int = 0
    private var cacheMisses: Int = 0
    
    private init() {}
    
    // Track query performance
    func trackQuery<T>(_ operation: String, _ block: () async throws -> T) async rethrows -> T {
        let startTime = CFAbsoluteTimeGetCurrent()
        
        let result = try await block()
        
        let duration = CFAbsoluteTimeGetCurrent() - startTime
        
        if SupabaseConfig.shared.enableDebugLogging {
            addQueryStat(operation: operation, duration: duration)
        }
        
        return result
    }
    
    // Track cache performance
    func recordCacheHit() {
        cacheHits += 1
        updateCacheHitRate()
    }
    
    func recordCacheMiss() {
        cacheMisses += 1
        updateCacheHitRate()
    }
    
    private func updateCacheHitRate() {
        let total = cacheHits + cacheMisses
        cacheHitRate = total > 0 ? Double(cacheHits) / Double(total) : 0.0
    }
    
    private func addQueryStat(operation: String, duration: TimeInterval) {
        let stat = QueryStat(
            operation: operation,
            duration: duration,
            timestamp: Date()
        )
        
        queryStats.append(stat)
        
        // Keep only last 50 queries for memory efficiency
        if queryStats.count > 50 {
            queryStats.removeFirst()
        }
        
        // Log slow queries
        if duration > 1.0 {
            print("🐌 Slow query detected: \(operation) took \(String(format: "%.2f", duration))s")
        } else if duration > 0.5 {
            print("⚠️ Medium query: \(operation) took \(String(format: "%.2f", duration))s")
        } else {
            print("⚡ Fast query: \(operation) took \(String(format: "%.3f", duration))s")
        }
    }
    
    // Get performance summary
    func getPerformanceSummary() -> String {
        let avgDuration = queryStats.isEmpty ? 0 : queryStats.map(\.duration).reduce(0, +) / Double(queryStats.count)
        let slowQueries = queryStats.filter { $0.duration > 1.0 }.count
        
        return """
        🚀 Performance Summary:
        - Total Queries: \(queryStats.count)
        - Average Duration: \(String(format: "%.3f", avgDuration))s
        - Slow Queries (>1s): \(slowQueries)
        - Cache Hit Rate: \(String(format: "%.1f", cacheHitRate * 100))%
        - Cache Hits: \(cacheHits)
        - Cache Misses: \(cacheMisses)
        """
    }
    
    func logPerformanceSummary() {
        if SupabaseConfig.shared.enableDebugLogging {
            print(getPerformanceSummary())
        }
    }
    
    func clearStats() {
        queryStats.removeAll()
        cacheHits = 0
        cacheMisses = 0
        cacheHitRate = 0.0
    }
}

// MARK: - Query Statistics Model
struct QueryStat: Identifiable {
    let id = UUID()
    let operation: String
    let duration: TimeInterval
    let timestamp: Date
    
    var formattedDuration: String {
        return String(format: "%.3f", duration)
    }
    
    var isSlowQuery: Bool {
        return duration > 1.0
    }
} 