FROM python:3.11-slim

RUN pip install --no-cache-dir onnxruntime numpy

WORKDIR /sandbox
COPY app.py /sandbox/app.py

RUN useradd -m -u 10001 sandboxuser && \
    mkdir -p /sandbox/sock /sandbox/models && \
    chown -R sandboxuser:sandboxuser /sandbox
USER sandboxuser

ENTRYPOINT ["python3", "/sandbox/app.py"]