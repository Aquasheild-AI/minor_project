from rest_framework.permissions import BasePermission


class IsAuthority(BasePermission):
    """
    Allows access only to authenticated users with the 'AUTHORITY' role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'AUTHORITY'
        )


class IsHealthWorkerOrAuthority(BasePermission):
    """
    Allows access to Health Workers and Authorities (for clinical and field data).
    Explicitly denies Community citizens.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('HEALTH_WORKER', 'AUTHORITY')
        )


class IsCommunity(BasePermission):
    """
    Allows access only to authenticated Community citizens.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'COMMUNITY'
        )


def has_village_access(user, village):
    """
    Determines if a user has jurisdiction / editing permission for a specific village:
    - AUTHORITY: Full jurisdiction across all villages.
    - HEALTH_WORKER:
        - If assigned to specific villages: must be in assigned_villages.
        - If no assigned villages yet: general field jurisdiction.
    - COMMUNITY: Read access for their own village only; no clinical edit access.
    """
    if not user or not user.is_authenticated:
        return False

    if user.role == 'AUTHORITY':
        return True

    if user.role == 'HEALTH_WORKER':
        if not user.assigned_villages.exists():
            return True
        return user.assigned_villages.filter(id=village.id).exists()

    return False
