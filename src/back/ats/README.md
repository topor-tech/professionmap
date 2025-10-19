## Local run

    uv pip compile pyproject.toml --output-file requirements.txt
    uv pip install -r requirements.txt --system

    uv sync
    uv run fastapi dev ats\app.py


## Create migration

    python -m alembic revision --autogenerate -m users --rev-id 0002
    python -m alembic upgrade head  