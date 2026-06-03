# Use a stable, lightweight Python environment
FROM python:3.14-rc-slim

# Install C-compilers and curl (required to download Rust)
RUN apt-get update && apt-get install -y curl build-essential

# Install the Rust toolchain non-interactively
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set up the application directory
WORKDIR /app

# Copy the source code (Rust src, Cargo.toml, app.py)
COPY . .

# Install Python backend dependencies AND maturin
RUN pip install --no-cache-dir fastapi uvicorn pydantic maturin

# PROD COMPILE: Build the Rust wheel, then install it system-wide in Docker
RUN maturin build --release --out dist
RUN pip install dist/*.whl

# Expose the port and boot the FastAPI server via Uvicorn
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]