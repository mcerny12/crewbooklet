//
//  UserSessionManager.swift
//  CrewBooklet
//
//  Manages user authentication and role-based permissions
//

import Foundation
import SwiftUI

@MainActor
class UserSessionManager: ObservableObject {
    @Published var currentUser: UserSession = UserSession.guest
    
    static let shared = UserSessionManager()
    
    private init() {
        // For development, set a default admin user
        // In production, this would be loaded from authentication service
        loadCurrentUser()
    }
    
    private func loadCurrentUser() {
        // TODO: Load from Supabase auth or UserDefaults
        // For now, set as admin for development
        currentUser = UserSession(
            userId: UUID(),
            email: "admin@crewbooklet.com",
            role: .admin,
            isAuthenticated: true
        )
    }
    
    func login(email: String, role: UserRole) {
        currentUser = UserSession(
            userId: UUID(),
            email: email,
            role: role,
            isAuthenticated: true
        )
    }
    
    func logout() {
        currentUser = UserSession.guest
    }
    
    var canDelete: Bool {
        currentUser.role.canDelete
    }
    
    var canEditAll: Bool {
        currentUser.role.canEditAll
    }
    
    var isAdmin: Bool {
        currentUser.role == .admin
    }
}


