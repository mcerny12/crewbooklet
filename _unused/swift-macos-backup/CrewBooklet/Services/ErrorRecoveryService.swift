import Foundation

// MARK: - Development Error Recovery Service
class ErrorRecoveryService {
    static let shared = ErrorRecoveryService()
    
    private init() {}
    
    // Retry configuration for development
    private struct RetryConfig {
        static let maxRetries = 3
        static let baseDelay: TimeInterval = 1.0
        static let maxDelay: TimeInterval = 8.0
    }
    
    // Execute operation with retry logic and detailed error reporting
    func executeWithRetry<T>(
        operation: String,
        maxRetries: Int = RetryConfig.maxRetries,
        block: @escaping () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 1...(maxRetries + 1) {
            do {
                if SupabaseConfig.shared.enableDebugLogging && attempt > 1 {
                    print("🔄 Retry attempt \(attempt) for \(operation)")
                }
                
                let result = try await block()
                
                if SupabaseConfig.shared.enableDebugLogging && attempt > 1 {
                    print("✅ \(operation) succeeded on attempt \(attempt)")
                }
                
                return result
            } catch {
                lastError = error
                
                if SupabaseConfig.shared.enableDebugLogging {
                    print("❌ \(operation) failed on attempt \(attempt): \(error.localizedDescription)")
                    logDetailedError(error, operation: operation, attempt: attempt)
                }
                
                // Don't retry on final attempt
                if attempt <= maxRetries {
                    let delay = calculateDelay(for: attempt)
                    if SupabaseConfig.shared.enableDebugLogging {
                        print("⏳ Waiting \(String(format: "%.1f", delay))s before retry...")
                    }
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
        
        // All retries failed
        if SupabaseConfig.shared.enableDebugLogging {
            print("💥 \(operation) failed after \(maxRetries + 1) attempts")
        }
        
        throw lastError ?? NetworkError.unknown
    }
    
    // Calculate exponential backoff delay
    private func calculateDelay(for attempt: Int) -> TimeInterval {
        let delay = RetryConfig.baseDelay * pow(2.0, Double(attempt - 1))
        return min(delay, RetryConfig.maxDelay)
    }
    
    // Detailed error logging for development
    private func logDetailedError(_ error: Error, operation: String, attempt: Int) {
        guard SupabaseConfig.shared.enableDebugLogging else { return }
        
        print("🔍 Detailed Error Analysis for \(operation) (Attempt \(attempt)):")
        print("   Type: \(type(of: error))")
        print("   Description: \(error.localizedDescription)")
        
        // Check for specific error types
        if let urlError = error as? URLError {
            print("   URL Error Code: \(urlError.code.rawValue)")
            print("   URL: \(urlError.failingURL?.absoluteString ?? "Unknown")")
            
            switch urlError.code {
            case .notConnectedToInternet:
                print("   💡 Suggestion: Check internet connection")
            case .timedOut:
                print("   💡 Suggestion: Request timed out, server may be slow")
            case .cannotFindHost:
                print("   💡 Suggestion: Check Supabase URL configuration")
            case .networkConnectionLost:
                print("   💡 Suggestion: Network connection was lost during request")
            default:
                print("   💡 Suggestion: Generic network error, check connectivity")
            }
        }
        
        // Check if it's a Supabase-specific error
        if error.localizedDescription.contains("401") {
            print("   💡 Suggestion: Authentication error - check API key")
        } else if error.localizedDescription.contains("403") {
            print("   💡 Suggestion: Permission denied - check RLS policies")
        } else if error.localizedDescription.contains("500") {
            print("   💡 Suggestion: Server error - check Supabase status")
        }
    }
    
    // Check if error is retryable
    func isRetryableError(_ error: Error) -> Bool {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .networkConnectionLost, .notConnectedToInternet:
                return true
            default:
                return false
            }
        }
        
        // Check HTTP status codes in error description (basic check)
        let errorString = error.localizedDescription
        if errorString.contains("500") || errorString.contains("502") || 
           errorString.contains("503") || errorString.contains("504") {
            return true
        }
        
        return false
    }
    
    // Get user-friendly error message
    func getUserFriendlyMessage(for error: Error) -> String {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return "No internet connection. Please check your network."
            case .timedOut:
                return "Request timed out. Please try again."
            case .cannotFindHost:
                return "Cannot connect to server. Please check your connection."
            default:
                return "Network error occurred. Please try again."
            }
        }
        
        let errorString = error.localizedDescription.lowercased()
        if errorString.contains("401") {
            return "Authentication error. Please check your credentials."
        } else if errorString.contains("403") {
            return "Permission denied. You don't have access to this resource."
        } else if errorString.contains("500") {
            return "Server error. Please try again later."
        }
        
        return "An unexpected error occurred. Please try again."
    }
}

// MARK: - Custom Network Errors
enum NetworkError: LocalizedError {
    case unknown
    case retryLimitExceeded
    case invalidResponse
    
    var errorDescription: String? {
        switch self {
        case .unknown:
            return "Unknown network error"
        case .retryLimitExceeded:
            return "Maximum retry attempts exceeded"
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
} 