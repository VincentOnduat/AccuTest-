import os
import sys

# Define folders to ignore
IGNORE_FOLDERS = {'node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', 
                  'venv', 'env', '.venv', 'logs', 'tmp', 'temp', '.cache'}

def print_structure(startpath, prefix=''):
    if not os.path.exists(startpath):
        print(f"❌ Path not found: {startpath}")
        return
    
    items = sorted([item for item in os.listdir(startpath) 
                   if item not in IGNORE_FOLDERS])
    
    for index, item in enumerate(items):
        full_path = os.path.join(startpath, item)
        is_last = index == len(items) - 1
        is_dir = os.path.isdir(full_path)
        
        connector = '└── ' if is_last else '├── '
        print(prefix + connector + item)
        
        if is_dir:
            new_prefix = prefix + ('    ' if is_last else '│   ')
            print_structure(full_path, new_prefix)

if __name__ == "__main__":
    root_path = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    print(f"\n📁 System Structure: {root_path}\n")
    print('.\n└── root/')
    print_structure(root_path, '    ')
    