#!/usr/bin/env python3
"""
Test script for MySQL connection
"""

import os
import sys
import socket
from dotenv import load_dotenv

# Try to import PyMySQL first, fall back to mysql-connector
try:
    import pymysql
    USE_PYMYSQL = True
    print("Using PyMySQL library")
except ImportError:
    import mysql.connector
    from mysql.connector import Error
    USE_PYMYSQL = False
    print("Using mysql-connector-python library")

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "bridge_buddy")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")

def test_port_open(host, port, timeout=5):
    """Test if a port is open using socket"""
    print(f"Testing if port {port} is open on {host}...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ Port {port} is OPEN on {host}")
            return True
        else:
            print(f"❌ Port {port} is CLOSED on {host} (error code: {result})")
            return False
    except socket.timeout:
        print(f"❌ Connection to {host}:{port} timed out after {timeout} seconds")
        return False
    except Exception as e:
        print(f"❌ Error testing port: {e}")
        return False

def test_connection():
    """Test MySQL database connection"""
    print("Testing connection...")
    print(f"Host: {MYSQL_HOST}")
    print(f"Port: {MYSQL_PORT}")
    print(f"Database: {MYSQL_DATABASE}")
    print(f"User: {MYSQL_USER}")
    
    # First test if the port is open
    print("\nPre-check: Testing if MySQL port is accessible...")
    port_open = test_port_open(MYSQL_HOST, MYSQL_PORT)
    if not port_open:
        print("\n❌ MySQL port is not accessible. MySQL may not be running or there's a firewall issue.")
        print("Please check:")
        print("  1. Is MySQL server running?")
        print("  2. Is the port correct (default 3306)?")
        print("  3. Is there a firewall blocking the connection?")
        return False
    
    # First try to connect without specifying database
    print("\nStep 1: Testing basic connection to MySQL server (without database)...")
    print("Attempting with SSL disabled...")
    try:
        if USE_PYMYSQL:
            conn = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                connect_timeout=10,
                ssl=None
            )
        else:
            conn = mysql.connector.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                connection_timeout=10,
                ssl_disabled=True
            )
        print("✅ Successfully connected to MySQL server!")
        conn.close()
    except Exception as e:
        print(f"❌ Error connecting to MySQL server: {e}")
        return False
    
    # Now try with database
    print(f"\nStep 2: Testing connection to database '{MYSQL_DATABASE}'...")
    print("Attempting with SSL disabled...")
    try:
        if USE_PYMYSQL:
            conn = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                database=MYSQL_DATABASE,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                connect_timeout=10,
                ssl=None
            )
        else:
            conn = mysql.connector.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                database=MYSQL_DATABASE,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                connection_timeout=10,
                ssl_disabled=True
            )
        
        if USE_PYMYSQL:
            print("✅ Successfully connected to database!")
        elif conn.is_connected():
            print("✅ Successfully connected to database!")
        else:
            print("❌ Failed to connect to database")
            return False
        
        # Test basic query
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"MySQL Version: {version}")
        
        # Test table existence
        tables = ['games', 'summoners', 'participants', 'participant_items', 'participant_augments', 'match_queue']
        cursor.execute("SHOW TABLES")
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        print("\nTable Status:")
        for table in tables:
            if table in existing_tables:
                print(f"✅ {table} - exists")
            else:
                print(f"❌ {table} - missing")
        
        cursor.close()
        conn.close()
        return True
            
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return False

def test_environment_variables():
    """Test if environment variables are properly set"""
    print("Checking environment variables...")
    
    required_vars = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER']
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var} = {value}")
        else:
            print(f"❌ {var} - not set")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\nMissing environment variables: {', '.join(missing_vars)}")
        print("Please set these variables in your .env file")
        return False
    
    return True

if __name__ == "__main__":
    print("MySQL Connection Test")
    print("=" * 40)
    
    # Test environment variables
    env_ok = test_environment_variables()
    
    if not env_ok:
        print("\n❌ Environment variables not properly configured")
        sys.exit(1)
    
    print()
    
    # Test database connection
    conn_ok = test_connection()
    
    if conn_ok:
        print("\n✅ All tests passed! Ready to use mysql_injestion.py")
    else:
        print("\n❌ Connection test failed")
        sys.exit(1)
