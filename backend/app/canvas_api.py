"""
Canvas REST API client — adapted from the local canvas_checker.py script.
"""
import json
import urllib.request
import urllib.error
import ipaddress
import socket
from urllib.parse import urlparse
from datetime import datetime, timezone, timedelta


class CanvasError(Exception):
    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


# ── Security: validate user-supplied Canvas URL ───────────────────────────────

PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def validate_canvas_url(url: str) -> str:
    """
    Ensure the URL is HTTPS, has no path beyond the domain,
    and resolves to a public IP (SSRF protection).
    Returns the normalised base URL or raises ValueError.
    """
    parsed = urlparse(url.strip().rstrip("/"))
    if parsed.scheme != "https":
        raise ValueError("Canvas URL must use HTTPS")
    if not parsed.netloc:
        raise ValueError("Invalid URL — no hostname")
    if parsed.path not in ("", "/"):
        raise ValueError("Supply only the base domain (e.g. https://canvas.instructure.com)")

    try:
        infos = socket.getaddrinfo(parsed.netloc, None)
    except socket.gaierror:
        raise ValueError(f"Cannot resolve hostname: {parsed.netloc}")

    for info in infos:
        addr = ipaddress.ip_address(info[4][0])
        if any(addr in net for net in PRIVATE_RANGES):
            raise ValueError("Canvas URL must not point to a private or loopback address")

    return f"https://{parsed.netloc}"


# ── API requests ──────────────────────────────────────────────────────────────

def _get(base_url: str, token: str, path: str) -> list:
    results = []
    sep = "&" if "?" in path else "?"
    url = f"{base_url}/api/v1{path}{sep}per_page=100"

    while url:
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                results.extend(data if isinstance(data, list) else [data])
                url = _next_link(resp.headers.get("Link", ""))
        except urllib.error.HTTPError as e:
            raise CanvasError(e.read().decode(), status_code=e.code)
        except OSError as e:
            raise CanvasError(str(e))
    return results


def _next_link(link_header: str):
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            return part.split(";")[0].strip().strip("<>")
    return None


# ── Public API ────────────────────────────────────────────────────────────────

def validate_token(base_url: str, token: str) -> dict:
    """Call /api/v1/users/self to confirm token is valid. Returns user info."""
    results = _get(base_url, token, "/users/self?include[]=email")
    if not results:
        raise CanvasError("Empty response from Canvas")
    return results[0]


def get_active_courses(base_url: str, token: str) -> list[dict]:
    courses = _get(
        base_url, token,
        "/courses?enrollment_state=active&enrollment_type=student&state[]=available"
    )
    return [c for c in courses if isinstance(c, dict) and c.get("id")]


def get_upcoming_assignments(base_url: str, token: str, course_id: int) -> list[dict]:
    assignments = _get(
        base_url, token,
        f"/courses/{course_id}/assignments?bucket=upcoming&order_by=due_at"
    )
    return [a for a in assignments if isinstance(a, dict) and a.get("due_at")]


def get_all_upcoming(base_url: str, token: str) -> list[dict]:
    """Return all upcoming assignments across active courses, sorted by due date."""
    courses = get_active_courses(base_url, token)
    now = datetime.now(timezone.utc)
    results = []

    for course in courses:
        try:
            assignments = get_upcoming_assignments(base_url, token, course["id"])
        except CanvasError:
            continue
        for a in assignments:
            due = datetime.fromisoformat(a["due_at"].replace("Z", "+00:00"))
            if due > now:
                results.append({
                    "id":         str(a["id"]),
                    "name":       a.get("name", "Unnamed"),
                    "course_id":  str(course["id"]),
                    "course_name": course.get("name", f"Course {course['id']}"),
                    "due_at":     due.isoformat(),
                    "points":     a.get("points_possible"),
                    "url":        a.get("html_url", ""),
                })

    results.sort(key=lambda x: x["due_at"])
    return results


def assignments_due_within(base_url: str, token: str, hours: int) -> list[dict]:
    """Return assignments due within `hours` hours from now."""
    all_upcoming = get_all_upcoming(base_url, token)
    cutoff = datetime.now(timezone.utc) + timedelta(hours=hours)
    return [
        a for a in all_upcoming
        if datetime.fromisoformat(a["due_at"]) <= cutoff
    ]
