def NoteEntity(item) -> dict:
    return {
        "id": str(item["_id"]),
        "title": item["title"],
        "description": item["description"],
        "important": item["important"]
    }

def NotesEntity(items)-> list:
    return [NoteEntity(item) for item in items]