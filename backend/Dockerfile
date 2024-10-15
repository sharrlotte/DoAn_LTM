# Stage 1: Build stage
FROM python:3.11-slim AS builder

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the working directory
COPY requirements.txt .
COPY dev.env .

# Install the required Python packages in a temporary directory
RUN --mount=type=cache,target=/root/.cache/pip pip3 install --no-cache-dir --target=/app/dependencies -r requirements.txt


# Stage 2: Final stage
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy only the dependencies from the builder stage
COPY --from=builder /app/dependencies /usr/local/lib/python3.11/site-packages/

# Copy the rest of your application code to the working directory
COPY . .

# Expose the port that the app runs on
EXPOSE 8080

# Define the command to run your application
CMD ["python", "app.py"]
