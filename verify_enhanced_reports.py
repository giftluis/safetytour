import os
import sys
import django
from django.conf import settings
from django.utils import timezone

# Configure Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safetytour.settings')
django.setup()

from django.contrib.auth.models import User
from tours.models import Visit
from tours.views import VisitStatsView
from rest_framework.test import APIRequestFactory, force_authenticate

def verify_enhanced_reporting():
    # 1. Setup test users with different BUs and Regions
    u1, _ = User.objects.get_or_create(username='tech_user_south')
    u1.profile.business_unit = 'Technology'
    u1.profile.region = 'South'
    u1.profile.role = 'manager'
    u1.profile.save()

    u2, _ = User.objects.get_or_create(username='fin_user_north')
    u2.profile.business_unit = 'Finance'
    u2.profile.region = 'North'
    u2.profile.role = 'manager'
    u2.profile.save()

    # Cleanup old test visits
    Visit.objects.filter(visit_no__startswith='TEST-').delete()

    # 2. Create visits in different months to test fiscal quarters
    import datetime
    # Q1: April, Q2: July, Q3: October, Q4: January (Next Year)
    Visit.objects.create(visit_no='TEST-001', created_by=u1, manager_name='M1', visit_datetime=timezone.datetime(2025, 4, 15, tzinfo=datetime.timezone.utc))
    Visit.objects.create(visit_no='TEST-002', created_by=u1, manager_name='M1', visit_datetime=timezone.datetime(2025, 7, 20, tzinfo=datetime.timezone.utc))
    Visit.objects.create(visit_no='TEST-003', created_by=u2, manager_name='M2', visit_datetime=timezone.datetime(2025, 10, 5, tzinfo=datetime.timezone.utc))
    Visit.objects.create(visit_no='TEST-004', created_by=u2, manager_name='M2', visit_datetime=timezone.datetime(2026, 1, 10, tzinfo=datetime.timezone.utc))

    factory = APIRequestFactory()
    admin = User.objects.filter(is_superuser=True).first() or \
            User.objects.filter(profile__role='safety_admin').first()

    if not admin:
        print("No admin user found to run stats as. Please create one.")
        return

    print(f"\n--- Running Enhanced Stats as {admin.username} ---")
    view = VisitStatsView.as_view()
    request = factory.get('/api/tours/stats/visits/')
    force_authenticate(request, user=admin)
    response = view(request)

    stats = response.data
    
    print("\nVisits by Business Unit:")
    for bu in stats['by_bu']:
        print(f" - {bu['created_by__profile__business_unit']}: {bu['count']}")

    print("\nVisits by Region:")
    for reg in stats['by_region']:
        print(f" - {reg['created_by__profile__region']}: {reg['count']}")

    print("\nVisits by Fiscal Quarter:")
    for q in stats['by_quarter']:
        print(f" - FY{q['fiscal_year']} {q['quarter']}: {q['count']}")

    print("\nVerification complete.")

if __name__ == "__main__":
    verify_enhanced_reporting()
