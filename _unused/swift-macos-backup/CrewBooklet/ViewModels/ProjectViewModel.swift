import SwiftUI
import Combine

@MainActor
class ProjectViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var filteredProjects: [Project] = []
    @Published var searchText: String = "" {
        didSet {
            filterProjects()
        }
    }
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        Task {
            // Show cached data immediately if available
            let cache = DataCache.shared
            if cache.hasCachedData(for: "projects") {
                let cachedProjects = cache.projects
                await MainActor.run {
                    self.projects = cachedProjects
                    self.filterProjects()
                    print("⚡ ProjectViewModel: Loaded \(cachedProjects.count) projects from cache instantly")
                }
            }
            
            // Observe cache changes for real-time updates
            await observeCacheChanges()
            await loadProjects()
            await setupRealtimeSubscription()
        }
    }
    
    deinit {
        cancellables.removeAll()
        print("🧹 ProjectViewModel: Cleaned up resources")
    }
    
    func loadProjects() async {
        isLoading = true
        print("🔄 Loading projects from Supabase...")

        do {
            projects = try await supabaseService.fetchProjects() // Uses cache-aware version
            filterProjects()
            errorMessage = nil
            print("✅ Loaded \(projects.count) projects")
        } catch {
            errorMessage = "Failed to load projects: \(error.localizedDescription)"
            print("❌ Error loading projects: \(error)")
            print("💡 Full error: \(error)")
        }
        isLoading = false
    }

    /// Force refresh projects, bypassing cache
    func forceRefresh() async {
        isLoading = true
        print("🔄 Force refreshing projects (clearing cache)...")

        do {
            // Force fresh fetch (bypasses cache)
            projects = try await supabaseService.fetchProjects(forceRefresh: true)
            filterProjects()
            errorMessage = nil
            print("✅ Force refreshed \(projects.count) projects")
        } catch {
            errorMessage = "Failed to refresh projects: \(error.localizedDescription)"
            print("❌ Error refreshing projects: \(error)")
            print("💡 Full error: \(error)")
        }
        isLoading = false
    }
    
    private func observeCacheChanges() async {
        let cache = DataCache.shared
        cache.$projects
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updatedProjects in
                if self?.projects != updatedProjects {
                    self?.projects = updatedProjects
                    self?.filterProjects()
                    print("🔄 ProjectViewModel: Updated from cache (\(updatedProjects.count) projects)")
                }
            }
            .store(in: &cancellables)
    }
    
    func addProject(_ project: Project) async {
        do {
            try await supabaseService.addProject(project)
            // Cache is already updated by SupabaseService.addProject()
            errorMessage = nil
            print("✅ Added project: \(project.name)")
        } catch {
            errorMessage = "Failed to add project: \(error.localizedDescription)"
            print("❌ Error adding project: \(error)")
        }
    }
    
    func updateProject(_ project: Project) async {
        do {
            try await supabaseService.updateProject(project)
            // Cache is already updated by SupabaseService.updateProject()
            errorMessage = nil
        } catch {
            errorMessage = "Failed to update project: \(error.localizedDescription)"
            print("❌ Error updating project: \(error)")
        }
    }
    
    func deleteProject(_ project: Project) async {
        do {
            try await supabaseService.deleteProject(id: project.id)
            // Cache is already updated by SupabaseService.deleteProject()
            errorMessage = nil
        } catch {
            errorMessage = "Failed to delete project: \(error.localizedDescription)"
            print("❌ Error deleting project: \(error)")
        }
    }
    
    func generateNextProjectNumber() -> String {
        let currentYear = Calendar.current.component(.year, from: Date())
        let yearPrefix = "\(currentYear)-"
        
        // Find the highest project number for the current year
        let currentYearProjects = projects.filter { $0.projectNumber.hasPrefix(yearPrefix) }
        
        let highestNumber = currentYearProjects
            .compactMap { project in
                let numberPart = project.projectNumber.replacingOccurrences(of: yearPrefix, with: "")
                return Int(numberPart)
            }
            .max() ?? 0
        
        let nextNumber = highestNumber + 1
        return String(format: "%04d-%02d", currentYear, nextNumber)
    }
    
    private func filterProjects() {
        if searchText.isEmpty {
            filteredProjects = projects
        } else {
            filteredProjects = projects.filter { project in
                project.name.localizedCaseInsensitiveContains(searchText) ||
                project.projectNumber.localizedCaseInsensitiveContains(searchText) ||
                (project.description?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
    }
    
    private func setupRealtimeSubscription() async {
        await supabaseService.subscribeToTableChanges(
            table: "projects",
            type: Project.self,
            onInsert: { [weak self] project in
                self?.projects.append(project)
                self?.projects.sort { $0.createdAt > $1.createdAt }
                self?.filterProjects()
            },
            onUpdate: { [weak self] updatedProject in
                if let index = self?.projects.firstIndex(where: { $0.id == updatedProject.id }) {
                    self?.projects[index] = updatedProject
                    self?.filterProjects()
                }
            },
            onDelete: { [weak self] deletedId in
                if let uuid = UUID(uuidString: deletedId) {
                    self?.projects.removeAll { $0.id == uuid }
                    self?.filterProjects()
                }
            }
        )
    }
    
    var currentProjects: [Project] {
        projects.filter { project in
            project.status == .inquiry || project.status == .budget || project.status == .production
        }
    }
    
    var totalProjectsCount: Int {
        projects.count
    }
    
    func clearError() {
        errorMessage = nil
    }
} 