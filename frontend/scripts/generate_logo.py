#!/usr/bin/env python3
"""
DocScan Pro Logo Generator
Creates beautiful, meaningful logo and favicon for the app
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

# Colors
PRIMARY_BLUE = (37, 99, 235)  # #2563EB
DARK_BLUE = (30, 64, 175)     # #1E40AF
LIGHT_BLUE = (96, 165, 250)   # #60A5FA
WHITE = (255, 255, 255)
DARK_BG = (15, 23, 42)        # #0F172A

def create_gradient_background(size, color1, color2, direction='diagonal'):
    """Create a gradient background"""
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    for i in range(size[1]):
        if direction == 'diagonal':
            ratio = (i + size[0]/2) / (size[0] + size[1])
        else:
            ratio = i / size[1]
        
        r = int(color1[0] + (color2[0] - color1[0]) * ratio)
        g = int(color1[1] + (color2[1] - color1[1]) * ratio)
        b = int(color1[2] + (color2[2] - color1[2]) * ratio)
        
        draw.line([(0, i), (size[0], i)], fill=(r, g, b, 255))
    
    return img

def draw_rounded_rect(draw, coords, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    
    # Draw the four corners as arcs
    draw.ellipse([x1, y1, x1 + 2*radius, y1 + 2*radius], fill=fill, outline=outline, width=width)
    draw.ellipse([x2 - 2*radius, y1, x2, y1 + 2*radius], fill=fill, outline=outline, width=width)
    draw.ellipse([x1, y2 - 2*radius, x1 + 2*radius, y2], fill=fill, outline=outline, width=width)
    draw.ellipse([x2 - 2*radius, y2 - 2*radius, x2, y2], fill=fill, outline=outline, width=width)
    
    # Draw the rectangles to fill the middle
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill, outline=None)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill, outline=None)

def create_document_icon(size=512):
    """Create a stylized document/scanner icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate proportions
    margin = size * 0.1
    doc_width = size * 0.6
    doc_height = size * 0.75
    
    # Document position (slightly offset for 3D effect)
    doc_x = (size - doc_width) / 2
    doc_y = (size - doc_height) / 2 + margin/2
    
    # Draw shadow document (back)
    shadow_offset = size * 0.03
    draw_rounded_rect(
        draw,
        [doc_x + shadow_offset, doc_y + shadow_offset, 
         doc_x + doc_width + shadow_offset, doc_y + doc_height + shadow_offset],
        radius=size * 0.04,
        fill=(30, 64, 175, 100)
    )
    
    # Draw main document
    draw_rounded_rect(
        draw,
        [doc_x, doc_y, doc_x + doc_width, doc_y + doc_height],
        radius=size * 0.04,
        fill=WHITE
    )
    
    # Draw document lines (text representation)
    line_margin = size * 0.08
    line_height = size * 0.025
    line_spacing = size * 0.055
    
    for i in range(5):
        line_y = doc_y + line_margin + (i * line_spacing) + size * 0.15
        line_width = doc_width * (0.7 if i < 4 else 0.4)  # Last line shorter
        
        draw_rounded_rect(
            draw,
            [doc_x + line_margin, line_y, 
             doc_x + line_margin + line_width, line_y + line_height],
            radius=line_height/2,
            fill=(200, 210, 230)
        )
    
    # Draw scan beam effect
    beam_y = doc_y + size * 0.12
    beam_height = size * 0.015
    
    # Gradient beam
    for i in range(int(beam_height)):
        alpha = int(255 * (1 - abs(i - beam_height/2) / (beam_height/2)))
        draw.line(
            [(doc_x + line_margin/2, beam_y + i), 
             (doc_x + doc_width - line_margin/2, beam_y + i)],
            fill=(37, 99, 235, alpha)
        )
    
    # Draw corner fold
    fold_size = size * 0.12
    fold_x = doc_x + doc_width - fold_size
    fold_y = doc_y
    
    # White triangle to "cut" corner
    draw.polygon([
        (fold_x, fold_y),
        (doc_x + doc_width, fold_y),
        (doc_x + doc_width, fold_y + fold_size)
    ], fill=(0, 0, 0, 0))
    
    # Folded corner effect
    draw.polygon([
        (fold_x, fold_y + fold_size),
        (fold_x, fold_y),
        (doc_x + doc_width, fold_y + fold_size)
    ], fill=(220, 230, 245))
    
    return img

def create_math_symbol(size=512):
    """Create a math/AI symbol overlay"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a stylized sigma/integral symbol at bottom right
    symbol_size = size * 0.25
    symbol_x = size * 0.62
    symbol_y = size * 0.58
    
    # Circle background
    circle_radius = symbol_size * 0.6
    draw.ellipse(
        [symbol_x - circle_radius, symbol_y - circle_radius,
         symbol_x + circle_radius, symbol_y + circle_radius],
        fill=PRIMARY_BLUE
    )
    
    # Draw "Σ" or checkmark symbol
    line_width = int(size * 0.025)
    
    # Checkmark (success/AI processed)
    check_points = [
        (symbol_x - circle_radius * 0.4, symbol_y),
        (symbol_x - circle_radius * 0.1, symbol_y + circle_radius * 0.35),
        (symbol_x + circle_radius * 0.45, symbol_y - circle_radius * 0.35)
    ]
    draw.line(check_points[:2], fill=WHITE, width=line_width)
    draw.line(check_points[1:], fill=WHITE, width=line_width)
    
    return img

def create_app_icon(output_path, size=1024):
    """Create the main app icon"""
    # Create background with gradient
    bg = create_gradient_background((size, size), PRIMARY_BLUE, DARK_BLUE)
    
    # Round the corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    radius = size * 0.22  # iOS-style rounded corners
    draw_rounded_rect(mask_draw, [0, 0, size, size], radius, fill=255)
    
    # Create final image
    final = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    final.paste(bg, mask=mask)
    
    # Add document icon
    doc_icon = create_document_icon(size)
    final = Image.alpha_composite(final, doc_icon)
    
    # Add math/AI symbol
    math_symbol = create_math_symbol(size)
    final = Image.alpha_composite(final, math_symbol)
    
    # Save at different sizes
    # Main icon (1024x1024)
    final.save(output_path.replace('.png', '_full.png'), 'PNG')
    
    # Standard icon (512x512)
    icon_512 = final.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(output_path, 'PNG')
    
    # Smaller sizes
    icon_192 = final.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(output_path.replace('.png', '_192.png'), 'PNG')
    
    return final

def create_adaptive_icon(output_path, size=1024):
    """Create Android adaptive icon (foreground only, no background)"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Scale down the icon for safe zone (72% of total)
    safe_size = int(size * 0.72)
    offset = (size - safe_size) // 2
    
    # Create document icon at smaller size
    doc_icon = create_document_icon(safe_size)
    img.paste(doc_icon, (offset, offset), doc_icon)
    
    # Add math symbol
    math_symbol = create_math_symbol(safe_size)
    
    # Offset math symbol
    math_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    math_img.paste(math_symbol, (offset, offset), math_symbol)
    img = Image.alpha_composite(img, math_img)
    
    img.save(output_path, 'PNG')
    return img

def create_favicon(output_path, size=64):
    """Create web favicon"""
    # Create at larger size then scale down
    large_size = 256
    
    img = Image.new('RGBA', (large_size, large_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded square background
    radius = large_size * 0.15
    draw_rounded_rect(draw, [0, 0, large_size, large_size], radius, fill=PRIMARY_BLUE)
    
    # Simplified document icon for favicon
    doc_margin = large_size * 0.2
    doc_width = large_size - 2 * doc_margin
    doc_height = doc_width * 1.2
    doc_x = doc_margin
    doc_y = (large_size - doc_height) / 2
    
    # Document shape
    draw_rounded_rect(
        draw,
        [doc_x, doc_y, doc_x + doc_width, doc_y + doc_height],
        radius=large_size * 0.05,
        fill=WHITE
    )
    
    # Simple lines
    line_y_start = doc_y + large_size * 0.15
    for i in range(3):
        line_y = line_y_start + i * (large_size * 0.12)
        line_end = doc_x + doc_width * (0.7 if i < 2 else 0.5)
        draw.rectangle(
            [doc_x + large_size * 0.08, line_y, 
             line_end, line_y + large_size * 0.05],
            fill=(180, 200, 220)
        )
    
    # Checkmark badge
    badge_size = large_size * 0.35
    badge_x = large_size - badge_size - large_size * 0.05
    badge_y = large_size - badge_size - large_size * 0.05
    
    draw.ellipse(
        [badge_x, badge_y, badge_x + badge_size, badge_y + badge_size],
        fill=(34, 197, 94)  # Green
    )
    
    # Checkmark
    check_cx = badge_x + badge_size/2
    check_cy = badge_y + badge_size/2
    check_size = badge_size * 0.35
    
    draw.line([
        (check_cx - check_size * 0.6, check_cy),
        (check_cx - check_size * 0.1, check_cy + check_size * 0.5),
        (check_cx + check_size * 0.6, check_cy - check_size * 0.4)
    ], fill=WHITE, width=int(large_size * 0.04))
    
    # Resize to target size
    favicon = img.resize((size, size), Image.Resampling.LANCZOS)
    favicon.save(output_path, 'PNG')
    
    # Also save 32x32 version
    favicon_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    favicon_32.save(output_path.replace('.png', '_32.png'), 'PNG')
    
    return favicon

def create_splash_icon(output_path, size=512):
    """Create splash screen icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # Document icon
    doc_icon = create_document_icon(size)
    img = Image.alpha_composite(img, doc_icon)
    
    # Math symbol
    math_symbol = create_math_symbol(size)
    img = Image.alpha_composite(img, math_symbol)
    
    img.save(output_path, 'PNG')
    return img

def main():
    output_dir = '/app/frontend/assets/images'
    
    print("🎨 Creating DocScan Pro Logo Suite...")
    
    # Create main app icon
    print("  📱 Creating app icon...")
    create_app_icon(f'{output_dir}/icon.png', 1024)
    
    # Create adaptive icon for Android
    print("  🤖 Creating adaptive icon...")
    create_adaptive_icon(f'{output_dir}/adaptive-icon.png', 1024)
    
    # Create favicon
    print("  🌐 Creating favicon...")
    create_favicon(f'{output_dir}/favicon.png', 64)
    
    # Create splash icon
    print("  💫 Creating splash icon...")
    create_splash_icon(f'{output_dir}/splash-icon.png', 512)
    
    print("✅ All logos created successfully!")
    print(f"   Output directory: {output_dir}")

if __name__ == '__main__':
    main()
