import SwiftUI

struct ProjectsListView: View {
    @ObservedObject var projectViewModel: ProjectViewModel
    @State var searchText: String = ""
    @Binding var showAddProjectSheet: Bool
    var onProjectSelected: (Project) -> Void
    
    private var filteredProjects: [Project] {
        if searchText.isEmpty {
            return projectViewModel.projects
        } else {
            return projectViewModel.projects.filter { project in
                project.name.localizedCaseInsensitiveContains(searchText) ||
                project.projectNumber.localizedCaseInsensitiveContains(searchText) ||
                project.status.rawValue.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                if projectViewModel.isLoading {
                    ProgressView("Loading projects...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredProjects.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "Keine Projekte" : "Keine Suchergebnisse",
                        systemImage: searchText.isEmpty ? "folder.badge.plus" : "magnifyingglass",
                        description: Text(searchText.isEmpty ? "Fügen Sie Ihr erstes Projekt hinzu" : "Versuchen Sie einen anderen Suchbegriff")
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(filteredProjects) { project in
                                MacOSProjectListRow(project: project) {
                                    onProjectSelected(project)
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
    ProjectsListView(projectViewModel: ProjectViewModel(), showAddProjectSheet: .constant(false), onProjectSelected: { _ in })
} 