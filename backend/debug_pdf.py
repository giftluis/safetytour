import os
import django
from django.conf import settings

# Setup Django environment manually if run directly (though shell handles this)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safetytour.settings')
django.setup()

from tours.models import Visit
from django.template.loader import get_template
from xhtml2pdf import pisa
from tours.utils import link_callback
from django.http import HttpResponse

try:
    print("Fetching visit 5...")
    v = Visit.objects.get(id=5)
    print(f"Found visit: {v}")
    
    # Simulate the logic in views.py
    print("Collecting photos...")
    all_photos = []
    all_photos.extend(v.attachments.all())
    for obs in v.observations.all():
        all_photos.extend(obs.attachments.all())
        for action in obs.actions.all():
            all_photos.extend(action.attachments.all())
    
    print(f"Found {len(all_photos)} photos.")
    
    # Chunk logic mimicking views.py
    photos_per_page = 9
    raw_pages = [all_photos[i:i + photos_per_page] for i in range(0, len(all_photos), photos_per_page)]
    
    photo_pages = []
    for p in raw_pages:
        rows = [p[i:i + 3] for i in range(0, len(p), 3)]
        photo_pages.append(rows)
    
    print("Rendering template...")
    template = get_template('tours/visit_pdf.html')
    # Context must match view (need media_root for logo)
    html = template.render({
        'visit': v, 
        'photo_pages': photo_pages, 
        'media_root': settings.MEDIA_ROOT,
        'logo_path': os.path.join(settings.MEDIA_ROOT, 'vodafone_logo.png')
    })
    print("Template rendered. HTML length:", len(html))
    
    print("Generating PDF...")
    dest = HttpResponse(content_type='application/pdf')
    pisa_status = pisa.CreatePDF(html, dest=dest, link_callback=link_callback)
    
    if pisa_status.err:
        print("Pisa reported errors!")
    else:
        print("PDF Success!")
        
except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
    import traceback
    traceback.print_exc()
