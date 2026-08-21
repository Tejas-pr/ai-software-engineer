# apps/api/app/tools/definitions.py

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
                    "description": "The relative path to the file from the workspace root.",
                }
            },
            "required": ["file_path"],
        },
    },
}

LIST_FILES_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_files",
        "description": "Lists the files inside a specific directory relative to the project workspace.",
        "parameters": {
            "type": "object",
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "The directory path to list files from (default is '.', the root directory).",
                }
            },
        },
    },
}

SEARCH_CODE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "search_code",
        "description": "Performs a global search inside the workspace code files to find occurrences of specific text query patterns.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The text pattern, function name, or class name to search for.",
                }
            },
            "required": ["query"],
        },
    },
}

RUN_COMMAND_SCHEMA = {
    "type": "function",
    "function": {
        "name": "run_command",
        "description": "Executes a shell command inside the project workspace directory and returns stdout and stderr.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The exact shell command to run (e.g. 'pytest' or 'npm run build').",
                }
            },
            "required": ["command"],
        },
    },
}

ALL_TOOLS = [
    READ_FILE_SCHEMA,
    LIST_FILES_SCHEMA,
    SEARCH_CODE_SCHEMA,
    RUN_COMMAND_SCHEMA,
]
