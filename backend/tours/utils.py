import os
from django.conf import settings
from django.contrib.staticfiles import finders
from urllib.parse import urlparse

def link_callback(uri, rel):
    """
    Convert HTML URIs to absolute system paths so xhtml2pdf can access those
    resources on the local file system.
    """
    if not uri:
        return uri

    # 1. Get the path from URI (strips http://domain if present)
    parsed_uri = urlparse(uri)
    path = parsed_uri.path or uri # Fallback to uri if path is empty (e.g. just a filename)

    # 2. Handle media files FIRST
    if path.startswith(settings.MEDIA_URL):
        media_path = path.replace(settings.MEDIA_URL, "", 1)
        full_path = os.path.join(str(settings.MEDIA_ROOT), media_path)
        if os.path.exists(full_path):
            return full_path

    # 3. Check static files
    # Only use finders if it's not looking like a media/absolute path
    if not path.startswith('/') or path.startswith(settings.STATIC_URL):
        try:
            result = finders.find(path)
            if result:
                if isinstance(result, (list, tuple)):
                    result = result[0]
                return result
        except:
            pass

    # 4. Handle static files (if not found by finders but has STATIC_URL)
    if path.startswith(settings.STATIC_URL):
        static_path = path.replace(settings.STATIC_URL, "", 1)
        if hasattr(settings, 'STATIC_ROOT') and settings.STATIC_ROOT:
            full_path = os.path.join(str(settings.STATIC_ROOT), static_path)
            if os.path.exists(full_path):
                return full_path

    # 5. If it's already an absolute path on disk
    if os.path.isabs(uri) and os.path.exists(uri):
        return uri

    # 6. Fallback: try relative to media root
    potential_media = os.path.join(str(settings.MEDIA_ROOT), uri.lstrip('/'))
    if os.path.exists(potential_media):
        return potential_media
        
    return uri
