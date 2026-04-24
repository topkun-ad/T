document.addEventListener('DOMContentLoaded', () => {
    const noteInput = document.getElementById('note-input');
    const addBtn = document.getElementById('add-btn');
    const notesList = document.getElementById('notes-list');

    // Load notes from local storage
    let notes = JSON.parse(localStorage.getItem('memos')) || [];

    // Initialize rendering
    renderNotes();

    // Add Note Event
    addBtn.addEventListener('click', addNote);

    // Allow adding note with Cmd/Ctrl + Enter
    noteInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            addNote();
        }
    });

    function addNote() {
        const text = noteInput.value.trim();
        
        if (text === '') return;

        const newNote = {
            id: Date.now().toString(),
            text: text,
            date: new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        notes.unshift(newNote); // Add to the beginning
        saveNotes();
        
        // Add to DOM without full re-render for smooth animation
        const noteElement = createNoteElement(newNote);
        notesList.insertBefore(noteElement, notesList.firstChild);

        // Clear input
        noteInput.value = '';
        noteInput.focus();
    }

    function deleteNote(id, element) {
        // Add removing class for animation
        element.classList.add('removing');
        
        // Wait for animation to finish before removing from DOM and state
        setTimeout(() => {
            notes = notes.filter(note => note.id !== id);
            saveNotes();
            element.remove();
        }, 300); // Matches CSS animation duration
    }

    function saveNotes() {
        localStorage.setItem('memos', JSON.stringify(notes));
    }

    function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });
    }

    function createNoteElement(note) {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.id = `note-${note.id}`;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'note-date';
        dateSpan.textContent = note.date;

        const textDiv = document.createElement('div');
        textDiv.className = 'note-text';
        // Prevent XSS by using textContent
        textDiv.textContent = note.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        
        deleteBtn.addEventListener('click', () => deleteNote(note.id, div));

        div.appendChild(dateSpan);
        div.appendChild(textDiv);
        div.appendChild(deleteBtn);

        return div;
    }
});
