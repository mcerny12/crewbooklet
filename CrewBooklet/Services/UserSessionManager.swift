//
//  UserSessionManager.swift
//  CrewBooklet
//
//  Manages user authentication and role-based permissions
//

import Foundation
import SwiftUI
import Supabase

@MainActor
class UserSessionManager: ObservableObject {
    @Published var currentUser: UserSession = UserSession.guest
    @Published var isLoading = true

    static let shared = UserSessionManager()
    private let supabase = SupabaseClient(
        supabaseURL: SupabaseConfig.shared.supabaseURL,
        supabaseKey: SupabaseConfig.shared.supabaseKey
    )

    private init() {
        Task {
            await loadCurrentUser()
        }
    }

    private func loadCurrentUser() async {
        do {
            // Check if user is already logged in
            if let session = try? await supabase.auth.session {
                let userId = session.user.id
                let email = session.user.email ?? "unknown"

                // Fetch user role from user_profiles table
                let role = await fetchUserRole(userId: userId)

                currentUser = UserSession(
                    userId: userId,
                    email: email,
                    role: role,
                    isAuthenticated: true
                )

                print("✅ User session loaded: \(email) with role: \(role)")
            } else {
                // No active session - sign in anonymously for dev
                await signInAnonymously()
            }
        } catch {
            print("⚠️ Failed to load user session: \(error)")
            // Fallback to anonymous sign-in
            await signInAnonymously()
        }

        isLoading = false
    }

    private func signInAnonymously() async {
        do {
            // For development: create or use a test account
            // In production, you'd implement proper sign-in UI
            let email = "admin@crewbooklet.local"
            let password = "crewbooklet_dev_2026"

            // Try to sign in first
            do {
                let session = try await supabase.auth.signIn(
                    email: email,
                    password: password
                )

                let userId = session.user.id
                let role = await fetchUserRole(userId: userId)

                currentUser = UserSession(
                    userId: userId,
                    email: email,
                    role: role,
                    isAuthenticated: true
                )

                print("✅ Signed in as: \(email) with role: \(role)")
            } catch {
                // Sign-in failed, try to sign up
                print("📝 Signing up new dev user...")
                let session = try await supabase.auth.signUp(
                    email: email,
                    password: password
                )

                let userId = session.user.id

                // Create admin profile for first user
                try await createUserProfile(userId: userId, role: .admin)

                currentUser = UserSession(
                    userId: userId,
                    email: email,
                    role: .admin,
                    isAuthenticated: true
                )

                print("✅ Signed up and set as admin: \(email)")
            }
        } catch {
            print("❌ Failed to sign in: \(error)")
            currentUser = UserSession.guest
        }
    }

    private func fetchUserRole(userId: UUID) async -> UserRole {
        do {
            struct UserProfile: Decodable {
                let role: String
            }

            let response: [UserProfile] = try await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", value: userId)
                .limit(1)
                .execute()
                .value

            if let profile = response.first {
                switch profile.role {
                case "admin": return .admin
                case "user": return .user
                case "viewer": return .viewer
                default: return .user
                }
            }
        } catch {
            print("⚠️ Failed to fetch user role: \(error)")
        }

        return .user
    }

    private func createUserProfile(userId: UUID, role: UserRole) async throws {
        struct UserProfileInsert: Encodable {
            let id: UUID
            let role: String
        }

        let profile = UserProfileInsert(
            id: userId,
            role: role.rawValue
        )

        try await supabase
            .from("user_profiles")
            .insert(profile)
            .execute()
    }

    func login(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(
            email: email,
            password: password
        )

        let userId = session.user.id
        let role = await fetchUserRole(userId: userId)

        currentUser = UserSession(
            userId: userId,
            email: email,
            role: role,
            isAuthenticated: true
        )
    }

    func logout() async {
        do {
            try await supabase.auth.signOut()
            currentUser = UserSession.guest
        } catch {
            print("❌ Failed to logout: \(error)")
        }
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

    var userId: UUID? {
        currentUser.isAuthenticated ? currentUser.userId : nil
    }
}


