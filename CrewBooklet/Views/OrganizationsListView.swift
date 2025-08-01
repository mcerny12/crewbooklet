import SwiftUI

struct MacOSOrganizationRow: View {
    let organization: Organization
    var onTap: (() -> Void)? = nil
    
    private var displayBusinessType: String {
        if organization.jobs.isEmpty {
            return "No business type"
        } else if organization.jobs.count == 1 {
            return organization.jobs.first!.displayName
        } else {
            return "\(organization.jobs.first!.displayName) +\(organization.jobs.count - 1) more"
        }
    }
    
    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: 12) {
                // Name, business type all in one line (matches People row pattern exactly)
                HStack(spacing: 8) {
                    Text(organization.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    
                    Text("•")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Text(displayBusinessType)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Email and icons all in one line (matches People row pattern exactly)
                HStack(spacing: 8) {
                    Text(organization.contactEmail ?? "No email")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    
                    HStack(spacing: 4) {
                        if !(organization.notes?.isEmpty ?? true) {
                            Image(systemName: "note.text")
                                .font(.caption2)
                                .foregroundStyle(.blue)
                        }
                        
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(organization.name)
    }
}

struct OrganizationsListView: View {
    @ObservedObject var organizationViewModel: OrganizationViewModel
    @State var searchText: String = ""
    @Binding var showAddOrganizationSheet: Bool
    var onOrganizationSelected: (Organization) -> Void
    var visualDebugActive: Bool = false
    
    private var filteredOrganizations: [Organization] {
        if searchText.isEmpty {
            return organizationViewModel.organizations
        } else {
            return organizationViewModel.organizations.filter { org in
                org.name.localizedCaseInsensitiveContains(searchText) ||
                (org.contactEmail ?? "").localizedCaseInsensitiveContains(searchText) ||
                org.jobs.contains { job in job.displayName.localizedCaseInsensitiveContains(searchText) }
            }
        }
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                if organizationViewModel.isLoading {
                    ProgressView("Loading organizations...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredOrganizations.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "Keine Organisationen" : "Keine Suchergebnisse",
                        systemImage: searchText.isEmpty ? "building.2" : "magnifyingglass",
                        description: Text(searchText.isEmpty ? "Fügen Sie Ihre erste Organisation hinzu" : "Versuchen Sie einen anderen Suchbegriff")
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(filteredOrganizations) { org in
                                MacOSOrganizationRow(organization: org) {
                                    onOrganizationSelected(org)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .background(.background)
    }
}

#Preview {
    OrganizationsListView(organizationViewModel: OrganizationViewModel(), showAddOrganizationSheet: .constant(false), onOrganizationSelected: { _ in })
} 