from PIL import Image, ImageDraw, ImageFont

# Create a red image for Vodafone logo placeholder
img = Image.new('RGB', (200, 200), color='#e60000')
d = ImageDraw.Draw(img)
# Just a simple square is enough to test, maybe add text if font available, but simple is safer
# d.text((10,10), "Vodafone", fill=(255,255,255))

img.save('backend/media/vodafone_logo.png')
print("Created valid vodafone_logo.png")
