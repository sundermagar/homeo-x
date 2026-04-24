import re
import json
import os

BLACKLIST = {
    "unnamed", "no", "yes", "other", "n/a", "nil", "-", ".", "0", "1", 
    "none", "undefined", "null", "test", "demo"
}

def parse_tuples_fsm(text):
    """
    Robust Finite State Machine parser for SQL INSERT tuples.
    Handles escaped quotes, multi-line strings, and nested characters.
    """
    rows = []
    current_row = []
    current_val = []
    in_string = False
    in_row = False
    
    i = 0
    length = len(text)
    while i < length:
        char = text[i]
        
        if in_string:
            # Handle MySQL/Postgres escaping: \' or ''
            if char == '\\' and i + 1 < length and text[i+1] == "'":
                current_val.append("'")
                i += 1
            elif char == "'" and i + 1 < length and text[i+1] == "'":
                current_val.append("'")
                i += 1
            elif char == "'":
                in_string = False
            else:
                current_val.append(char)
        else:
            if char == '(':
                if not in_row:
                    in_row = True
                else:
                    current_val.append(char)
            elif char == ')':
                if in_row:
                    val = "".join(current_val).strip()
                    current_row.append(None if val == "NULL" else val)
                    rows.append(current_row)
                    current_row = []
                    current_val = []
                    in_row = False
            elif char == ',':
                if in_row:
                    val = "".join(current_val).strip()
                    current_row.append(None if val == "NULL" else val)
                    current_val = []
            elif char == "'":
                in_string = True
            elif char in ' \n\r\t':
                pass
            else:
                current_val.append(char)
        i += 1
    return rows

def is_trash_label(label):
    if not label: return True
    clean = label.strip().lower()
    if clean in BLACKLIST: return True
    if clean.isdigit(): return True
    if len(clean) < 2 and not clean.isalnum(): return True
    return False

def parse_sql_file(file_path):
    print(f"Parsing {file_path} (Using Robust FSM)...")
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    return parse_tuples_fsm(content)

def extract_and_smart_link():
    tree_raw = parse_sql_file("rubrics_raw.sql")
    alts_raw = parse_sql_file("remedies_raw.sql")
    
    # Pass 1: Build a complete map of ALL nodes (incl. trash)
    all_nodes_map = {}
    kept_ids = set()
    
    print(f"Found {len(tree_raw)} total rubric rows.")
    print("Pass 1: Indexing all nodes...")
    for row in tree_raw:
        if not row or not str(row[0]).isdigit(): continue
        nid = int(row[0])
        label = row[1] or ""
        pid = 0
        if len(row) > 2 and row[2] and str(row[2]).isdigit():
            pid = int(row[2])
        
        all_nodes_map[nid] = {
            "id": nid,
            "label": label,
            "parentId": pid,
            "description": row[4] if len(row) > 4 else None
        }
        
        if not is_trash_label(label):
            kept_ids.add(nid)

    # Pass 2: Smart Re-parenting for Kept nodes
    print(f"Kept {len(kept_ids)} clinical nodes. Pass 2: Smart re-parenting...")
    final_tree = []
    for nid in kept_ids:
        node = all_nodes_map[nid]
        curr_pid = node["parentId"]
        
        # Climb Up: If parent is not in Kept set, move to grandparent
        depth = 0
        while curr_pid != 0 and curr_pid not in kept_ids and depth < 20:
            parent_node = all_nodes_map.get(curr_pid)
            if not parent_node or parent_node["id"] == parent_node["parentId"]:
                curr_pid = 0 
                break
            curr_pid = parent_node["parentId"]
            depth += 1
            
        final_tree.append({
            "id": nid,
            "label": node["label"][:255],
            "parent_id": curr_pid,
            "description": node.get("description")
        })

    # Remedies handling
    final_alts = []
    print(f"Processing {len(alts_raw)} remedy mapping rows...")
    for row in alts_raw:
        if not row or len(row) < 3 or not str(row[0]).isdigit(): continue
        
        aid = int(row[0])
        tid = int(row[1]) if str(row[1]).isdigit() else 0
        remedy = row[2] or "Unknown"
        
        if is_trash_label(remedy): continue
        
        # Smart re-parent for alternatives
        curr_tid = tid
        depth = 0
        while curr_tid != 0 and curr_tid not in kept_ids and depth < 20:
            pnode = all_nodes_map.get(curr_tid)
            if not pnode or pnode["id"] == pnode["parentId"]:
                curr_tid = 0
                break
            curr_tid = pnode["parentId"]
            depth += 1
            
        final_alts.append({
            "id": aid,
            "tree_id": curr_tid,
            "remedy": remedy[:255],
            "symptoms": row[3] if len(row) > 3 else None,
            "better": row[4] if len(row) > 4 else None,
            "worse": row[5] if len(row) > 5 else None
        })

    return {"tree": final_tree, "alternatives": final_alts}

if __name__ == "__main__":
    if not os.path.exists("rubrics_raw.sql") or not os.path.exists("remedies_raw.sql"):
        print("Error: Run sed extraction first.")
        exit(1)
        
    data = extract_and_smart_link()
    print(f"Restoration Complete!")
    print(f" - TOTAL Rubrics Recovered: {len(data['tree'])}")
    print(f" - TOTAL Remedies Recovered: {len(data['alternatives'])}")
    
    # Check for requested ID 2291 (Agony)
    found_agony = any(n['id'] == 2291 for n in data['tree'])
    print(f" - Agony (2291) Presence: {'YES' if found_agony else 'NO'}")
    
    output_path = "packages/database/src/seeds/comprehensive_remedy_data.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"Success! Comprehensive data saved to {output_path}")
