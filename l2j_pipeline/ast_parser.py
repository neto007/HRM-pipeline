"""
Enterprise AST Parser for L2J (Robust Version)
Uses tree-sitter manual traversal to avoid Query API versioning issues.
"""
import tree_sitter_java as tsjava
from tree_sitter import Language, Parser
import os
import json
import argparse
from typing import Dict, List, Any

class EnterpriseJavaParser:
    def __init__(self):
        self.JAVA_LANGUAGE = Language(tsjava.language())
        self.parser = Parser(self.JAVA_LANGUAGE)

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parses a Java file and returns structured metadata."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        with open(file_path, "rb") as f:
            source_code = f.read()

        tree = self.parser.parse(source_code)
        root_node = tree.root_node

        return {
            "file_path": file_path,
            "package": self._find_package(root_node),
            "imports": self._find_imports(root_node),
            "c_structure": self._extract_structure(root_node, source_code)
        }

    def _find_package(self, node) -> str:
        for child in node.children:
            if child.type == 'package_declaration':
                # child.children[1] is usually the identifier
                # package com.l2j; -> [package, com.l2j, ;]
                for grandchild in child.children:
                    if grandchild.type in ('scoped_identifier', 'identifier'):
                        return grandchild.text.decode('utf-8')
        return ""

    def _find_imports(self, node) -> List[str]:
        imports = []
        for child in node.children:
            if child.type == 'import_declaration':
                # import java.util.List;
                for grandchild in child.children:
                    if grandchild.type in ('scoped_identifier', 'identifier', 'dotted_identifier'):
                        imports.append(grandchild.text.decode('utf-8'))
        return imports

    def _extract_structure(self, node, source: bytes) -> List[Dict]:
        classes = []
        for child in node.children:
            if child.type == 'class_declaration':
                classes.append(self._parse_class(child, source))
            elif child.type == 'interface_declaration':
                classes.append(self._parse_interface(child, source))
        return classes

    def _parse_class(self, node, source: bytes) -> Dict:
        name = "Anonymous"
        extends = None
        implements = []
        
        # Extract Header Info
        for child in node.children:
            if child.type == 'identifier':
                name = child.text.decode('utf-8')
            elif child.type == 'superclass':
                # superclass -> type_identifier
                if len(child.children) > 1:
                     extends = child.children[1].text.decode('utf-8')
            elif child.type == 'super_interfaces':
                # implements A, B
                # interfaces -> type_list -> type_identifier...
                for grandchild in child.children:
                    if grandchild.type == 'type_list':
                         for iface in grandchild.children:
                            if iface.type == 'type_identifier':
                                implements.append(iface.text.decode('utf-8'))
        
        # Extract Body Info
        methods = []
        fields = []
        
        body = node.child_by_field_name('body')
        if body:
            for member in body.children:
                if member.type == 'method_declaration':
                    m_data = self._parse_method(member)
                    if m_data: methods.append(m_data)
                elif member.type == 'field_declaration':
                    f_data = self._parse_field(member)
                    if f_data: fields.extend(f_data)

        return {
            "type": "class",
            "name": name,
            "extends": extends,
            "implements": implements,
            "methods": methods,
            "fields": fields
        }

    def _parse_interface(self, node, source: bytes) -> Dict:
        name = "Anonymous"
        for child in node.children:
            if child.type == 'identifier':
                name = child.text.decode('utf-8')
        return {"type": "interface", "name": name}

    def _parse_method(self, node) -> Dict:
        name = "?"
        ret_type = "void"
        modifiers = []
        
        # Modifiers
        mods_node = node.child_by_field_name('modifiers')
        if mods_node:
            for m in mods_node.children:
                modifiers.append(m.text.decode('utf-8'))
        
        # Type
        type_node = node.child_by_field_name('type')
        if type_node:
            ret_type = type_node.text.decode('utf-8')
            
        # Name
        name_node = node.child_by_field_name('name')
        if name_node:
            name = name_node.text.decode('utf-8')
            
        return {
            "name": name,
            "return_type": ret_type,
            "modifiers": modifiers
        }

    def _parse_field(self, node) -> List[Dict]:
        # public int x, y;
        fields = []
        type_str = "var"
        modifiers = []
        
        mods_node = node.child_by_field_name('modifiers')
        if mods_node:
            for m in mods_node.children:
                modifiers.append(m.text.decode('utf-8'))
                
        type_node = node.child_by_field_name('type')
        if type_node:
            type_str = type_node.text.decode('utf-8')
            
        declarator_node = node.child_by_field_name('declarator')
        if declarator_node:
             # This handles simpler cases.
             # In full grammar, field_declaration children might be variable_declarator
             name_node = declarator_node.child_by_field_name('name')
             name = name_node.text.decode('utf-8') if name_node else "?"
             fields.append({
                 "name": name,
                 "type": type_str,
                 "modifiers": modifiers
             })
        else:
             # Iterate to find variable_declarator children directly in field_declaration
             for child in node.children:
                 if child.type == 'variable_declarator':
                     name_node = child.child_by_field_name('name')
                     name = name_node.text.decode('utf-8') if name_node else "?"
                     fields.append({
                        "name": name,
                        "type": type_str,
                        "modifiers": modifiers
                     })
                     
        return fields

def main():
    parser = argparse.ArgumentParser(description="Tree-sitter AST Extractor (Robust)")
    parser.add_argument("file", help="Java file to parse")
    args = parser.parse_args()

    try:
        ts = EnterpriseJavaParser()
        data = ts.parse_file(args.file)
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error parsing file: {e}")

if __name__ == "__main__":
    main()
