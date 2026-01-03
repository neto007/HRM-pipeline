import tree_sitter
from tree_sitter import Language, Parser, Query
import tree_sitter_java as tsjava


try:
    JAVA_LANGUAGE = Language(tsjava.language())
    q = Query(JAVA_LANGUAGE, "(package_declaration) @pkg")
    print(f"Query Object dir: {dir(q)}")
except Exception as e:
    print(f"Error: {e}")
