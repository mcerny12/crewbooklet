import Foundation
import Supabase

// MARK: - Data Cache Manager
@MainActor
class DataCache: ObservableObject {
    static let shared = DataCache()
    
    // In-memory cache that persists until app closes
    @Published var people: [Person] = []
    @Published var projects: [Project] = []
    @Published var organizations: [Organization] = []
    @Published var projectAssignments: [UUID: [(ProjectAssignment, Person)]] = [:]
    
    // Cache metadata - thread-safe access
    private var lastFetch: [String: Date] = [:]
    private let cacheTimeout: TimeInterval = 30 // 30 seconds before considering stale
    private let queue = DispatchQueue(label: "com.crewbooklet.cache", attributes: .concurrent)
    
    // 🔧 FIX: Add cache size limits
    private let maxCacheSize = 1000 // Maximum items per collection
    
    // 🔧 FIX: Better cache key management
    private enum CacheKey: String, CaseIterable {
        case people = "people"
        case projects = "projects"
        case organizations = "organizations"
        
        func assignmentKey(for projectId: UUID) -> String {
            return "assignments_\(projectId)"
        }
    }
    
    private init() {
        print("💾 DataCache initialized - data will persist until app closes")
    }
    
    // MARK: - Cache Validation (Thread-Safe)
    func isCacheValid(for key: String) -> Bool {
        return queue.sync {
            guard let lastFetchTime = lastFetch[key] else { return false }
            let isValid = Date().timeIntervalSince(lastFetchTime) < cacheTimeout
            
            // Development logging
            if SupabaseConfig.shared.enableDebugLogging {
                let age = Date().timeIntervalSince(lastFetchTime)
                print("🕐 Cache for '\(key)': age \(String(format: "%.1f", age))s, valid: \(isValid)")
            }
            
            return isValid
        }
    }
    
    private func updateFetchTime(for key: String) {
        Task { @MainActor in
            self.lastFetch[key] = Date()
        }
    }
    
    // MARK: - Cache Management
    func hasCachedData(for key: String) -> Bool {
        switch key {
        case "people": return !people.isEmpty
        case "projects": return !projects.isEmpty
        case "organizations": return !organizations.isEmpty
        default: return false
        }
    }
    
    func clearAllCache() {
        print("🗑️ Clearing all cached data")
        people.removeAll()
        projects.removeAll()
        organizations.removeAll()
        projectAssignments.removeAll()
        lastFetch.removeAll()
    }
    
    // 🔧 NEW: Get cache statistics with development details
    func getCacheStats() -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB]
        formatter.countStyle = .memory
        
        let totalMemoryUsage = MemoryLayout<Person>.size * people.count +
                               MemoryLayout<Project>.size * projects.count +
                               MemoryLayout<Organization>.size * organizations.count
        
        return """
        📊 Cache Statistics:
        - People: \(people.count) items
        - Projects: \(projects.count) items  
        - Organizations: \(organizations.count) items
        - Project Assignments: \(projectAssignments.count) projects
        - Last Fetch Times: \(lastFetch.count) entries
        - Memory Usage: ~\(formatter.string(fromByteCount: Int64(totalMemoryUsage)))
        - Cache Timeout: \(cacheTimeout)s
        """
    }
    
    // Development helper: Print cache stats to console
    func logCacheStats() {
        if SupabaseConfig.shared.enableDebugLogging {
            print(getCacheStats())
        }
    }
    
    // MARK: - Smart Cache Updates (Thread-Safe)
    func updatePeople(_ newPeople: [Person]) {
        // 🔧 FIX: Enforce cache size limits
        let limitedPeople = Array(newPeople.prefix(maxCacheSize))
        people = limitedPeople
        updateFetchTime(for: "people")
        print("💾 Cached \(limitedPeople.count) people")
        
        if newPeople.count > maxCacheSize {
            print("⚠️ People cache truncated from \(newPeople.count) to \(maxCacheSize) items")
        }
    }
    
    func updateProjects(_ newProjects: [Project]) {
        // 🔧 FIX: Enforce cache size limits
        let limitedProjects = Array(newProjects.prefix(maxCacheSize))
        projects = limitedProjects
        updateFetchTime(for: "projects")
        print("💾 Cached \(limitedProjects.count) projects")
        
        if newProjects.count > maxCacheSize {
            print("⚠️ Projects cache truncated from \(newProjects.count) to \(maxCacheSize) items")
        }
    }
    
    func updateOrganizations(_ newOrganizations: [Organization]) {
        // 🔧 FIX: Enforce cache size limits
        let limitedOrganizations = Array(newOrganizations.prefix(maxCacheSize))
        organizations = limitedOrganizations
        updateFetchTime(for: "organizations")
        print("💾 Cached \(limitedOrganizations.count) organizations")
        
        if newOrganizations.count > maxCacheSize {
            print("⚠️ Organizations cache truncated from \(newOrganizations.count) to \(maxCacheSize) items")
        }
    }
    
    func updateProjectAssignments(for projectId: UUID, assignments: [(ProjectAssignment, Person)]) {
        projectAssignments[projectId] = assignments
        updateFetchTime(for: "assignments_\(projectId)")
        print("💾 Cached \(assignments.count) assignments for project \(projectId)")
    }
}

class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    private let client: SupabaseClient

    // 🔧 FIX: Store subscription tasks for proper cleanup
    private var subscriptionTasks: [String: [Task<Void, Never>]] = [:]

    // MARK: - Enhanced JSON Encoding/Decoding for Complex Types
    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }()

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()

    private init() {
        let config = SupabaseConfig.shared
        self.client = SupabaseClient(
            supabaseURL: config.supabaseURL,
            supabaseKey: config.supabaseKey
        )

        if config.enableDebugLogging {
            print("🚀 SupabaseService initialized with smart caching (Development Mode)")
            print("📡 Connected to: \(config.supabaseURL.host ?? "unknown")")
        }
    }

    // MARK: - User ID Helper
    @MainActor
    private func getCurrentUserId() -> UUID? {
        return UserSessionManager.shared.userId
    }
    
    // 🔧 FIX: Add cleanup method
    deinit {
        cleanupSubscriptions()
    }
    
    private func cleanupSubscriptions() {
        // 🔧 TEMPORARILY DISABLED to fix crash
        print("🧹 SupabaseService: Realtime subscriptions disabled")
    }
    
    // MARK: - Smart Cached Operations
    
    /// Fetch people with intelligent caching
    func fetchPeople(forceRefresh: Bool = false) async throws -> [Person] {
        return try await PerformanceMonitor.shared.trackQuery("fetchPeople") {
            print("🔄 Fetching people (cache-aware)...")
            
            let cache = await DataCache.shared
            
            // Return cached data immediately if available and not forced refresh
            let hasCachedData = await cache.hasCachedData(for: "people")
            if !forceRefresh && hasCachedData {
                let cachedPeople = await cache.people
                await PerformanceMonitor.shared.recordCacheHit()
                print("⚡ Returning cached people (\(cachedPeople.count) items)")
                
                // Refresh in background if cache is stale
                let isCacheValid = await cache.isCacheValid(for: "people")
                if !isCacheValid {
                    print("🔄 Cache stale, refreshing in background...")
                    Task { 
                        await refreshPeopleInBackground() 
                    }
                }
                
                return cachedPeople
            }
            
            // Cache miss - fetch fresh data
            await PerformanceMonitor.shared.recordCacheMiss()
            print("🌐 Fetching fresh people from Supabase...")
            let response: [Person] = try await client
                .from("people")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value
            
            // Update cache
            await cache.updatePeople(response)
            
            print("✅ Successfully fetched \(response.count) people")
            return response
        }
    }
    
    /// Fetch projects with intelligent caching
    func fetchProjects(forceRefresh: Bool = false) async throws -> [Project] {
        print("🔄 Fetching projects (cache-aware)...")

        let cache = await DataCache.shared

        // Return cached data immediately if available and not forced refresh
        let hasCachedData = await cache.hasCachedData(for: "projects")
        if !forceRefresh && hasCachedData {
            let cachedProjects = await cache.projects
            print("⚡ Returning cached projects (\(cachedProjects.count) items)")

            // Refresh in background if cache is stale
            let isCacheValid = await cache.isCacheValid(for: "projects")
            if !isCacheValid {
                print("🔄 Cache stale, refreshing in background...")
                Task {
                    await refreshProjectsInBackground()
                }
            }

            return cachedProjects
        }

        // Fetch fresh data
        print("🌐 Fetching fresh projects from Supabase...")
        do {
            let response: [Project] = try await client
                .from("projects")
                .select("*")
                .order("creation_date", ascending: false)
                .execute()
                .value

            // Update cache
            await cache.updateProjects(response)

            print("✅ Successfully fetched \(response.count) projects")
            return response
        } catch {
            print("❌ Error fetching projects: \(error)")
            print("📋 Error details: \(error.localizedDescription)")

            // If it's a decoding error, clear all cache
            if error.localizedDescription.contains("decode") || error.localizedDescription.contains("type") {
                print("🗑️ Clearing all cache due to decoding error...")
                await cache.clearAllCache()
            }

            throw error
        }
    }
    
    /// Fetch organizations with intelligent caching
    func fetchOrganizations(forceRefresh: Bool = false) async throws -> [Organization] {
        print("🔄 Fetching organizations (cache-aware)...")
        
        let cache = await DataCache.shared
        
        // Return cached data immediately if available and not forced refresh
        let hasCachedData = await cache.hasCachedData(for: "organizations")
        if !forceRefresh && hasCachedData {
            let cachedOrganizations = await cache.organizations
            print("⚡ Returning cached organizations (\(cachedOrganizations.count) items)")
            
            // Refresh in background if cache is stale
            let isCacheValid = await cache.isCacheValid(for: "organizations")
            if !isCacheValid {
                print("🔄 Cache stale, refreshing in background...")
                Task { 
                    await refreshOrganizationsInBackground() 
                }
            }
            
            return cachedOrganizations
        }
        
        // Fetch fresh data
        print("🌐 Fetching fresh organizations from Supabase...")
        let response: [Organization] = try await client
            .from("organizations")
            .select()
            .order("created_at", ascending: false)
            .execute()
            .value
        
        // Update cache
        await cache.updateOrganizations(response)
        
        print("✅ Successfully fetched \(response.count) organizations")
        return response
    }
    
    // MARK: - Background Refresh Methods
    private func refreshPeopleInBackground() async {
        do {
            let response: [Person] = try await client
                .from("people")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value
            
            let cache = await DataCache.shared
            await cache.updatePeople(response)
            print("🔄 Background refresh: Updated people cache with \(response.count) items")
        } catch {
            print("⚠️ Background refresh failed for people: \(error)")
        }
    }
    
    private func refreshProjectsInBackground() async {
        do {
            let response: [Project] = try await client
                .from("projects")
                .select("*")
                .order("creation_date", ascending: false)
                .execute()
                .value
            
            let cache = await DataCache.shared
            await cache.updateProjects(response)
            print("🔄 Background refresh: Updated projects cache with \(response.count) items")
        } catch {
            print("⚠️ Background refresh failed for projects: \(error)")
        }
    }
    
    private func refreshOrganizationsInBackground() async {
        do {
            let response: [Organization] = try await client
                .from("organizations")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value
            
            let cache = await DataCache.shared
            await cache.updateOrganizations(response)
            print("🔄 Background refresh: Updated organizations cache with \(response.count) items")
        } catch {
            print("⚠️ Background refresh failed for organizations: \(error)")
        }
    }

    // MARK: - Cache-Aware CRUD Operations
    
    func addPerson(_ person: Person) async throws {
        try await ErrorRecoveryService.shared.executeWithRetry(operation: "addPerson") {
            print("➕ Adding person: \(person.name) with enhanced data...")

            // Set user_id before inserting
            var personWithUser = person
            if let userId = await self.getCurrentUserId() {
                personWithUser.userId = userId
            }

            // Add to database
            try await self.client
                .from("people")
                .insert(personWithUser)
                .execute()

            // Update cache immediately
            let cache = await DataCache.shared
            var updatedPeople = await cache.people
            updatedPeople.insert(personWithUser, at: 0) // Add at beginning
            await cache.updatePeople(updatedPeople)

            print("✅ Successfully added person: \(person.name)")
        }
    }
    
    func updatePerson(_ person: Person) async throws {
        print("🔄 Updating person: \(person.name) with enhanced data...")
        
        // Update in database
        try await client
            .from("people")
            .update(person)
            .eq("id", value: person.id)
            .execute()
        
        // Update cache immediately
        let cache = await DataCache.shared
        var updatedPeople = await cache.people
        if let index = updatedPeople.firstIndex(where: { $0.id == person.id }) {
            updatedPeople[index] = person
            await cache.updatePeople(updatedPeople)
        }
        
        print("✅ Successfully updated person: \(person.name)")
    }
    
    func deletePerson(id: UUID) async throws {
        print("🗑️ Deleting person with ID: \(id)")
        
        // Delete from database
        try await client
            .from("people")
            .delete()
            .eq("id", value: id)
            .execute()
        
        // Update cache immediately
        let cache = await DataCache.shared
        let updatedPeople = await cache.people.filter { $0.id != id }
        await cache.updatePeople(updatedPeople)
        
        print("✅ Successfully deleted person")
    }
    
    func addProject(_ project: Project) async throws {
        print("➕ Adding project: \(project.name)")

        // Set user_id before inserting
        var projectWithUser = project
        if let userId = await getCurrentUserId() {
            projectWithUser.userId = userId
        }

        // Add to database
        try await client
            .from("projects")
            .insert(projectWithUser)
            .execute()

        // Update cache immediately
        let cache = await DataCache.shared
        var updatedProjects = await cache.projects
        updatedProjects.insert(projectWithUser, at: 0) // Add at beginning
        await cache.updateProjects(updatedProjects)

        print("✅ Successfully added project: \(project.name)")
    }
    
    func updateProject(_ project: Project) async throws {
        print("🔄 Updating project: \(project.name)")
        
        // Update in database
        try await client
            .from("projects")
            .update(project)
            .eq("id", value: project.id)
            .execute()
        
        // Update cache immediately
        let cache = await DataCache.shared
        var updatedProjects = await cache.projects
        if let index = updatedProjects.firstIndex(where: { $0.id == project.id }) {
            updatedProjects[index] = project
            await cache.updateProjects(updatedProjects)
        }
        
        print("✅ Successfully updated project: \(project.name)")
    }
    
    func deleteProject(id: UUID) async throws {
        print("🗑️ Deleting project with ID: \(id)")
        
        // Delete from database
        try await client
            .from("projects")
            .delete()
            .eq("id", value: id)
            .execute()
        
        // Update cache immediately
        let cache = await DataCache.shared
        let updatedProjects = await cache.projects.filter { $0.id != id }
        await cache.updateProjects(updatedProjects)
        
        print("✅ Successfully deleted project")
    }
    
    func addOrganization(_ organization: Organization) async throws {
        print("➕ Adding organization: \(organization.name)")

        // Set user_id before inserting
        var organizationWithUser = organization
        if let userId = await getCurrentUserId() {
            organizationWithUser.userId = userId
        }

        // Add to database
        try await client
            .from("organizations")
            .insert(organizationWithUser)
            .execute()

        // Update cache immediately
        let cache = await DataCache.shared
        var updatedOrganizations = await cache.organizations
        updatedOrganizations.insert(organizationWithUser, at: 0)
        await cache.updateOrganizations(updatedOrganizations)

        print("✅ Successfully added organization: \(organization.name)")
    }
    
    func updateOrganization(_ organization: Organization) async throws {
        print("🔄 Updating organization: \(organization.name)")
        
        // Update in database
        try await client
            .from("organizations")
            .update(organization)
            .eq("id", value: organization.id)
            .execute()
        
        // Update cache immediately
        let cache = await DataCache.shared
        var updatedOrganizations = await cache.organizations
        if let index = updatedOrganizations.firstIndex(where: { $0.id == organization.id }) {
            updatedOrganizations[index] = organization
            await cache.updateOrganizations(updatedOrganizations)
        }
        
        print("✅ Successfully updated organization: \(organization.name)")
    }
    
    func deleteOrganization(id: UUID) async throws {
        print("🗑️ Deleting organization with ID: \(id)")
        
        // Delete from database
        try await client
            .from("organizations")
            .delete()
            .eq("id", value: id)
            .execute()
        
        // Update cache immediately
        let cache = await DataCache.shared
        let updatedOrganizations = await cache.organizations.filter { $0.id != id }
        await cache.updateOrganizations(updatedOrganizations)
        
        print("✅ Successfully deleted organization")
    }
    

    
    // MARK: - Advanced Person Queries for Enhanced Model
    
    /// Fetch people by specific job type
    func fetchPeopleByJob(_ jobType: JobType) async throws -> [Person] {
        print("🔍 Fetching people with job: \(jobType.displayName)")
        
        // Using PostgreSQL JSON operators to search within jobs array
        let response: [Person] = try await client
            .from("people")
            .select()
            .contains("jobs", value: [jobType.rawValue])
            .order("created_at", ascending: false)
            .execute()
            .value
        
        print("✅ Found \(response.count) people with job: \(jobType.displayName)")
        return response
    }
    
    /// Fetch people by language capability
    func fetchPeopleByLanguage(_ language: Language) async throws -> [Person] {
        print("🌐 Fetching people who speak: \(language.displayName)")
        
        let response: [Person] = try await client
            .from("people")
            .select()
            .contains("languages", value: [language.rawValue])
            .order("created_at", ascending: false)
            .execute()
            .value
        
        print("✅ Found \(response.count) people who speak: \(language.displayName)")
        return response
    }
    
    /// Fetch people by city
    func fetchPeopleByCity(_ city: String) async throws -> [Person] {
        print("🏙️ Fetching people in city: \(city)")
        
        let response: [Person] = try await client
            .from("people")
            .select()
            .eq("address->>city", value: city) // JSON field extraction
            .order("created_at", ascending: false)
            .execute()
            .value
        
        print("✅ Found \(response.count) people in city: \(city)")
        return response
    }
    
    /// Search people by multiple criteria
    func searchPeople(query: String) async throws -> [Person] {
        print("🔍 Searching people with query: \(query)")
        
        let response: [Person] = try await client
            .from("people")
            .select()
            .or("name.ilike.%\(query)%,email.ilike.%\(query)%,notes.ilike.%\(query)%")
            .order("created_at", ascending: false)
            .execute()
            .value
        
        print("✅ Found \(response.count) people matching: \(query)")
        return response
    }
    

    
    // MARK: - Project Assignment Operations (Enhanced)
    func assignPersonToProject(personId: UUID, projectId: UUID, role: String = "", department: CrewDepartment = .other) async throws {
        print("🔗 Assigning person \(personId) to project \(projectId)")

        // Get current user ID
        let userId = await getCurrentUserId()

        let assignment = ProjectAssignment(
            projectId: projectId,
            personId: personId,
            role: role,
            department: department,
            userId: userId
        )

        try await client
            .from("project_assignments")
            .insert(assignment)
            .execute()

        print("✅ Successfully assigned person to project")
    }
    
    func fetchProjectAssignments(projectId: UUID) async throws -> [ProjectAssignment] {
        print("📋 Fetching assignments for project: \(projectId)")
        
        let response: [ProjectAssignment] = try await client
            .from("project_assignments")
            .select()
            .eq("project_id", value: projectId)
            .execute()
            .value
        
        print("✅ Found \(response.count) assignments for project")
        return response
    }
    
    // MARK: - Enhanced Project Assignment Operations (Crew Management)
    func fetchProjectAssignmentsWithPeople(projectId: UUID) async throws -> [(ProjectAssignment, Person)] {
        print("👥📋 Fetching project assignments with person details for project: \(projectId)")
        
        // First fetch the assignments
        let assignments = try await fetchProjectAssignments(projectId: projectId)
        
        // Then fetch the corresponding people
        var assignmentsWithPeople: [(ProjectAssignment, Person)] = []
        
        for assignment in assignments {
            do {
                let personResponse: [Person] = try await client
                    .from("people")
                    .select()
                    .eq("id", value: assignment.personId)
                    .limit(1)
                    .execute()
                    .value
                
                if let person = personResponse.first {
                    assignmentsWithPeople.append((assignment, person))
                }
            } catch {
                print("⚠️ Could not fetch person \(assignment.personId) for assignment: \(error)")
            }
        }
        
        print("✅ Found \(assignmentsWithPeople.count) assignments with person details")
        return assignmentsWithPeople
    }
    
    func addProjectAssignment(_ assignment: ProjectAssignment) async throws {
        print("➕ Adding assignment to project: \(assignment.projectId)")

        // Set user_id before inserting
        var assignmentWithUser = assignment
        if let userId = await getCurrentUserId() {
            assignmentWithUser.userId = userId
        }

        try await client
            .from("project_assignments")
            .insert(assignmentWithUser)
            .execute()

        print("✅ Successfully added assignment to project")
    }
    
    func updateProjectAssignment(_ assignment: ProjectAssignment) async throws {
        print("🔄 Updating assignment: \(assignment.id)")
        
        try await client
            .from("project_assignments")
            .update(assignment)
            .eq("id", value: assignment.id)
            .execute()
        
        print("✅ Successfully updated assignment")
    }
    
    func removeProjectAssignment(id: UUID) async throws {
        print("🗑️ Removing assignment: \(id)")
        
        try await client
            .from("project_assignments")
            .delete()
            .eq("id", value: id)
            .execute()
        
        print("✅ Successfully removed assignment from project")
    }
    
    // MARK: - Realtime Subscriptions (TEMPORARILY DISABLED)
    func subscribeToTableChanges<T: Codable>(
        table: String,
        type: T.Type,
        onInsert: @escaping (T) -> Void,
        onUpdate: @escaping (T) -> Void,
        onDelete: @escaping (String) -> Void
    ) async {
        print("📡 Realtime subscriptions disabled to prevent crashes")
        print("🔄 App will use polling for data updates instead")
        // 🔧 TEMPORARILY DISABLED - was causing thread safety crashes
        // Will be re-enabled with proper synchronization later
    }
    
    // 🔧 TEMPORARILY DISABLED: Method to cleanup specific table subscriptions
    func unsubscribeFromTable(_ table: String) {
        print("🧹 Realtime subscriptions disabled - no cleanup needed for: \(table)")
    }
    
    // MARK: - Database Health & Migration Support
    func testConnection() async throws -> Bool {
        print("🩺 Testing Supabase connection...")
        
        do {
            let _ = try await client
                .from("people")
                .select("id")
                .limit(1)
                .execute()
            
            print("✅ Supabase connection healthy")
            return true
        } catch {
            print("❌ Supabase connection failed: \(error)")
            throw error
        }
    }
    
    func getTableInfo(table: String) async throws -> Bool {
        print("📊 Getting table info for: \(table)")
        
        do {
            let _ = try await client
                .from(table)
                .select("*")
                .limit(1)
                .execute()
            
            print("✅ Table \(table) exists and is accessible")
            return true
        } catch {
            print("❌ Table \(table) error: \(error)")
            return false
        }
    }
    
    // MARK: - Advanced Search Operations
    
    /// Comprehensive search across all tables with relationships
    func performComprehensiveSearch(query: String) async throws -> SearchResults {
        print("🔍 Performing comprehensive search for: '\(query)'")
        
        var results = SearchResults()
        
        // Search people and their connected organizations
        let people = try await searchPeopleWithOrganizations(query: query)
        results.people = people
        
        // Search organizations and their connected people
        let organizations = try await searchOrganizationsWithPeople(query: query)
        results.organizations = organizations
        
        // Search projects and their connected organizations
        let projects = try await searchProjectsWithOrganizations(query: query)
        results.projects = projects
        
        print("✅ Search complete - Found \(people.count) people, \(organizations.count) organizations, \(projects.count) projects")
        return results
    }
    
    // MARK: - Advanced Search Data Fetching (for AdvancedSearchViewModel)
    
    /// Fetch all people for advanced search (always fresh data)
    func fetchAllPeople() async throws -> [Person] {
        print("🔍 Fetching all people for advanced search...")
        return try await fetchPeople(forceRefresh: true)
    }
    
    /// Fetch all projects for advanced search (always fresh data)
    func fetchAllProjects() async throws -> [Project] {
        print("🔍 Fetching all projects for advanced search...")
        return try await fetchProjects(forceRefresh: true)
    }
    
    /// Fetch all organizations for advanced search (always fresh data)
    func fetchAllOrganizations() async throws -> [Organization] {
        print("🔍 Fetching all organizations for advanced search...")
        return try await fetchOrganizations(forceRefresh: true)
    }
    
    /// Search people and fetch their connected organizations
    private func searchPeopleWithOrganizations(query: String) async throws -> [PersonSearchResult] {
        print("👥 Searching people with organizations for: '\(query)'")
        
        // Search people by name, email, notes, or job
        let peopleResponse: [Person] = try await client
            .from("people")
            .select()
            .or("name.ilike.%\(query)%,email.ilike.%\(query)%,notes.ilike.%\(query)%")
            .limit(10)
            .execute()
            .value
        
        // For each person, find their connected organization using the organizationId
        var searchResults: [PersonSearchResult] = []
        
        for person in peopleResponse {
            var connectedOrganization: Organization? = nil
            
            // Fetch connected organization if person has organizationId
            if let organizationId = person.organizationId {
                do {
                    let orgResponse: [Organization] = try await client
                        .from("organizations")
                        .select()
                        .eq("id", value: organizationId)
                        .limit(1)
                        .execute()
                        .value
                    connectedOrganization = orgResponse.first
                } catch {
                    print("⚠️ Could not fetch organization for person \(person.name): \(error)")
                }
            }
            
            let searchResult = PersonSearchResult(
                id: person.id,
                person: person,
                connectedOrganization: connectedOrganization
            )
            searchResults.append(searchResult)
        }
        
        print("✅ Found \(searchResults.count) people with organization connections")
        return searchResults
    }
    
    /// Search organizations and fetch their connected people
    private func searchOrganizationsWithPeople(query: String) async throws -> [OrganizationSearchResult] {
        print("🏢 Searching organizations with people for: '\(query)'")
        
        // Search organizations by name
        let orgsResponse: [Organization] = try await client
            .from("organizations")
            .select()
            .or("name.ilike.%\(query)%")
            .limit(10)
            .execute()
            .value
        
        // For each organization, find connected people using organizationId
        var searchResults: [OrganizationSearchResult] = []
        
        for organization in orgsResponse {
            var connectedPeople: [Person] = []
            
            // Fetch people connected to this organization
            do {
                let response: [Person] = try await client
                    .from("people")
                    .select()
                    .eq("organization_id", value: organization.id)
                    .execute()
                    .value
                connectedPeople = response
            } catch {
                print("⚠️ Could not fetch people for organization \(organization.name): \(error)")
            }
            
            let searchResult = OrganizationSearchResult(
                id: organization.id,
                organization: organization,
                connectedPeople: connectedPeople
            )
            searchResults.append(searchResult)
        }
        
        print("✅ Found \(searchResults.count) organizations with people connections")
        return searchResults
    }
    
    /// Search projects and fetch their connected organizations
    private func searchProjectsWithOrganizations(query: String) async throws -> [ProjectSearchResult] {
        print("📁 Searching projects with organizations for: '\(query)'")
        
        // Search projects by name, project number, description, or status
        let projectsResponse: [Project] = try await client
            .from("projects")
            .select()
            .or("name.ilike.%\(query)%,project_number.ilike.%\(query)%,description.ilike.%\(query)%")
            .limit(10)
            .execute()
            .value
        
        // For each project, find connected organization (client)
        var searchResults: [ProjectSearchResult] = []
        
        for project in projectsResponse {
            var connectedOrganization: Organization? = nil
            
            // Try to find client organization
            if let clientOrgId = project.clientOrganizationId {
                do {
                    let orgResponse: [Organization] = try await client
                        .from("organizations")
                        .select()
                        .eq("id", value: clientOrgId)
                        .limit(1)
                        .execute()
                        .value
                    connectedOrganization = orgResponse.first
                } catch {
                    print("⚠️ Could not fetch client organization for project \(project.name): \(error)")
                }
            }
            
            let searchResult = ProjectSearchResult(
                id: project.id,
                project: project,
                connectedOrganization: connectedOrganization
            )
            searchResults.append(searchResult)
        }
        
        print("✅ Found \(searchResults.count) projects with organization connections")
        return searchResults
    }
    
    // MARK: - Enhanced People Operations with Organization Relationships
    func fetchPeopleWithOrganizations() async throws -> [Person] {
        print("🔄 Fetching people with organization data...")
        
        let response: [Person] = try await client
            .from("people")
            .select("*, organizations(*)")
            .order("created_at", ascending: false)
            .execute()
            .value
        
        print("✅ Successfully fetched \(response.count) people with organization relationships")
        return response
    }
    
    /// Fetch all people belonging to an organization
    func fetchPeopleByOrganization(_ organizationId: UUID) async throws -> [Person] {
        print("🔄 Fetching people for organization: \(organizationId)")
        
        let response: [Person] = try await client
            .from("people")
            .select()
            .eq("organization_id", value: organizationId)
            .execute()
            .value
        
        print("✅ Found \(response.count) people in organization")
        return response
    }
    
    // MARK: - Enhanced Project Queries
    
    /// Fetch all projects where a person is assigned
    func fetchProjectsForPerson(_ personId: UUID) async throws -> [Project] {
        print("🔄 Fetching projects for person: \(personId)")
        
        let response: [Project] = try await client
            .rpc("get_projects_for_person", params: ["person_id": personId.uuidString])
            .execute()
            .value
        
        print("✅ Found \(response.count) projects for person")
        return response
    }
    
    /// Fetch all projects where an organization is the client or is involved
    func fetchProjectsForOrganization(_ organizationId: UUID) async throws -> [Project] {
        print("🔄 Fetching projects for organization: \(organizationId)")
        
        let response: [Project] = try await client
            .rpc("get_projects_for_organization", params: ["org_id": organizationId.uuidString])
            .execute()
            .value
        
        print("✅ Found \(response.count) projects for organization")
        return response
    }
    
    /// Fetch all people assigned to a project
    func fetchPeopleForProject(_ projectId: UUID) async throws -> [(Person, ProjectAssignment)] {
        print("🔄 Fetching people for project: \(projectId)")
        
        struct ProjectPeopleResponse: Decodable {
            let person_data: Person
            let assignment_data: ProjectAssignment
        }
        
        let response: [ProjectPeopleResponse] = try await client
            .rpc("get_people_for_project", params: ["project_id": projectId.uuidString])
            .execute()
            .value
        
        let results = response.map { ($0.person_data, $0.assignment_data) }
        print("✅ Found \(results.count) people assigned to project")
        return results
    }
}

// MARK: - Calendar Operations
extension SupabaseService {
    func fetchProjectCalendars(for projectId: UUID? = nil) async throws -> [ProjectCalendar] {
        print("🔄 Fetching project calendars...")
        
        var query = client
            .from("project_calendars")
            .select("""
                id,
                project_id,
                name,
                color,
                is_visible,
                is_shared,
                last_modified,
                calendar_events (
                    id,
                    title,
                    start_date,
                    end_date,
                    is_all_day,
                    location,
                    notes,
                    attendees,
                    status,
                    recurrence_rule,
                    last_modified
                )
            """)
        
        if let projectId = projectId {
            query = query.eq("project_id", value: projectId)
        }
        
        let response: [ProjectCalendar] = try await query
            .execute()
            .value
        
        print("✅ Successfully fetched \(response.count) calendars")
        return response
    }
    
    func createProjectCalendar(_ calendar: ProjectCalendar) async throws {
        print("➕ Creating calendar: \(calendar.name)")
        
        try await client
            .from("project_calendars")
            .insert([calendar])
            .execute()
        
        print("✅ Successfully created calendar")
    }
    
    func updateProjectCalendar(_ calendar: ProjectCalendar) async throws {
        print("🔄 Updating calendar: \(calendar.name)")
        
        try await client
            .from("project_calendars")
            .update(calendar)
            .eq("id", value: calendar.id)
            .execute()
        
        print("✅ Successfully updated calendar")
    }
    
    func deleteProjectCalendar(_ calendarId: UUID) async throws {
        print("🗑️ Deleting calendar with ID: \(calendarId)")
        
        try await client
            .from("project_calendars")
            .delete()
            .eq("id", value: calendarId)
            .execute()
        
        print("✅ Successfully deleted calendar")
    }
    
    func createCalendarEvent(_ event: CalendarEvent, in calendarId: UUID) async throws {
        print("➕ Creating event: \(event.title)")
        
        // Create a copy of the event with a new ID
        let eventData = CalendarEvent(
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            isAllDay: event.isAllDay
        )
        
        try await client
            .from("calendar_events")
            .insert([eventData])
            .execute()
        
        print("✅ Successfully created event")
    }
    
    func updateCalendarEvent(_ event: CalendarEvent, in calendarId: UUID) async throws {
        print("🔄 Updating event: \(event.title)")
        
        try await client
            .from("calendar_events")
            .update(event)
            .eq("id", value: event.id)
            .eq("calendar_id", value: calendarId)
            .execute()
        
        print("✅ Successfully updated event")
    }
    
    func deleteCalendarEvent(_ eventId: UUID, from calendarId: UUID) async throws {
        print("🗑️ Deleting event with ID: \(eventId)")
        
        try await client
            .from("calendar_events")
            .delete()
            .eq("id", value: eventId)
            .eq("calendar_id", value: calendarId)
            .execute()
        
        print("✅ Successfully deleted event")
    }
    
    func fetchCalendarEvents(
        for calendarId: UUID,
        from startDate: Date,
        to endDate: Date
    ) async throws -> [CalendarEvent] {
        print("🔄 Fetching calendar events...")
        
        let response: [CalendarEvent] = try await client
            .from("calendar_events")
            .select()
            .eq("calendar_id", value: calendarId)
            .gte("start_date", value: startDate)
            .lte("end_date", value: endDate)
            .execute()
            .value
        
        print("✅ Successfully fetched \(response.count) events")
        return response
    }
} 