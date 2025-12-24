import psycopg2
from psycopg2 import sql

try:
    conn = psycopg2.connect(
        host="localhost",
        user="postgres",
        password="FNscar@!007",
        port=5432
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute("CREATE DATABASE pos_system;")
    print("Database 'pos_system' created successfully!")
    
    cur.close()
    conn.close()
except psycopg2.Error as e:
    if 'already exists' in str(e):
        print("Database 'pos_system' already exists!")
    else:
        print(f"Error: {e}")
