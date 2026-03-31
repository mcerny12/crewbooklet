//
//  PathBarView.swift
//  CrewBooklet
//
//  Path bar component showing navigation context and dataset metadata
//  Displays current location, selected item info, and timestamps
//

import SwiftUI

struct PathBarView: View {
    let selectedView: ContentView.MainView?
    let selectedItem: SelectedItem?
    var currentUser: String
    var visualDebugActive: Bool = false
    
    var body: some View {
        HStack(spacing: 8) {
            // Show current user on the left
            HStack(spacing: 6) {
                Image(systemName: "person.crop.circle")
                    .font(.title3)
                    .foregroundStyle(.blue)
                Text(currentUser)
                    .font(.headline)
                    .foregroundStyle(.primary)
            }
            .padding(.trailing, 16)
            
            Spacer()
            
            // Metadata section
            if let selectedItem = selectedItem {
                HStack(spacing: 16) {
                    // Created date
                    HStack(spacing: 4) {
                        Text("Created:")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        
                        Text(DateFormatter.pathBarDate.string(from: selectedItem.createdAt))
                            .font(.caption)
                            .foregroundStyle(.primary)
                    }
                    
                    // Modified date  
                    HStack(spacing: 4) {
                        Text("Modified:")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        
                        Text(DateFormatter.pathBarDate.string(from: selectedItem.updatedAt))
                            .font(.caption)
                            .foregroundStyle(.primary)
                    }
                    
                    // Item type badge
                    Text(selectedItem.type.rawValue)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(selectedItem.type.color.opacity(0.2))
                        .foregroundStyle(selectedItem.type.color)
                        .clipShape(Capsule())
                }
            } else {
                // Empty state placeholder
                HStack(spacing: 16) {
                    HStack(spacing: 4) {
                        Text("Created:")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                        
                        Text("—")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    
                    HStack(spacing: 4) {
                        Text("Modified:")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                        
                        Text("—")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(.regularMaterial)
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundStyle(.separator),
            alignment: .bottom
        )
    }
}

// MARK: - Supporting Types

struct SelectedItem: Hashable {
    let id: UUID
    let name: String
    let type: ItemType
    let createdAt: Date
    let updatedAt: Date
    
    var icon: String {
        return type.icon
    }
    
    // Convenience initializers for different types
    static func person(_ person: Person) -> SelectedItem {
        SelectedItem(
            id: person.id,
            name: person.name,
            type: .person,
            createdAt: person.createdAt,
            updatedAt: person.updatedAt
        )
    }
    
    static func organization(_ organization: Organization) -> SelectedItem {
        SelectedItem(
            id: organization.id,
            name: organization.name,
            type: .organization,
            createdAt: organization.createdAt,
            updatedAt: organization.updatedAt
        )
    }
    
    static func project(_ project: Project) -> SelectedItem {
        SelectedItem(
            id: project.id,
            name: project.name,
            type: .project,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        )
    }
}

enum ItemType: String, CaseIterable {
    case person = "Person"
    case organization = "Organization"
    case project = "Project"
    
    var icon: String {
        switch self {
        case .person: return "person.fill"
        case .organization: return "building.2.fill"
        case .project: return "folder.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .person: return .blue
        case .organization: return .orange
        case .project: return .green
        }
    }
}

// MARK: - DateFormatter Extension for Path Bar
extension DateFormatter {
    static let pathBarDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}

// MARK: - Preview
#Preview {
    VStack(spacing: 0) {
        // Example with selected person
        PathBarView(
            selectedView: ContentView.MainView.people,
            selectedItem: SelectedItem(
                id: UUID(),
                name: "John Director",
                type: .person,
                createdAt: Date().addingTimeInterval(-86400 * 5), // 5 days ago
                updatedAt: Date().addingTimeInterval(-3600) // 1 hour ago
            ),
            currentUser: "John Doe"
        )
        
        Divider()
        
        // Example with selected project
        PathBarView(
            selectedView: ContentView.MainView.projects,
            selectedItem: SelectedItem(
                id: UUID(),
                name: "2025-01, Sample Film Project",
                type: .project,
                createdAt: Date().addingTimeInterval(-86400 * 10), // 10 days ago
                updatedAt: Date().addingTimeInterval(-1800) // 30 minutes ago
            ),
            currentUser: "John Doe"
        )
        
        Divider()
        
        // Example with no selection
        PathBarView(
            selectedView: ContentView.MainView.dashboard,
            selectedItem: nil,
            currentUser: "John Doe"
        )
        
        Spacer()
    }
} 