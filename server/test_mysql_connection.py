#!/usr/bin/env python3
"""
Test script for Oracle MySQL Heatwave connection
"""

import os
import sys
from dotenv import load_dotenv
from mysql.connector import Error

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Add server directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import configuration from mysql_injestion
from mysql_injestion import get_db_connection, MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD

def test_connection():
    """Test MySQL database connection"""
    print("Testing Oracle MySQL Heatwave connection...")
    print(f"Host: {MYSQL_HOST}")
    print(f"Port: {MYSQL_PORT}")
    print(f"Database: {MYSQL_DATABASE}")
    print(f"User: {MYSQL_USER}")
    
    try:
        conn = get_db_connection()
        
        if conn.is_connected():
            print("✅ Successfully connected to Oracle MySQL Heatwave!")
            
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
            return True
        else:
            print("❌ Failed to connect to database")
            return False
            
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
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
    print("Oracle MySQL Heatwave Connection Test")
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
