# Hugging Face Spaces Dockerfile
# Configured for non-root user (UID 1000) on Port 7860 (Free Tier 2 vCPU / 16 GB)

FROM python:3.12-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    HOME=/home/user

# Create non-root user with UID 1000
RUN useradd -m -u 1000 user
WORKDIR $HOME/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY --chown=user:user . .

# Ensure data directory exists and is writable by user 1000
RUN mkdir -p data && chown -R user:user data

# Switch to non-root user
USER user

# Expose Hugging Face Spaces default port
EXPOSE 7860

# Launch Uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
