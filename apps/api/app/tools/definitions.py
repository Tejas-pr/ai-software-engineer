# apps/api/app/tools/definitions.py

# This schema matches standard OpenAPI definitions used by both Gemini and Ollama.
READ_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "read_file",
        "description": "Reads the contents of a specific file inside the project workspace directory.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "The relative path to the file from the workspace root (e.g. 'package.json' or 'apps/api/app/main.py').",
                }
            },
            "required": ["file_path"],
        },
    },
}

ALL_TOOLS = [READ_FILE_SCHEMA]
