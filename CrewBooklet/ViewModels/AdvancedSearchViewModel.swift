import Foundation
import Combine

@MainActor
class AdvancedSearchViewModel: ObservableObject {
    @Published var searchCriteria = AdvancedSearchCriteria()
    @Published var searchResults = AdvancedSearchResults()
    @Published var isSearching = false
    @Published var errorMessage: String?
    @Published var hasPerformedSearch = false
    
    private let supabaseService = SupabaseService.shared
    private var searchTask: Task<Void, Never>?
    
    func performAdvancedSearch() async {
        // Cancel any existing search
        searchTask?.cancel()
        
        searchTask = Task {
            await executeSearch()
        }
        
        await searchTask?.value
    }
    
    private func executeSearch() async {
        guard !searchCriteria.isEmpty else {
            searchResults = AdvancedSearchResults()
            hasPerformedSearch = false
            return
        }
        
        isSearching = true
        errorMessage = nil
        hasPerformedSearch = false
        
        let startTime = CFAbsoluteTimeGetCurrent()
        
        do {
            // Fetch all data in parallel for complex filtering
            async let peopleData = fetchPeopleForAdvancedSearch()
            async let projectsData = fetchProjectsForAdvancedSearch()
            async let organizationsData = fetchOrganizationsForAdvancedSearch()
            
            let (people, projects, organizations) = try await (peopleData, projectsData, organizationsData)
            
            // Apply advanced filtering logic
            let filteredResults = applyAdvancedFiltering(
                people: people,
                projects: projects,
                organizations: organizations
            )
            
            let executionTime = (CFAbsoluteTimeGetCurrent() - startTime) * 1000
            
            searchResults = AdvancedSearchResults(
                people: filteredResults.people,
                organizations: filteredResults.organizations,
                projects: filteredResults.projects,
                executionTime: executionTime
            )
            
            hasPerformedSearch = true
            isSearching = false
            
        } catch {
            print("❌ Advanced search error: \(error)")
            errorMessage = "Search failed: \(error.localizedDescription)"
            searchResults = AdvancedSearchResults()
            hasPerformedSearch = true
            isSearching = false
        }
    }
    
    private func fetchPeopleForAdvancedSearch() async throws -> [(Person, Organization?)] {
        guard searchCriteria.searchPeople else { return [] }
        
        let people = try await supabaseService.fetchAllPeople()
        let organizations = try await supabaseService.fetchAllOrganizations()
        
        return people.map { person in
            let org = person.organizationId.flatMap { orgId in
                organizations.first { $0.id == orgId }
            }
            return (person, org)
        }
    }
    
    private func fetchProjectsForAdvancedSearch() async throws -> [(Project, Organization?)] {
        guard searchCriteria.searchProjects else { return [] }
        
        let projects = try await supabaseService.fetchAllProjects()
        let organizations = try await supabaseService.fetchAllOrganizations()
        
        return projects.map { project in
            let org = project.clientOrganizationId.flatMap { orgId in
                organizations.first { $0.id == orgId }
            }
            return (project, org)
        }
    }
    
    private func fetchOrganizationsForAdvancedSearch() async throws -> [(Organization, [Person])] {
        guard searchCriteria.searchOrganizations else { return [] }
        
        let organizations = try await supabaseService.fetchAllOrganizations()
        let people = try await supabaseService.fetchAllPeople()
        
        return organizations.map { organization in
            let connectedPeople = people.filter { $0.organizationId == organization.id }
            return (organization, connectedPeople)
        }
    }
    
    private func applyAdvancedFiltering(
        people: [(Person, Organization?)],
        projects: [(Project, Organization?)],
        organizations: [(Organization, [Person])]
    ) -> (people: [PersonSearchResult], organizations: [OrganizationSearchResult], projects: [ProjectSearchResult]) {
        
        let filteredPeople = people.compactMap { (person, org) -> PersonSearchResult? in
            guard matchesPersonCriteria(person: person, organization: org) else { return nil }
            return PersonSearchResult(id: person.id, person: person, connectedOrganization: org)
        }
        
        let filteredProjects = projects.compactMap { (project, org) -> ProjectSearchResult? in
            guard matchesProjectCriteria(project: project, organization: org) else { return nil }
            return ProjectSearchResult(id: project.id, project: project, connectedOrganization: org)
        }
        
        let filteredOrganizations = organizations.compactMap { (organization, connectedPeople) -> OrganizationSearchResult? in
            guard matchesOrganizationCriteria(organization: organization, people: connectedPeople) else { return nil }
            return OrganizationSearchResult(id: organization.id, organization: organization, connectedPeople: connectedPeople)
        }
        
        return (people: filteredPeople, organizations: filteredOrganizations, projects: filteredProjects)
    }
    
    private func matchesPersonCriteria(person: Person, organization: Organization?) -> Bool {
        var matches: [Bool] = []
        
        // General text search
        if !searchCriteria.generalText.isEmpty {
            let searchText = searchCriteria.generalText.lowercased()
            let generalMatch = person.name.lowercased().contains(searchText) ||
                              (person.email?.lowercased().contains(searchText) ?? false) ||
                              person.jobs.contains { $0.displayName.lowercased().contains(searchText) } ||
                              (organization?.name.lowercased().contains(searchText) ?? false)
            matches.append(generalMatch)
        }
        
        // Specific person criteria
        if !searchCriteria.personName.isEmpty {
            matches.append(person.name.lowercased().contains(searchCriteria.personName.lowercased()))
        }
        
        if !searchCriteria.personEmail.isEmpty {
            matches.append(person.email?.lowercased().contains(searchCriteria.personEmail.lowercased()) ?? false)
        }
        
        if !searchCriteria.personCity.isEmpty {
            matches.append(person.address?.city?.lowercased().contains(searchCriteria.personCity.lowercased()) ?? false)
        }
        
        if !searchCriteria.personJobs.isEmpty {
            matches.append(searchCriteria.personJobs.contains { jobType in
                person.jobs.contains(jobType)
            })
        }
        
        if !searchCriteria.personLanguages.isEmpty {
            matches.append(searchCriteria.personLanguages.contains { language in
                person.languages.contains(language)
            })
        }
        
        if let orgId = searchCriteria.personOrganization {
            matches.append(person.organizationId == orgId)
        }
        
        // Apply AND/OR logic
        if matches.isEmpty {
            return true // No criteria specified for people
        }
        
        return searchCriteria.useAndLogic ? matches.allSatisfy { $0 } : matches.contains { $0 }
    }
    
    private func matchesProjectCriteria(project: Project, organization: Organization?) -> Bool {
        var matches: [Bool] = []
        
        // General text search
        if !searchCriteria.generalText.isEmpty {
            let searchText = searchCriteria.generalText.lowercased()
            let generalMatch = project.name.lowercased().contains(searchText) ||
                              project.projectNumber.lowercased().contains(searchText) ||
                              project.status.rawValue.lowercased().contains(searchText) ||
                              (organization?.name.lowercased().contains(searchText) ?? false)
            matches.append(generalMatch)
        }
        
        // Specific project criteria
        if !searchCriteria.projectName.isEmpty {
            matches.append(project.name.lowercased().contains(searchCriteria.projectName.lowercased()))
        }
        
        if !searchCriteria.projectNumber.isEmpty {
            matches.append(project.projectNumber.lowercased().contains(searchCriteria.projectNumber.lowercased()))
        }
        
        if !searchCriteria.projectStatus.isEmpty {
            matches.append(searchCriteria.projectStatus.contains(project.status))
        }
        
        if !searchCriteria.projectInquiryCountry.isEmpty {
            matches.append(project.inquiryCountry?.lowercased().contains(searchCriteria.projectInquiryCountry.lowercased()) ?? false)
        }
        
        if !searchCriteria.projectShootingLocation.isEmpty {
            matches.append(project.shootingLocation?.lowercased().contains(searchCriteria.projectShootingLocation.lowercased()) ?? false)
        }
        
        if let orgId = searchCriteria.projectClientOrganization {
            matches.append(project.clientOrganizationId == orgId)
        }
        
        // Apply AND/OR logic
        if matches.isEmpty {
            return true // No criteria specified for projects
        }
        
        return searchCriteria.useAndLogic ? matches.allSatisfy { $0 } : matches.contains { $0 }
    }
    
    private func matchesOrganizationCriteria(organization: Organization, people: [Person]) -> Bool {
        var matches: [Bool] = []
        
        // General text search
        if !searchCriteria.generalText.isEmpty {
            let searchText = searchCriteria.generalText.lowercased()
            let generalMatch = organization.name.lowercased().contains(searchText) ||
                              people.contains { person in
                                  person.name.lowercased().contains(searchText) ||
                                  person.jobs.contains { $0.displayName.lowercased().contains(searchText) }
                              }
            matches.append(generalMatch)
        }
        
        // Specific organization criteria
        if !searchCriteria.organizationName.isEmpty {
            matches.append(organization.name.lowercased().contains(searchCriteria.organizationName.lowercased()))
        }
        
        // Apply AND/OR logic
        if matches.isEmpty {
            return true // No criteria specified for organizations
        }
        
        return searchCriteria.useAndLogic ? matches.allSatisfy { $0 } : matches.contains { $0 }
    }
    
    func clearSearch() {
        searchCriteria = AdvancedSearchCriteria()
        searchResults = AdvancedSearchResults()
        hasPerformedSearch = false
        errorMessage = nil
    }
    
    func clearResults() {
        searchResults = AdvancedSearchResults()
        hasPerformedSearch = false
        errorMessage = nil
    }
} 