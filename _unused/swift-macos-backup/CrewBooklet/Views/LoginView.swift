import SwiftUI

struct LoginView: View {
    @AppStorage("savedUsername") private var savedUsername: String = ""
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var saveUsername: Bool = false
    @State private var errorMessage: String? = nil
    var onLoginSuccess: (String) -> Void
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            Text("CREWBOOK")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
                .padding(.bottom, 16)
            
            if !savedUsername.isEmpty && saveUsername {
                // Welcome back mode
                Text("Welcome, \(savedUsername)!")
                    .font(.title2)
                    .fontWeight(.medium)
                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 280)
                    .submitLabel(.go)
                    .onSubmit {
                        handleLogin(username: savedUsername)
                    }
                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
                Button("Login") {
                    handleLogin(username: savedUsername)
                }
                .buttonStyle(.borderedProminent)
                .frame(width: 120)
                Button("Not you?") {
                    savedUsername = ""
                    username = ""
                    password = ""
                    saveUsername = false
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.top, 8)
            } else {
                VStack(spacing: 16) {
                    TextField("Username", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 280)
                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 280)
                        .submitLabel(.go)
                        .onSubmit {
                            handleLogin(username: username)
                        }
                    Toggle("Remember me", isOn: $saveUsername)
                        .frame(width: 280, alignment: .leading)
                }
                if let error = errorMessage {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                }
                Button("Login") {
                    handleLogin(username: username)
                }
                .buttonStyle(.borderedProminent)
                .frame(width: 120)
            }
            Spacer()
        }
        .frame(width: 400, height: 380)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(radius: 8)
        .onAppear {
            if !savedUsername.isEmpty {
                saveUsername = true
                username = savedUsername
            }
        }
    }
    
    private func handleLogin(username: String) {
        if username == "admin" && password == "admin" {
            if saveUsername {
                savedUsername = username
            } else {
                savedUsername = ""
            }
            errorMessage = nil
            onLoginSuccess(username)
        } else {
            errorMessage = "Incorrect username or password."
        }
        password = ""
    }
}

#Preview {
    LoginView { _ in }
} 