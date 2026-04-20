import os
from django.conf import settings
from rest_framework import viewsets, status

from xhtml2pdf import pisa
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.template.loader import get_template
from accounts.models import UserProfile
from .models import Visit, Observation, ActionItem, Attachment, Participant
from accounts.models import UserProfile
from .models import Visit, Observation, ActionItem, Attachment, Participant
from .utils import link_callback
from .serializers import (
    VisitSerializer, VisitCreateSerializer,
    ObservationSerializer, ActionItemSerializer,
    AttachmentSerializer, ParticipantSerializer
)
from .permissions import IsOwnerOrReadOnly

class VisitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        # Safety Admins see all. Managers (or others) see only created_by.
        # Superusers also see all.
        try:
            if user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'safety_admin'):
                return Visit.objects.all().order_by("-visit_datetime", "-id")
        except:
            pass
        
        return Visit.objects.filter(created_by=user).order_by("-visit_datetime", "-id")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return VisitCreateSerializer
        return VisitSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        visit = self.get_object()
        if visit.status != "draft":
            return Response({"detail": "Only draft visits can be submitted."}, status=400)
        visit.status = "submitted"
        visit.save(update_fields=["status", "updated_at"])
        return Response({"detail": "Submitted."})

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        visit = self.get_object()
        if visit.status != "submitted":
            return Response({"detail": "Only submitted visits can be closed."}, status=400)
        visit.status = "closed"
        visit.save(update_fields=["status", "updated_at"])
        return Response({"detail": "Closed."})

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        try:
            visit = self.get_object()
        except Exception as e:
            return HttpResponse(f"Error getting visit: {e}", status=400)
            
        # Collect all photos for the gallery
        all_photos = []
        # 1. Visit attachments
        all_photos.extend(visit.attachments.all())
        # 2. Observation attachments
        for obs in visit.observations.all():
            all_photos.extend(obs.attachments.all())
            # 3. Action attachments
            for action in obs.actions.all():
                 all_photos.extend(action.attachments.all())

        # Dynamic chunking for photos
        photos_per_page = 9
        photo_pages = []
        
        for i in range(0, len(all_photos), photos_per_page):
            page_photos = all_photos[i:i + photos_per_page]
            num_on_page = len(page_photos)
            
            rows = []
            if num_on_page == 1:
                rows = [page_photos] # One row of 1
            elif num_on_page == 2:
                rows = [page_photos] # One row of 2
            elif num_on_page == 4:
                rows = [page_photos[0:2], page_photos[2:4]] # Two rows of 2
            else:
                # Default 3 columns per row
                for j in range(0, num_on_page, 3):
                    rows.append(page_photos[j:j+3])
            
            photo_pages.append({
                'rows': rows,
                'count': num_on_page
            })

        template_path = 'tours/visit_pdf.html'
        context = {
            'visit': visit, 
            'photo_pages': photo_pages,
            'settings': settings,
        }

        response = HttpResponse(content_type='application/pdf')
        filename = f"visit_{visit.visit_no}.pdf"
        template = get_template(template_path)
        html = template.render(context)
        
        # Check for preview mode
        is_preview = request.query_params.get('preview') == 'true'
        disposition = 'inline' if is_preview else f'attachment; filename="{filename}"'
        response['Content-Disposition'] = disposition

        try:
            import traceback
            # Create PDF
            pisa_status = pisa.CreatePDF(html, dest=response, link_callback=link_callback)
            if pisa_status.err:
                return HttpResponse('We had some errors <pre>' + html + '</pre>')
        except Exception as e:
            err_msg = traceback.format_exc()
            print(f"PDF GENERATION ERROR: {err_msg}")
            # Return detailed error for frontend debugging
            return HttpResponse(f'Error generating PDF: {str(e)}\n\n{err_msg}', status=500)
            
        return response


class ObservationViewSet(viewsets.ModelViewSet):
    queryset = Observation.objects.select_related("visit").all()
    serializer_class = ObservationSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        visit_id = request.data.get("visit")
        if not visit_id:
            return Response({"detail": "visit is required"}, status=400)
        # Prevent edits on closed visits
        v = Visit.objects.get(id=visit_id)
        if v.status == "closed":
            return Response({"detail": "Visit is closed."}, status=400)
        return super().create(request, *args, **kwargs)


class ActionItemViewSet(viewsets.ModelViewSet):
    queryset = ActionItem.objects.select_related("observation", "responsible").all()
    serializer_class = ActionItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ActionItem.objects.select_related("observation", "responsible").all()
        
        # RBAC: If not Safety Admin or Superuser, filter.
        if not (user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'safety_admin')):
            qs = qs.filter(
                Q(responsible=user) | 
                Q(observation__visit__created_by=user)
            )

        status_param = self.request.query_params.get('status')
        responsible_param = self.request.query_params.get('responsible')
        
        if status_param:
            if status_param == 'open_all':
                qs = qs.exclude(status='closed')
            else:
                qs = qs.filter(status=status_param)
        
        if responsible_param:
            qs = qs.filter(responsible_id=responsible_param)
            
        return qs.distinct().order_by("due_date", "id")

    def create(self, request, *args, **kwargs):
        obs_id = request.data.get("observation")
        if not obs_id:
            return Response({"detail": "observation is required"}, status=400)
        obs = Observation.objects.select_related("visit").get(id=obs_id)
        if obs.visit.status == "closed":
            return Response({"detail": "Visit is closed."}, status=400)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = self.get_queryset().filter(responsible=request.user).order_by("status", "due_date", "-id")
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        action_item = self.get_object()
        notes = request.data.get("completion_notes", "")
        action_item.status = "closed"
        action_item.completion_notes = notes
        action_item.completed_at = timezone.now()
        action_item.save(update_fields=["status", "completion_notes", "completed_at"])
        return Response({"detail": "Action closed."})


class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all().order_by("-uploaded_at")
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # multipart form upload: image + link_type + target id
        link_type = request.data.get("link_type")
        caption = request.data.get("caption", "")

        if link_type not in ["visit", "observation", "action"]:
            return Response({"detail": "Invalid link_type"}, status=400)

        data = {"link_type": link_type, "caption": caption}

        if link_type == "visit":
            data["visit"] = request.data.get("visit")
        elif link_type == "observation":
            data["observation"] = request.data.get("observation")
        else:
            data["action"] = request.data.get("action")

        # DRF ModelViewSet create expects serializer; use request.FILES
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        obj = Attachment(
            link_type=link_type,
            caption=caption,
            uploaded_by=request.user,
            image=request.FILES.get("image"),
            visit_id=data.get("visit") or None,
            observation_id=data.get("observation") or None,
            action_id=data.get("action") or None,
        )
        obj.full_clean()
        obj.save()

        out = AttachmentSerializer(obj, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)


class ParticipantViewSet(viewsets.ModelViewSet):
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer
    permission_classes = [IsAuthenticated]


class VisitStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = self.request.user
        visits = Visit.objects.select_related('created_by__profile').all()
        
        # Date Range Filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            visits = visits.filter(visit_datetime__date__gte=start_date)
        if end_date:
            visits = visits.filter(visit_datetime__date__lte=end_date)

        # RBAC: Filter visits if not safety_admin/superuser
        if not (user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'safety_admin')):
            visits = visits.filter(created_by=user)

        # 1. Visits per Manager
        manager_stats = (
            visits
            .values('manager_name', 'created_by__profile__region', 'created_by__profile__business_unit', 'created_by__profile__role')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # 2. Visits per Month
        month_stats = (
            visits
            .annotate(month=TruncMonth('visit_datetime'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        formatted_month_stats = []
        for entry in month_stats:
            if entry['month']:
                formatted_month_stats.append({
                    "month": entry['month'].strftime("%Y-%m"), 
                    "count": entry['count']
                })
        
        # 3. Visits by Business Unit
        bu_stats = (
            visits
            .values('created_by__profile__business_unit')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # 4. Visits by Region
        region_stats = (
            visits
            .values('created_by__profile__region')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # 5. Visits by Fiscal Quarter (Q1 = April-June)
        # Logic: Month 4,5,6 -> Q1; 7,8,9 -> Q2; 10,11,12 -> Q3; 1,2,3 -> Q4
        from django.db.models.functions import ExtractMonth, ExtractYear
        from django.db.models import Case, When, Value, CharField, IntegerField
        
        quarter_stats = (
            visits
            .annotate(
                month=ExtractMonth('visit_datetime'),
                year=ExtractYear('visit_datetime'),
                fiscal_year=Case(
                    When(month__gte=4, then=ExtractYear('visit_datetime')),
                    default=ExtractYear('visit_datetime') - 1,
                    output_field=IntegerField()
                ),
                quarter=Case(
                    When(month__in=[4, 5, 6], then=Value('Q1')),
                    When(month__in=[7, 8, 9], then=Value('Q2')),
                    When(month__in=[10, 11, 12], then=Value('Q3')),
                    When(month__in=[1, 2, 3], then=Value('Q4')),
                    output_field=CharField()
                )
            )
            .values('fiscal_year', 'quarter')
            .annotate(count=Count('id'))
            .order_by('-fiscal_year', 'quarter')
        )

        # 6. Blended Stats (Quarter x Region x BU)
        blended_stats = (
            visits
            .annotate(
                month=ExtractMonth('visit_datetime'),
                fiscal_year=Case(
                    When(month__gte=4, then=ExtractYear('visit_datetime')),
                    default=ExtractYear('visit_datetime') - 1,
                    output_field=IntegerField()
                ),
                quarter=Case(
                    When(month__in=[4, 5, 6], then=Value('Q1')),
                    When(month__in=[7, 8, 9], then=Value('Q2')),
                    When(month__in=[10, 11, 12], then=Value('Q3')),
                    When(month__in=[1, 2, 3], then=Value('Q4')),
                    output_field=CharField()
                )
            )
            .values('fiscal_year', 'quarter', 'created_by__profile__region', 'created_by__profile__business_unit', 'created_by__profile__role', 'area_category')
            .annotate(count=Count('id'))
            .order_by('-fiscal_year', 'quarter', 'created_by__profile__region', 'created_by__profile__business_unit', 'created_by__profile__role', 'area_category')
        )

        # 7. Category by Manager Matrix
        by_category_manager = (
            visits
            .values('area_category', 'manager_name', 'created_by__profile__region', 'created_by__profile__business_unit', 'created_by__profile__role')
            .annotate(count=Count('id'))
            .order_by('manager_name', 'area_category')
        )

        return Response({
            "by_manager": list(manager_stats),
            "by_month": formatted_month_stats,
            "by_bu": list(bu_stats),
            "by_region": list(region_stats),
            "by_quarter": list(quarter_stats),
            "by_blended": list(blended_stats),
            "by_category_manager": list(by_category_manager),
        })


class ActionStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = self.request.user
        actions = ActionItem.objects.all()
        
        # RBAC: Filter actions if not safety_admin/superuser
        if not (user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'safety_admin')):
             actions = actions.filter(
                Q(responsible=user) | 
                Q(observation__visit__created_by=user)
             )

        # Stats: Open vs Closed actions per responsible user
        stats = (
            actions
            .values('responsible__username', 'responsible__email', 'responsible__first_name', 'responsible__last_name', 'status')
            .annotate(count=Count('id'))
            .order_by('responsible__username')
        )
        
        data = {}
        for item in stats:
            username = item['responsible__username'] or "Unknown"
            email = item['responsible__email'] or ""
            # Construct full name
            first = item['responsible__first_name'] or ""
            last = item['responsible__last_name'] or ""
            name = f"{first} {last}".strip() or username
            
            if username not in data:
                data[username] = {
                    'username': username,
                    'name': name,
                    'email': email,
                    'open': 0,
                    'in_progress': 0,
                    'closed': 0,
                    'total': 0
                }
            
            status_val = item['status']
            count = item['count']
            
            if status_val == 'open':
                data[username]['open'] += count
            elif status_val == 'in_progress':
                data[username]['in_progress'] += count
            else: # closed
                data[username]['closed'] += count
            
            data[username]['total'] += count
            
        # 2. Open vs Still Open per Manager & Month
        # We need: per manager, per month: count(total created), count(still open)
        
        month_stats = (
            actions
            .annotate(month=TruncMonth('created_at'))
            .values('month', 'responsible__username', 'responsible__first_name', 'responsible__last_name')
            .annotate(
                total_created=Count('id'),
                still_open=Count('id', filter=Q(status__in=['open', 'in_progress'])),
                in_progress=Count('id', filter=Q(status='in_progress'))
            )
            .order_by('month', 'responsible__username')
        )
        
        monthly_data = []
        for entry in month_stats:
            if not entry['month']: continue
            
            username = entry['responsible__username'] or "Unknown"
            first = entry['responsible__first_name'] or ""
            last = entry['responsible__last_name'] or ""
            name = f"{first} {last}".strip() or username
            
            monthly_data.append({
                "month": entry['month'].strftime("%Y-%m"),
                "manager": name,
                "username": username,
                "total_created": entry['total_created'],
                "still_open": entry['still_open'],
                "in_progress": entry['in_progress']
            })

        return Response({
            "current_status": list(data.values()),
            "history": monthly_data
        })

