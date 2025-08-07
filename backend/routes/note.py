from fastapi import FastAPI, APIRouter, HTTPException
from fastapi import status
from models.note import Note
from config.db import conn
from schemas.note import NoteEntity, NotesEntity
from bson import ObjectId

note = APIRouter()

db = conn['test']  # Use your actual database name if different
notes_collection = db['notes']

@note.get('/notes')
def get_notes():
    notes = notes_collection.find()
    return NotesEntity(notes)

@note.get('/notes/{id}')
def get_note(id: str):
    note_item = notes_collection.find_one({'_id': ObjectId(id)})
    if note_item:
        return NoteEntity(note_item)
    raise HTTPException(status_code=404, detail='Note not found')

@note.post('/notes', status_code=status.HTTP_201_CREATED)
def create_note(note_data: Note):
    result = notes_collection.insert_one(dict(note_data))
    new_note = notes_collection.find_one({'_id': result.inserted_id})
    return NoteEntity(new_note)

@note.put('/notes/{id}')
def update_note(id: str, note_data: Note):
    updated = notes_collection.update_one(
        {'_id': ObjectId(id)},
        {'$set': dict(note_data)}
    )
    if updated.modified_count == 1:
        note_item = notes_collection.find_one({'_id': ObjectId(id)})
        return NoteEntity(note_item)
    raise HTTPException(status_code=404, detail='Note not found or not updated')

@note.delete('/notes/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_note(id: str):
    result = notes_collection.delete_one({'_id': ObjectId(id)})
    if result.deleted_count == 1:
        return
    raise HTTPException(status_code=404, detail='Note not found')