import os

OUTPUT_FILE = "iaintait.md"
WIKI_DIR = "."

def compress_wiki():
    # Remove the output file if it already exists to prevent self-processing
    if os.path.exists(OUTPUT_FILE):
        os.remove(OUTPUT_FILE)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        outfile.write("# Iain Tait - Complete Professional Archive\n\n")
        
        # Directories to process. Let's process index.md first, then the folders.
        outfile.write("## Table of Contents / Index\n\n")
        
        if os.path.exists("index.md"):
            with open("index.md", "r", encoding="utf-8") as f:
                outfile.write(f.read())
                outfile.write("\n\n---\n\n")

        # Define priority directories for a logical read order
        directories = [
            "agencies",
            "projects",
            "collaborators",
            "industry",
            "raw"
        ]

        for directory in directories:
            if not os.path.exists(directory):
                continue
            
            outfile.write(f"# Directory: {directory.title()}\n\n")
            
            for root, _, files in os.walk(directory):
                for file in sorted(files):
                    if file.endswith(".md"):
                        filepath = os.path.join(root, file)
                        
                        # Write the file header
                        outfile.write(f"## File: `{filepath}`\n\n")
                        
                        with open(filepath, "r", encoding="utf-8") as infile:
                            content = infile.read()
                            outfile.write(content)
                            
                        # Add separation between files
                        outfile.write("\n\n---\n\n")

        # Catch any loose root markdown files (excluding index.md and the output file itself)
        outfile.write("# Additional Core Files\n\n")
        for file in sorted(os.listdir(WIKI_DIR)):
            if file.endswith(".md") and file not in ["index.md", OUTPUT_FILE]:
                filepath = os.path.join(WIKI_DIR, file)
                outfile.write(f"## File: `{filepath}`\n\n")
                with open(filepath, "r", encoding="utf-8") as infile:
                    outfile.write(infile.read())
                outfile.write("\n\n---\n\n")

    print(f"✅ Wiki successfully compressed into '{OUTPUT_FILE}'")

if __name__ == "__main__":
    compress_wiki()
