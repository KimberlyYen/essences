# mock 後端映像。server.py 依題目規定不改。
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8000

# 0.0.0.0 才能從容器外連進來
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
