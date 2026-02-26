FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ml_service/ ./ml_service/
COPY data/ ./data/
COPY config.json .
EXPOSE 5000
CMD ["python", "-m", "ml_service.training.train_pipeline"]
