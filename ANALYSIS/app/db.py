import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()

DEFAULT_URL = "postgresql://projetemma:projetemma@localhost:5432/projetemma"


def database_url() -> str:
    raw = os.getenv("DATABASE_URL", DEFAULT_URL)
    parts = urlsplit(raw)
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "schema"]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def connect() -> psycopg.Connection:
    return psycopg.connect(database_url(), row_factory=dict_row)
