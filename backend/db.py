"""Small helpers for short-lived, parameterized MySQL operations."""

import mysql.connector
from flask import current_app


def connect_db():
    config = current_app.config
    return mysql.connector.connect(
        host=config["MYSQL_HOST"],
        port=config["MYSQL_PORT"],
        user=config["MYSQL_USER"],
        password=config["MYSQL_PASSWORD"],
        database=config["MYSQL_DATABASE"],
        connection_timeout=config["MYSQL_CONNECT_TIMEOUT"],
    )


def fetch_all(sql, params=()):
    connection = connect_db()
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(sql, params)
        return cursor.fetchall()
    finally:
        if 'cursor' in locals():
            cursor.close()
        connection.close()


def fetch_one(sql, params=()):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql, params=(), *, commit=True):
    connection = connect_db()
    try:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        result = {"rowcount": cursor.rowcount, "lastrowid": cursor.lastrowid}
        if commit:
            connection.commit()
        return result
    except Exception:
        connection.rollback()
        raise
    finally:
        if 'cursor' in locals():
            cursor.close()
        connection.close()
