import Foundation

// MARK: - Search Results Model
struct SearchResults {
    var people: [PersonSearchResult] = []
    var organizations: [OrganizationSearchResult] = []
    var projects: [ProjectSearchResult] = []
    
    var isEmpty: Bool {
        people.isEmpty && organizations.isEmpty && projects.isEmpty
    }
    
    var hasResults: Bool {
        !isEmpty
    }
}

// MARK: - Individual Search Result Types
struct PersonSearchResult: Identifiable {
    let id: UUID
    let person: Person
    let connectedOrganization: Organization?
    
    var displayName: String { person.name }
    var displaySubtitle: String {
        var subtitle = person.jobs.first?.displayName ?? "No job assigned"
        if let org = connectedOrganization {
            subtitle += " • \(org.name)"
        }
        return subtitle
    }
}

struct OrganizationSearchResult: Identifiable {
    let id: UUID
    let organization: Organization
    let connectedPeople: [Person]
    
    var displayName: String { organization.name }
    var displaySubtitle: String {
        let peopleCount = connectedPeople.count
        if peopleCount == 0 {
            return "No contact information"
        } else if peopleCount == 1 {
            return "1 person"
        } else {
            return "\(peopleCount) people"
        }
    }
}

struct ProjectSearchResult: Identifiable {
    let id: UUID
    let project: Project
    let connectedOrganization: Organization?
    
    var displayName: String { "\(project.projectNumber), \(project.name)" }
    var displaySubtitle: String {
        var subtitle = project.status.rawValue
        if let org = connectedOrganization {
            subtitle += " • \(org.name)"
        }
        return subtitle
    }
} 