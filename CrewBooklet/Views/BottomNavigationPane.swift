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
    @State private var currentHeight: CGFloat = 400
    @State private var dragOffset: CGFloat = 0
    
    private let minHeight: CGFloat = 300
    private let maxHeight: CGFloat = 700
    private let cornerRadius: CGFloat = 12
    
    init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            if isPresented {
                // Dim overlay behind pane
                Color.black.opacity(0.3)
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            isPresented = false
                        }
                    }
                
                // Bottom pane with material background
                VStack(spacing: 0) {
                    // Drag handle
                    dragHandle
                    
                    // Content
                    content
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(height: currentHeight + dragOffset)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
                .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: -2)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            let newHeight = currentHeight - value.translation.height
                            let clampedHeight = max(minHeight, min(maxHeight, newHeight))
                            dragOffset = clampedHeight - currentHeight
                        }
                        .onEnded { value in
                            let newHeight = currentHeight - value.translation.height
                            let clampedHeight = max(minHeight, min(maxHeight, newHeight))
                            
                            withAnimation(.easeOut(duration: 0.2)) {
                                currentHeight = clampedHeight
                                dragOffset = 0
                            }
                            
                            // Auto-dismiss if dragged too low
                            if newHeight < minHeight - 50 {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    isPresented = false
                                }
                            }
                        }
                )
                .transition(.move(edge: .bottom))
            }
        }
        .zIndex(999) // Ensure pane appears above other content
    }
    
    private var dragHandle: some View {
        VStack(spacing: 0) {
            // Visual drag indicator
            RoundedRectangle(cornerRadius: 2)
                .fill(.secondary)
                .frame(width: 36, height: 4)
                .padding(.top, 8)
                .padding(.bottom, 6)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
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