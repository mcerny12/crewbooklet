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
    @StateObject private var sessionManager = UserSessionManager.shared

    init() {
        // Clear all cache on app startup to ensure fresh data after enum changes
        Task { @MainActor in
            print("🗑️ Clearing all cache on app startup...")
            DataCache.shared.clearAllCache()
        }
    }

    var body: some Scene {
        WindowGroup {
            if sessionManager.isLoading {
                ProgressView("Loading...")
                    .frame(width: 400, height: 380)
            } else if sessionManager.currentUser.isAuthenticated {
                ContentView(
                    visualDebugActive: $visualDebugActive,
                    currentUser: sessionManager.currentUser.email
                )
                .frame(minWidth: 1280, minHeight: 800)
            } else {
                VStack {
                    Text("Authentication Failed")
                        .font(.title)
                    Text("Please check Supabase connection")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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




