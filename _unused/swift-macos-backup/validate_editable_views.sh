#!/bin/bash

# Validation script to detect editable views that may not save changes
# Run this periodically to catch potential data loss issues

echo "🔍 Validating editable views for auto-save patterns..."
echo ""

VIEWS_DIR="/Users/mortimercerny/Documents/CrewBooklet/CrewBooklet/Views"
FOUND_ISSUES=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find all Swift view files with @Binding to main entities
echo "Checking views with @Binding to database entities..."
echo ""

for file in "$VIEWS_DIR"/*.swift; do
    filename=$(basename "$file")

    # Check if file has @Binding to Person, Organization, or Project
    if grep -q "@Binding var.*: \(Person\|Organization\|Project\)" "$file"; then
        echo "📄 Checking $filename..."

        # Check if it has editable components
        has_editable=$(grep -c "TextField\|TextEditor\|Picker.*selection.*\\\$\|DatePicker.*selection.*\\\$" "$file")

        if [ $has_editable -gt 0 ]; then
            # Check if it has onChange handlers
            has_onchange=$(grep -c "\.onChange(of:" "$file")

            # Check if it has save/update function calls
            has_save=$(grep -c "save\(Person\|Organization\|Project\)\|update\(Person\|Organization\|Project\)" "$file")

            if [ $has_onchange -eq 0 ] || [ $has_save -eq 0 ]; then
                echo -e "  ${RED}⚠️  WARNING: Has editable fields but may be missing auto-save!${NC}"
                echo "     - Editable components: $has_editable"
                echo "     - onChange handlers: $has_onchange"
                echo "     - Save/update calls: $has_save"
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            else
                echo -e "  ${GREEN}✅ Appears to have proper auto-save${NC}"
                echo "     - Editable components: $has_editable"
                echo "     - onChange handlers: $has_onchange"
                echo "     - Save/update calls: $has_save"
            fi
        else
            echo -e "  ${YELLOW}ℹ️  Has @Binding but no editable components (read-only view)${NC}"
        fi
        echo ""
    fi
done

echo ""
echo "========================================"
if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No issues found! All editable views appear to have auto-save.${NC}"
else
    echo -e "${RED}⚠️  Found $FOUND_ISSUES view(s) that may need attention!${NC}"
    echo ""
    echo "Please review the warnings above and ensure:"
    echo "1. Each editable @Binding has .onChange(of: binding) handler"
    echo "2. The onChange handler calls the appropriate save/update function"
    echo "3. Console shows '🔄 Updating [entity]:' messages when editing"
    echo ""
    echo "See ViewEditingGuidelines.swift for detailed patterns."
fi
echo "========================================"

exit $FOUND_ISSUES
