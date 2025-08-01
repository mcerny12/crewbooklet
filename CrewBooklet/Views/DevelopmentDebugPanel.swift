import SwiftUI

/*
 ╔══════════════════════════════════════════════════════════════════════════════╗
 ║                    🔧 DEVELOPMENT DEBUG PANEL                                ║
 ║                                                                              ║
 ║  CrewBooklet includes development tools for debugging UI layout             ║
 ╠══════════════════════════════════════════════════════════════════════════════╣
 ║                                                                              ║
 ║  🎯 VISUAL DEBUG OVERLAY (⌘⇧D)                                              ║
 ║     • Shows grid overlays, rulers, and measurement tools                    ║
 ║     • Red lines every 10px for UI alignment                                 ║
 ║     • Window dimensions and safe area measurements                          ║
 ║     • File: VisualDebugOverlay in ContentView.swift                         ║
 ║     • Toggle: "Visual Debug Overlay" in File menu                           ║
 ║                                                                              ║
 ║  📏 DEBUG PANEL                                                              ║
 ║     • Bottom-right corner of main window                                    ║
 ║     • Shows available debug tools and shortcuts                             ║
 ║     • Collapsible for minimal UI interference                               ║
 ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// MARK: - Development Debug Panel (Simplified)
struct DevelopmentDebugPanel: View {
    @State private var isExpanded = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Toggle Button
            Button(action: {
                withAnimation(.easeInOut(duration: 0.3)) {
                    isExpanded.toggle()
                }
            }) {
                HStack {
                    Text("🔧 Development Debug")
                        .font(.caption)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.ultraThinMaterial)
            }
            .buttonStyle(.plain)
            
            // Detailed Panel
            if isExpanded {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Debug Tools")
                        .font(.caption)
                        .fontWeight(.semibold)
                    
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text("Visual Debug:")
                                .font(.caption2)
                                .fontWeight(.medium)
                            Text("⌘⇧D")
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .fontDesign(.monospaced)
                        }
                        
                        Text("Shows grid overlay for UI alignment")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(12)
                .background(.regularMaterial)
            }
        }
        .cornerRadius(8)
        .shadow(radius: 2)
    }
}

// MARK: - Debug Panel Integration
struct DebugPanelModifier: ViewModifier {
    func body(content: Content) -> some View {
        ZStack(alignment: .bottomTrailing) {
            content
            
            DevelopmentDebugPanel()
                .frame(width: 280)
                .padding(.trailing, 20)
                .padding(.bottom, 20)
        }
    }
}

extension View {
    func withDevelopmentDebugPanel() -> some View {
        modifier(DebugPanelModifier())
    }
} 