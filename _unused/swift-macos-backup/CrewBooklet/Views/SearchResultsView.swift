import SwiftUI

struct SearchResultsView: View {
    let searchResults: SearchResults
    let onSelectResult: () -> Void
    var visualDebugActive: Bool = false
    
    var body: some View {
        VStack(spacing: 2) { // Reduced spacing between sections
            // People section
            if !searchResults.people.isEmpty {
                SearchSection(title: "People") {
                    ForEach(searchResults.people) { result in
                        SearchResultRow(
                            title: result.displayName,
                            subtitle: result.displaySubtitle,
                            icon: "person.fill",
                            iconColor: .blue // People remain blue
                        ) {
                            onSelectResult()
                        }
                    }
                }
            }
            
            // Organizations section
            if !searchResults.organizations.isEmpty {
                if !searchResults.people.isEmpty {
                    Divider()
                        .padding(.horizontal, 4) // Reduced padding
                }
                
                SearchSection(title: "Organizations") {
                    ForEach(searchResults.organizations) { result in
                        SearchResultRow(
                            title: result.displayName,
                            subtitle: result.displaySubtitle,
                            icon: "building.2.fill",
                            iconColor: .orange // Confirmed: Organizations are orange, not green
                        ) {
                            onSelectResult()
                        }
                    }
                }
            }
            
            // Projects section
            if !searchResults.projects.isEmpty {
                if !searchResults.people.isEmpty || !searchResults.organizations.isEmpty {
                    Divider()
                        .padding(.horizontal, 4) // Reduced padding
                }
                
                SearchSection(title: "Projects") {
                    ForEach(searchResults.projects) { result in
                        SearchResultRow(
                            title: result.displayName,
                            subtitle: result.displaySubtitle,
                            icon: "folder.fill",
                            iconColor: .blue // Changed from green to blue for projects
                        ) {
                            onSelectResult()
                        }
                    }
                }
            }
        }
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 6)) // Smaller corner radius
        .overlay(
            RoundedRectangle(cornerRadius: 6) // Smaller corner radius
                .stroke(.separator, lineWidth: 0.5) // Thinner border
        )
        .shadow(radius: 4, y: 2) // Smaller shadow
    }
}

// MARK: - Search Section Component
struct SearchSection<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header - more compact
            HStack {
                Text(title)
                    .font(.caption2) // Smaller font
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                
                Spacer()
            }
            .padding(.horizontal, 8) // Reduced padding
            .padding(.top, 6) // Reduced padding
            .padding(.bottom, 2) // Reduced padding
            
            // Section content
            content
        }
    }
}

// MARK: - Search Result Row Component
struct SearchResultRow: View {
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: Color
    let action: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) { // Reduced spacing
                // Icon
                Image(systemName: icon)
                    .font(.system(size: 12)) // Smaller icon
                    .foregroundStyle(iconColor)
                    .frame(width: 16) // Smaller frame
                
                // Content
                VStack(alignment: .leading, spacing: 1) { // Reduced spacing
                    Text(title)
                        .font(.system(size: 12, weight: .medium)) // Smaller font
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    
                    Text(subtitle)
                        .font(.system(size: 10)) // Smaller font
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 8)) // Smaller chevron
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 8) // Reduced padding
            .padding(.vertical, 4) // Reduced padding
            .background(
                RoundedRectangle(cornerRadius: 4) // Smaller corner radius
                    .fill(isHovered ? .primary.opacity(0.08) : Color.clear)
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.1)) {
                isHovered = hovering
            }
        }
    }
}

// MARK: - Preview
#Preview {
    VStack {
        SearchResultsView(
            searchResults: SearchResults(
                people: [
                    PersonSearchResult(
                        id: UUID(),
                        person: Person(id: UUID(), name: "John Doe", email: "john@example.com", jobs: [.director], notes: ""),
                        connectedOrganization: Organization(id: UUID(), name: "Example Studios")
                    )
                ],
                organizations: [
                    OrganizationSearchResult(
                        id: UUID(),
                        organization: Organization(id: UUID(), name: "Example Studios"),
                        connectedPeople: []
                    )
                ],
                projects: [
                    ProjectSearchResult(
                        id: UUID(),
                        project: Project(
                            name: "Sample Film"
                        ),
                        connectedOrganization: nil
                    )
                ]
            )
        ) {
            print("Selected result")
        }
    }
    .frame(width: 300)
    .padding()
} 