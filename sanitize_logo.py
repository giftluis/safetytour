from PIL import Image
import os

path = 'backend/media/vodafone_logo.png'
try:
    img = Image.open(path)
    print(f"Original: {img.format}, {img.size}, {img.mode}")
    
    # Resize to reasonable dimension if huge (e.g. keep width < 500)
    if img.width > 500:
        ratio = 500 / img.width
        new_height = int(img.height * ratio)
        img = img.resize((500, new_height), Image.Resampling.LANCZOS)
        
    # Convert to RGBA to ensure compatibility (or RGB if alpha not needed, but logo usually has transp)
    img = img.convert("RGBA")
    img.save(path, "PNG")
    print("Sanitized and saved successfully.")
except Exception as e:
    print(f"Error processing image: {e}")
