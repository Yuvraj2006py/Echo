FROM apache/airflow:2.9.1

USER root
COPY requirements.txt /docker-build/requirements.txt
RUN sudo -E pip install --no-cache-dir -r /docker-build/requirements.txt
USER airflow
