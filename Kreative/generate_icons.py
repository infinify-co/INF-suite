#!/usr/bin/env python3
"""
Generate PWA icons for Kreative Dashboard
Uses PIL/Pillow to create PNG icons from scratch
"""

try:
    from PIL import Image, ImageDraw
    import os
except ImportError:
    print("Error: Pillow library not found")
    print("Install with: pip3 install Pillow")
    exit(1)

# Icon sizes required for PWA
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Colors
GRADIENT_START = (102, 126, 234)  # #667eea
GRADIENT_END = (118, 75, 162)     # #764ba2
WHITE = (255, 255, 255, 230)

def create_gradient(width, height, start_color, end_color):
    """Create a diagonal gradient"""
    base = Image.new('RGB', (width, height), start_color)
    top = Image.new('RGB', (width, height), end_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        for x in range(width):
            # Diagonal gradient
            mask_data.append(int(255 * (x + y) / (width + height)))
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def draw_rounded_rectangle(draw, xy, corner_radius, fill):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + corner_radius, y1, x2 - corner_radius, y2], fill=fill)
    draw.rectangle([x1, y1 + corner_radius, x2, y2 - corner_radius], fill=fill)
    draw.pieslice([x1, y1, x1 + corner_radius * 2, y1 + corner_radius * 2], 180, 270, fill=fill)
    draw.pieslice([x2 - corner_radius * 2, y1, x2, y1 + corner_radius * 2], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - corner_radius * 2, x1 + corner_radius * 2, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - corner_radius * 2, y2 - corner_radius * 2, x2, y2], 0, 90, fill=fill)

def create_icon(size):
    """Create a single icon of the specified size"""
    # Create base gradient
    img = create_gradient(size, size, GRADIENT_START, GRADIENT_END)
    
    # Convert to RGBA for transparency support
    img = img.convert('RGBA')
    
    # Create drawing context
    draw = ImageDraw.Draw(img)
    
    # Scale factor
    scale = size / 512
    
    # Draw "K" letter (simplified creative logo)
    # Vertical line
    line_width = int(30 * scale)
    draw.rectangle(
        [int(150 * scale), int(150 * scale), 
         int(180 * scale), int(362 * scale)],
        fill=WHITE
    )
    
    # Upper diagonal
    points = [
        (int(180 * scale), int(256 * scale)),
        (int(280 * scale), int(156 * scale)),
        (int(300 * scale), int(176 * scale)),
        (int(200 * scale), int(276 * scale))
    ]
    draw.polygon(points, fill=WHITE)
    
    # Lower diagonal
    points = [
        (int(180 * scale), int(256 * scale)),
        (int(280 * scale), int(356 * scale)),
        (int(300 * scale), int(336 * scale)),
        (int(200 * scale), int(236 * scale))
    ]
    draw.polygon(points, fill=WHITE)
    
    # Draw accent circle
    circle_size = int(35 * scale)
    draw.ellipse(
        [int(380 * scale) - circle_size, int(380 * scale) - circle_size,
         int(380 * scale) + circle_size, int(380 * scale) + circle_size],
        fill=WHITE
    )
    
    return img

def main():
    """Generate all icon sizes"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    
    print("Kreative Icon Generator")
    print("=" * 50)
    print(f"Output directory: {icons_dir}\n")
    
    # Create icons directory if it doesn't exist
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generate each size
    for size in SIZES:
        print(f"Generating icon-{size}.png...", end=" ")
        try:
            icon = create_icon(size)
            output_path = os.path.join(icons_dir, f'icon-{size}.png')
            icon.save(output_path, 'PNG')
            print("✓")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n" + "=" * 50)
    print("Icon generation complete!")
    print(f"\nGenerated {len(SIZES)} icons in the icons/ directory")
    print("\nYou can now use these icons for your PWA.")

if __name__ == '__main__':
    main()

