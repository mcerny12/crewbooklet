import Foundation

struct SupabaseConfig {
    static let shared = SupabaseConfig()
    
    // Development configuration - easy to change later
    private let configs: [String: (url: String, key: String)] = [
        "development": (
            url: "https://ijrcjiziezunjaakmtln.supabase.co",
            key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcmNqaXppZXp1bmphYWttdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMTEzMTksImV4cCI6MjA2Njg4NzMxOX0.zIg1Q10E8v2pgF69U9r2jwFlf-HmFMSlqZCvHcm9qBQ"
        ),
        "production": (
            url: "", // Will be set later
            key: ""  // Will be set later
        )
    ]
    
    // Easy switch between environments
    private let currentEnvironment = "development"
    
    var supabaseURL: URL {
        guard let config = configs[currentEnvironment],
              let url = URL(string: config.url) else {
            fatalError("Invalid Supabase URL for environment: \(currentEnvironment)")
        }
        return url
    }
    
    var supabaseKey: String {
        guard let config = configs[currentEnvironment] else {
            fatalError("No Supabase config for environment: \(currentEnvironment)")
        }
        return config.key
    }
    
    // Development helpers
    var isDevelopment: Bool {
        return currentEnvironment == "development"
    }
    
    var enableDebugLogging: Bool {
        return isDevelopment
    }
} 