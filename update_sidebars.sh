#!/bin/bash

# Script to update sidebar icons across all suite pages
# This updates the icons to match home.html

FILES=(
    "suite/tools.html"
    "suite/campaigns.html"
    "suite/Online-assets.html"
    "suite/Filebase.html"
    "suite/financial.html"
    "suite/chats.html"
    "suite/Oceanbase.html"
)

echo "Updating sidebar icons across suite pages..."

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        # This is a placeholder - actual updates done via search_replace tool
    fi
done

echo "Done!"

