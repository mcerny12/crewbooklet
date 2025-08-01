//
//  PeopleViewModel.swift
//  CrewBooklet
//
//  Updated for Supabase with async/await patterns and smart caching
//

import SwiftUI
import Combine

// MARK: - People View Model
@MainActor
class PeopleViewModel: ObservableObject {
    @Published var people: [Person] = []
    @Published var filteredPeople: [Person] = []
    @Published var searchText: String = "" {
        didSet {
            filterPeople()
        }
    }
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        Task {
            // ⚡ Show cached data immediately if available
            let cache = DataCache.shared
            if cache.hasCachedData(for: "people") {
                let cachedPeople = cache.people
                await MainActor.run {
                    self.people = cachedPeople
                    self.filterPeople()
                    print("⚡ PeopleViewModel: Loaded \(cachedPeople.count) people from cache instantly")
                }
            }
            
            // 🔄 Observe cache changes for real-time updates
            await observeCacheChanges()
            await loadPeople()
            await setupRealtimeSubscription()
        }
    }
    
    deinit {
        cancellables.removeAll()
        print("🧹 PeopleViewModel: Cleaned up resources")
    }
    
    func loadPeople() async {
        isLoading = true
        do {
            people = try await supabaseService.fetchPeople() // Uses cache-aware version
            filterPeople()
            errorMessage = nil
        } catch {
            errorMessage = "Failed to load people: \(error.localizedDescription)"
            print("❌ Error loading people: \(error)")
        }
        isLoading = false
    }
    
    private func observeCacheChanges() async {
        let cache = DataCache.shared
        cache.$people
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updatedPeople in
                if self?.people != updatedPeople {
                    self?.people = updatedPeople
                    self?.filterPeople()
                    print("🔄 PeopleViewModel: Updated from cache (\(updatedPeople.count) people)")
                }
            }
            .store(in: &cancellables)
    }
    
    func addPerson(_ person: Person) async {
        do {
            try await supabaseService.addPerson(person)
            // ✅ Cache is already updated by SupabaseService.addPerson()
            // No need to call loadPeople() here
            errorMessage = nil
        } catch {
            errorMessage = "Failed to add person: \(error.localizedDescription)"
            print("❌ Error adding person: \(error)")
        }
    }
    
    func updatePerson(_ person: Person) async {
        do {
            try await supabaseService.updatePerson(person)
            // ✅ Cache is already updated by SupabaseService.updatePerson()
            // No need to call loadPeople() here
            errorMessage = nil
        } catch {
            errorMessage = "Failed to update person: \(error.localizedDescription)"
            print("❌ Error updating person: \(error)")
        }
    }
    
    func deletePerson(_ person: Person) async {
        do {
            try await supabaseService.deletePerson(id: person.id)
            // ✅ Cache is already updated by SupabaseService.deletePerson()
            // No need to call loadPeople() here
            errorMessage = nil
        } catch {
            errorMessage = "Failed to delete person: \(error.localizedDescription)"
            print("❌ Error deleting person: \(error)")
        }
    }
    
    private func filterPeople() {
        if searchText.isEmpty {
            filteredPeople = people
        } else {
            filteredPeople = people.filter { person in
                person.name.localizedCaseInsensitiveContains(searchText) ||
                (person.email?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                person.jobs.contains { job in
                    job.displayName.localizedCaseInsensitiveContains(searchText)
                }
            }
        }
    }
    
    private func setupRealtimeSubscription() async {
        await supabaseService.subscribeToTableChanges(
            table: "people",
            type: Person.self,
            onInsert: { [weak self] person in
                self?.people.append(person)
                self?.filterPeople()
            },
            onUpdate: { [weak self] updatedPerson in
                if let index = self?.people.firstIndex(where: { $0.id == updatedPerson.id }) {
                    self?.people[index] = updatedPerson
                    self?.filterPeople()
                }
            },
            onDelete: { [weak self] deletedId in
                if let uuid = UUID(uuidString: deletedId) {
                    self?.people.removeAll { $0.id == uuid }
                    self?.filterPeople()
                }
            }
        )
    }
    
    func clearError() {
        errorMessage = nil
    }
}

// MARK: - Organization View Model
@MainActor
class OrganizationViewModel: ObservableObject {
    @Published var organizations: [Organization] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        Task {
            // ⚡ Show cached data immediately if available
            let cache = DataCache.shared
            if cache.hasCachedData(for: "organizations") {
                let cachedOrganizations = cache.organizations
                await MainActor.run {
                    self.organizations = cachedOrganizations
                    print("⚡ OrganizationViewModel: Loaded \(cachedOrganizations.count) organizations from cache instantly")
                }
            }
            
            // 🔄 Observe cache changes for real-time updates
            await observeCacheChanges()
            await loadOrganizations()
            await setupRealtimeSubscription()
        }
    }
    
    deinit {
        cancellables.removeAll()
        print("🧹 OrganizationViewModel: Cleaned up resources")
    }
    
    func loadOrganizations() async {
        isLoading = true
        do {
            organizations = try await supabaseService.fetchOrganizations() // Uses cache-aware version
            errorMessage = nil
        } catch {
            errorMessage = "Failed to load organizations: \(error.localizedDescription)"
            print("❌ Error loading organizations: \(error)")
        }
        isLoading = false
    }
    
    private func observeCacheChanges() async {
        let cache = DataCache.shared
        cache.$organizations
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updatedOrganizations in
                if self?.organizations != updatedOrganizations {
                    self?.organizations = updatedOrganizations
                    print("🔄 OrganizationViewModel: Updated from cache (\(updatedOrganizations.count) organizations)")
                }
            }
            .store(in: &cancellables)
    }
    
    func addOrganization(_ organization: Organization) async {
        do {
            try await supabaseService.addOrganization(organization)
            // ✅ Cache is already updated by SupabaseService.addOrganization()
            // No need to call loadOrganizations() here
            errorMessage = nil
        } catch {
            errorMessage = "Failed to add organization: \(error.localizedDescription)"
            print("❌ Error adding organization: \(error)")
        }
    }
    
    func updateOrganization(_ organization: Organization) async {
        do {
            try await supabaseService.updateOrganization(organization)
            // ✅ Cache is already updated by SupabaseService.updateOrganization()
            // No need to call loadOrganizations() here
            errorMessage = nil
        } catch {
            errorMessage = "Failed to update organization: \(error.localizedDescription)"
            print("❌ Error updating organization: \(error)")
        }
    }
    
    func deleteOrganization(_ organization: Organization) async {
        do {
            try await supabaseService.deleteOrganization(id: organization.id)
            // ✅ Cache is already updated by SupabaseService.deleteOrganization()
            // No need to call loadOrganizations() here
            errorMessage = nil
        } catch {
            errorMessage = "Failed to delete organization: \(error.localizedDescription)"
            print("❌ Error deleting organization: \(error)")
        }
    }
    
    private func setupRealtimeSubscription() async {
        await supabaseService.subscribeToTableChanges(
            table: "organizations",
            type: Organization.self,
            onInsert: { [weak self] organization in
                self?.organizations.append(organization)
            },
            onUpdate: { [weak self] updatedOrganization in
                if let index = self?.organizations.firstIndex(where: { $0.id == updatedOrganization.id }) {
                    self?.organizations[index] = updatedOrganization
                }
            },
            onDelete: { [weak self] deletedId in
                if let uuid = UUID(uuidString: deletedId) {
                    self?.organizations.removeAll { $0.id == uuid }
                }
            }
        )
    }
    
    func clearError() {
        errorMessage = nil
    }
} 
