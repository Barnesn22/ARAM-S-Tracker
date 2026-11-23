# export_to_parquet.py
"""Export relational DB tables to Parquet files.

Requirements:
- config.yaml containing DB connection string.
- pandas, pyarrow installed.
"""
import yaml
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import os

def load_config():
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

def export_table(table_name, conn_str, output_dir='data/parquet'):
    # Placeholder: replace with actual DB connection logic (e.g., sqlalchemy)
    # For demonstration, generate dummy DataFrame
    df = pd.DataFrame({
        'id': [1, 2, 3],
        f'{table_name}_value': ['a', 'b', 'c']
    })
    table = pa.Table.from_pandas(df)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, f"{table_name}.parquet")
    pq.write_table(table, out_path, compression='snappy')
    print(f'Exported {table_name} to {out_path}')

def main():
    cfg = load_config()
    conn = cfg.get('connection_string')
    tables = cfg.get('tables', [])
    for tbl in tables:
        export_table(tbl, conn)

if __name__ == '__main__':
    main()
