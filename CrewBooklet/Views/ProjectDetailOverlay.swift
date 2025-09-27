//
//  ProjectDetailOverlay.swift
//  CrewBooklet
//
//  Full overlay project detail view that positions the title in the exact same location
//  as the first row in the project list for seamless transition
//

import SwiftUI

struct ProjectDetailOverlay: View {
    @Binding var project: Project
    @Binding var isPresented: Bool
    @State private var selectedTab: ProjectDetailTab = .information
    
    enum ProjectDetailTab: String, CaseIterable {
        case information = "Information"
        case crew = "Crew" 
        case financial = "Financial"
    }
    
    var body: some View {
        GeometryReader { geometry in
        ZStack {
            // Background overlay
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isPresented = false
                    }
                }
            
            // Main content
            VStack(spacing: 0) {
                // Header with project title in exact same position as list row
                headerView
                
                // Tab selector
                tabSelectorView
                
                // Content area
                ScrollView {
                    VStack(spacing: 20) {
                        switch selectedTab {
                        case .information:
                            informationTabView
                        case .crew:
                            Text("Crew management coming soon")
                                .foregroundStyle(.secondary)
                                .frame(minHeight: 200)
                        case .financial:
                            Text("Financial tracking coming soon")
                                .foregroundStyle(.secondary)
                                .frame(minHeight: 200)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 20)
                }
                .background(.background)
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.1), radius: 20, x: 0, y: 8)
            .padding(.top, calculateTopPadding(geometry: geometry)) // Precise positioning calculation
            .padding(.horizontal, 16) // Match LazyVStack padding exactly
        }
        }
    }
    
    // MARK: - Header View (matching list row position EXACTLY)
    private var headerView: some View {
        VStack(spacing: 0) {
            // Title row matching MacOSProjectListRow PIXEL PERFECT - clickable to close
            Button(action: {
                withAnimation(.easeInOut(duration: 0.3)) {
                    isPresented = false
                }
            }) {
                HStack(spacing: 12) {
                // Project name and number (identical to MacOSProjectListRow)
                HStack(spacing: 8) {
                    Text(project.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    
                    Text("•")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Text(project.projectNumber)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Status in colored pill and date (identical to MacOSProjectListRow)
                HStack(spacing: 8) {
                    // Colored status pill
                    Text(project.status.rawValue)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(statusColor(for: project.status))
                        .foregroundStyle(.white)
                        .cornerRadius(10)
                    
                    // Created date
                    Text(formatDate(project.createdAt))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    // Close button replacing chevron (maintaining same width)
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            isPresented = false
                        }
                    }) {
                        Image(systemName: "xmark")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                            .frame(width: 16, height: 16) // Match chevron size
                    }
                    .buttonStyle(.plain)
                }
            }
            }
            .buttonStyle(.plain) // Make entire header clickable
            .padding(.horizontal, 12) // EXACT match to MacOSProjectListRow
            .padding(.vertical, 9)     // EXACT match to MacOSProjectListRow  
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8)) // EXACT match
            
            Divider()
        }
    }
    
    // MARK: - Tab Selector
    private var tabSelectorView: some View {
        VStack(spacing: 0) {
            tabButtons
            Divider()
        }
    }
    
    private var tabButtons: some View {
        HStack(spacing: 0) {
            ForEach(ProjectDetailTab.allCases, id: \.self) { tab in
                tabButton(for: tab)
            }
        }
        .background(.background)
    }
    
    private func tabButton(for tab: ProjectDetailTab) -> some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedTab = tab
            }
        }) {
            Text(tab.rawValue)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14) // Context7: 14pt for comfortable interaction
                .background(selectedTab == tab ? Color.accentColor.opacity(0.15) : Color.clear)
                .cornerRadius(6) // Subtle rounding for modern macOS feel
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Information Tab  
    private var informationTabView: some View {
        VStack(alignment: .leading, spacing: 20) { // Context7: 20pt section spacing
            // Basic Information
            GroupBox("Basic Information") {
                VStack(spacing: 16) { // Context7: 16pt field spacing within groups
                    UniformField(label: "Project Number", text: .constant(project.projectNumber))
                        .disabled(true)
                    
                    UniformField(label: "Project Name", text: Binding(
                        get: { project.name },
                        set: { value in
                            var updatedProject = project
                            updatedProject.name = value
                            self.project = updatedProject
                        }
                    ))
                    
                    UniformDropdown(
                        label: "Status",
                        selection: Binding(
                            get: { project.status },
                            set: { value in
                                if let status = value {
                                    var updatedProject = project
                                    updatedProject.status = status
                                    self.project = updatedProject
                                }
                            }
                        ),
                        options: ProjectStatus.allCases,
                        displayText: { $0.rawValue }
                    )
                }
            }
            
            // Description
            GroupBox("Description") {
                UniformTextEditor(
                    text: Binding(
                        get: { project.description ?? "" },
                        set: { value in
                            var updatedProject = project
                            updatedProject.description = value.isEmpty ? nil : value
                            self.project = updatedProject
                        }
                    ),
                    placeholder: "Project description..."
                )
                .frame(minHeight: 100)
            }
            
            Spacer()
        }
        .padding(.horizontal, 24) // Context7: 24pt horizontal content margins
        .padding(.vertical, 20)   // Context7: 20pt vertical content margins
    }
    
    // MARK: - Positioning Calculations
    private func calculateTopPadding(geometry: GeometryProxy) -> CGFloat {
        // More precise calculation using actual safe area
        // NavigationSplitView with toolbar uses safeAreaInsets.top
        // Plus the LazyVStack padding of 16pt
        let safeAreaTop = geometry.safeAreaInsets.top
        let listPadding: CGFloat = 16
        
        // If safe area is 0, fall back to estimated title bar height
        if safeAreaTop == 0 {
            return 52 + listPadding // Estimated for macOS
        }
        
        return safeAreaTop + listPadding
    }
    
    // MARK: - Helper Functions  
    private func statusColor(for status: ProjectStatus) -> Color {
        switch status {
        case .inquiry:
            return .orange
        case .budget:
            return .blue
        case .production:
            return .green
        case .cancelled:
            return .red
        case .hold:
            return .yellow
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd.MM.yy"
        return formatter.string(from: date)
    }
}

// MARK: - Supporting Views

struct UniformField: View {
    let label: String
    @Binding var text: String
    var isDisabled: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            TextField("", text: $text)
                .textFieldStyle(.roundedBorder)
                .disabled(isDisabled)
        }
    }
}

struct UniformDropdown<T: Hashable>: View {
    let label: String
    @Binding var selection: T?
    let options: [T]
    let displayText: (T) -> String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            Picker("", selection: $selection) {
                Text("Select...")
                    .tag(nil as T?)
                
                ForEach(options, id: \.self) { option in
                    Text(displayText(option))
                        .tag(option as T?)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct UniformDateField: View {
    let label: String
    @Binding var date: Date
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            DatePicker("", selection: $date, displayedComponents: .date)
                .datePickerStyle(.compact)
        }
    }
}

struct UniformTextEditor: View {
    @Binding var text: String
    let placeholder: String
    
    var body: some View {
        ZStack(alignment: .topLeading) {
            TextEditor(text: $text)
                .scrollContentBackground(.hidden)
                .background(.background)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(.quaternary, lineWidth: 1)
                )
            
            if text.isEmpty {
                Text(placeholder)
                    .foregroundStyle(.placeholder)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 8)
                    .allowsHitTesting(false)
            }
        }
    }
}
