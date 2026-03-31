//
//  BottomNavigationPane.swift
//  CrewBooklet
//
//  Bottom navigation pane component with drag gestures, resizable height, and material background
//  Following macOS HIG guidelines for overlays and panels
//

import SwiftUI

struct BottomNavigationPane<Content: View>: View {
    let content: Content
    @Binding var isPresented: Bool
    @State private var currentHeight: CGFloat = 440  // Increased by 10% from 400
    @State private var dragOffset: CGFloat = 0

    private let minHeight: CGFloat = 330  // Increased by 10% from 300
    private let maxHeight: CGFloat = 770  // Increased by 10% from 700
    private let cornerRadius: CGFloat = 12
    
    init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            if isPresented {
                // Bottom pane with clean styling
                VStack(spacing: 0) {
                    // Content (drag handle removed)
                    content
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(height: currentHeight)
                .background(.background, in: RoundedRectangle(cornerRadius: cornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(.separator.opacity(0.5), lineWidth: 1)
                )
                .transition(.move(edge: .bottom))
            }
        }
        .zIndex(999) // Ensure pane appears above other content
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()
        
        VStack {
            Text("Main Content")
            Spacer()
        }
        
        BottomNavigationPane(isPresented: .constant(true)) {
            VStack {
                Text("Bottom Pane Content")
                    .font(.title)
                    .padding()
                Spacer()
            }
        }
    }
}