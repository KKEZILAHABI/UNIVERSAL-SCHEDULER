# Use a stable, lightweight Python environment
FROM python:3.12-slim

# Install C-compilers and curl (required to download Rust)
RUN apt-get update && apt-get install -y curl build-essential

# Install the Rust toolchain non-interactively
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set up the application directory
WORKDIR /app

# Install Python dependencies first (caches this layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the source code (Rust src, Cargo.toml, app.py)
COPY . .

# Compile the Rust native extension into the Python environment
RUN maturin develop --release

# Expose the port and boot the FastAPI server via Uvicorn
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]