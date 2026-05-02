from supabase import create_client, Client
from app.config import settings

def get_supabase_client(jwt: str = None) -> Client:
    """Return a Supabase client. If JWT is provided, use it for authenticated requests."""
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
    )
    if jwt:
        client.postgrest.auth(jwt)
    return client
