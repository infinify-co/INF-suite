#!/bin/bash

# Kreative Icon Generator Script for macOS
# Uses sips (built-in macOS tool) to convert SVG to PNG

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ICONS_DIR="$SCRIPT_DIR/icons"
SVG_FILE="$ICONS_DIR/icon.svg"

# Icon sizes for PWA
SIZES=(72 96 128 144 152 192 384 512)

echo "Kreative Icon Generator"
echo "======================================================"
echo "Output directory: $ICONS_DIR"
echo ""

# Check if sips is available (macOS)
if command -v sips &> /dev/null; then
    echo "Using sips (macOS) to generate icons..."
    echo ""
    
    for size in "${SIZES[@]}"; do
        output_file="$ICONS_DIR/icon-$size.png"
        echo "Generating icon-$size.png..."
        
        # Create a temporary PNG at the target size
        # Note: sips doesn't handle SVG well, so we'll create solid color placeholders
        # Users should use icon-generator.html in a browser for better results
        sips -s format png --resampleHeightWidth $size $size "$SVG_FILE" --out "$output_file" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✓ Created icon-$size.png"
        else
            echo "⚠ Warning: sips couldn't process SVG directly"
            echo "  Please use icon-generator.html in your browser instead"
            break
        fi
    done
    
else
    echo "❌ sips command not found"
    echo ""
    echo "Please use one of these methods to generate icons:"
    echo ""
    echo "Option 1: Use the web-based generator (RECOMMENDED)"
    echo "  1. Start a local server:"
    echo "     python3 -m http.server 8080"
    echo "  2. Open in browser:"
    echo "     http://localhost:8080/icon-generator.html"
    echo "  3. Click 'Generate All Icons' and download each size"
    echo ""
    echo "Option 2: Install Pillow and use Python script"
    echo "  pip3 install Pillow"
    echo "  python3 generate_icons.py"
    echo ""
    echo "Option 3: Use online tool"
    echo "  Visit: https://realfavicongenerator.net/"
    echo "  Upload: icons/icon.svg"
    echo ""
fi

echo ""
echo "======================================================"
echo "For best results, use icon-generator.html in a browser!"

