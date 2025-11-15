//
//  CrewBookletApp.swift
//  CrewBooklet
//
//  Created by Mortimer Cerny on 29.06.25.
//

import SwiftUI

@main
struct CrewBookletApp: App {
    @State private var visualDebugActive = false
    @AppStorage("savedUsername") private var savedUsername: String = ""
    @State private var isAuthenticated: Bool = false
    @State private var currentUser: String? = nil

    init() {
        // Clear projects cache on app startup to ensure fresh data after enum changes
        Task { @MainActor in
            print("🗑️ Clearing projects cache on app startup...")
            DataCache.shared.projects.removeAll()
            DataCache.shared.lastFetch.removeValue(forKey: "projects")
        }
    }

    var body: some Scene {
        WindowGroup {
            if isAuthenticated, let user = currentUser {
                ContentView(visualDebugActive: $visualDebugActive, currentUser: user)
                    .frame(minWidth: 1280, minHeight: 800)
            } else {
                LoginView { username in
                    self.currentUser = username
                    self.isAuthenticated = true
                }
                .frame(width: 400, height: 380)
            }
        }
        .windowToolbarStyle(.unifiedCompact)
        .commands {
            CommandGroup(after: .newItem) {
                Divider()
                Toggle("Visual Debug Overlay", isOn: $visualDebugActive)
                    .keyboardShortcut("d", modifiers: [.command, .shift])
            }
        }
    }
}




