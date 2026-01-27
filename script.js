document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const newPlaylistNameInput = document.getElementById('new-playlist-name');
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const playlistList = document.getElementById('playlist-list');

    const playlistDetailsView = document.getElementById('playlist-details');
    const currentPlaylistTitle = document.getElementById('current-playlist-title');
    const newLinkUrlInput = document.getElementById('new-link-url');
    const addLinkBtn = document.getElementById('add-link-btn');
    const linkList = document.getElementById('link-list');

    // --- App State ---
    let playlists = [];
    let activePlaylist = null;
    const RECYCLE_BIN_NAME = 'Recycle Bin';
    const DELETED_NOTES_PLAYLIST_NAME = 'Deleted Notes';

    // --- Data Persistence ---
    function savePlaylists() {
        localStorage.setItem('linkPlaylists', JSON.stringify(playlists));
    }

    function loadPlaylists() {
        const storedPlaylists = localStorage.getItem('linkPlaylists');
        if (storedPlaylists) {
            const loaded = JSON.parse(storedPlaylists);
            // Data migration for old string-based links to new object format
            playlists = loaded.map(playlist => {
                playlist.links = playlist.links.map(link => {
                    if (typeof link === 'string') {
                        return { url: link, title: link, description: '', image: '', notes: [] };
                    }
                    // Migration: Convert 'notes' to array of objects
                    if (!link.hasOwnProperty('notes')) {
                        link.notes = [];
                    } else if (typeof link.notes === 'string') {
                        // Convert existing string note to array if it's not empty
                        link.notes = link.notes ? [{ text: link.notes }] : [];
                    } else if (!Array.isArray(link.notes)) {
                        link.notes = [];
                    }
                    return link;
                });
                return playlist;
            });
        }
    }

    function ensureRecycleBinExists() {
        if (!playlists.some(p => p.name === RECYCLE_BIN_NAME)) {
            playlists.push({ name: RECYCLE_BIN_NAME, links: [] });
        }
        if (!playlists.some(p => p.name === DELETED_NOTES_PLAYLIST_NAME)) {
            playlists.push({ name: DELETED_NOTES_PLAYLIST_NAME, links: [] });
        }
    }

    // --- Rendering ---
    function renderPlaylists() {
        playlistList.innerHTML = '';
        if (playlists.length === 0) {
            playlistList.innerHTML = '<li>No playlists yet. Create one!</li>';
            return;
        }
        playlists.forEach((playlist, index) => {
            const li = document.createElement('li');

            // Add Serial Number
            const slNumber = document.createElement('span');
            slNumber.textContent = `${index + 1}.`;
            slNumber.classList.add('sl-number');
            li.appendChild(slNumber);

            // Add editable name span
            const nameSpan = document.createElement('span');
            nameSpan.textContent = playlist.name;
            nameSpan.classList.add('playlist-name-span');
            nameSpan.title = 'Click to edit playlist name';

            nameSpan.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click from firing
                const inputEl = document.createElement('input');
                inputEl.type = 'text';
                inputEl.value = playlist.name;
                inputEl.classList.add('edit-playlist-input');

                const savePlaylistName = () => {
                    const newName = inputEl.value.trim();
                    const oldName = playlist.name;
                    if (newName && newName !== oldName) {
                        if (playlists.some(p => p.name === newName)) {
                            alert('A playlist with that name already exists.');
                            renderPlaylists(); // Re-render to discard changes
                        } else {
                            playlist.name = newName;
                            if (activePlaylist && activePlaylist.name === oldName) {
                                activePlaylist.name = newName;
                            }
                            saveAndRender();
                        }
                    } else {
                        renderPlaylists(); // Discard changes
                    }
                };

                inputEl.addEventListener('blur', savePlaylistName);
                inputEl.addEventListener('keypress', e => { if (e.key === 'Enter') inputEl.blur(); });
                li.replaceChild(inputEl, nameSpan);
                inputEl.select();
            });

            li.appendChild(nameSpan);
            li.dataset.index = index;

            if (activePlaylist && activePlaylist.name === playlist.name) {
                li.classList.add('active');
            }

            // The Recycle Bin playlist cannot be deleted or dragged
            if (playlist.name === RECYCLE_BIN_NAME || playlist.name === DELETED_NOTES_PLAYLIST_NAME) {
                li.classList.add('recycle-bin-playlist');
            } else {
                li.draggable = true;
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent li click event from firing
                    deletePlaylist(index);
                });
                li.appendChild(deleteBtn);
            }

            li.addEventListener('click', () => selectPlaylist(index));
            playlistList.appendChild(li);
        });
    }

    function renderPlaylistDetails() {
        if (!activePlaylist) {
            playlistDetailsView.classList.add('hidden');
            return;
        }
        playlistDetailsView.classList.remove('hidden');
        currentPlaylistTitle.textContent = activePlaylist.name;
        linkList.innerHTML = '';

        if (activePlaylist.links.length === 0) {
            linkList.innerHTML = '<li>No links in this playlist yet.</li>';
            return;
        }

        activePlaylist.links.forEach((linkData, index) => {
            const li = document.createElement('li');
            li.classList.add('link-card');
            li.draggable = true;
            li.dataset.index = index;

            // Add Priority Dropdown
            const prioritySelect = document.createElement('select');
            prioritySelect.classList.add('priority-select');
            prioritySelect.title = 'Change priority';

            // Populate options
            activePlaylist.links.forEach((_, i) => {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i + 1;
                if (i === index) option.selected = true;
                prioritySelect.appendChild(option);
            });

            // Handle change
            prioritySelect.addEventListener('change', (e) => {
                const newIndex = parseInt(e.target.value, 10);
                if (newIndex !== index) {
                    const [movedItem] = activePlaylist.links.splice(index, 1);
                    activePlaylist.links.splice(newIndex, 0, movedItem);
                    saveAndRender();
                }
            });

            // Prevent drag start when clicking the dropdown
            prioritySelect.addEventListener('click', (e) => e.stopPropagation());

            li.appendChild(prioritySelect);

            // Render Image if available
            if (linkData.image) {
                const img = document.createElement('img');
                img.src = linkData.image;
                img.alt = 'Link Thumbnail';
                img.classList.add('link-thumbnail');
                // Fallback for broken images
                img.onerror = () => {
                    img.style.display = 'none';
                    li.classList.add('no-thumbnail');
                };
                li.appendChild(img);
            } else {
                li.classList.add('no-thumbnail');
            }

            // Create a container for the text content
            const contentDiv = document.createElement('div');
            contentDiv.classList.add('link-content');

            // Create title element
            const titleEl = document.createElement('h4');
            titleEl.classList.add('editable-title');
            titleEl.title = 'Click to edit title';
            titleEl.textContent = linkData.title;

            titleEl.addEventListener('click', () => {
                const inputEl = document.createElement('input');
                inputEl.type = 'text';
                inputEl.value = linkData.title;
                inputEl.classList.add('edit-title-input');

                const saveChanges = () => {
                    const newTitle = inputEl.value.trim();
                    if (newTitle && newTitle !== linkData.title) {
                        linkData.title = newTitle;
                        saveAndRender(); // This re-renders the entire view with the new title
                    } else {
                        // If title is empty or unchanged, just re-render to restore the h4
                        renderPlaylistDetails();
                    }
                };

                inputEl.addEventListener('blur', saveChanges);
                inputEl.addEventListener('keypress', e => {
                    if (e.key === 'Enter') inputEl.blur(); // Trigger save on Enter
                });

                contentDiv.replaceChild(inputEl, titleEl);
                inputEl.select(); // Select text for easy editing
            });
            contentDiv.appendChild(titleEl);

            // Create link element
            const a = document.createElement('a');
            a.href = linkData.url;
            a.textContent = linkData.url;
            a.target = '_blank'; // Open in new tab
            a.rel = 'noopener noreferrer';
            contentDiv.appendChild(a);

            // --- Add Notes Section ---
            const notesContainer = document.createElement('div');
            notesContainer.classList.add('notes-section');

            const notesHeader = document.createElement('h5');
            notesHeader.textContent = 'Notes';
            notesHeader.style.marginBottom = '0.5rem';
            notesHeader.style.color = '#128C7E';
            notesContainer.appendChild(notesHeader);

            const notesList = document.createElement('ul');
            notesList.classList.add('notes-list');

            // Ensure notes is an array
            if (!Array.isArray(linkData.notes)) linkData.notes = [];

            linkData.notes.forEach((noteObj, noteIndex) => {
                const noteLi = document.createElement('li');
                noteLi.classList.add('note-item');

                // Priority Dropdown for Note
                const notePrioritySelect = document.createElement('select');
                notePrioritySelect.classList.add('note-priority-select');
                notePrioritySelect.title = 'Change note order';
                
                linkData.notes.forEach((_, i) => {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = i + 1;
                    if (i === noteIndex) option.selected = true;
                    notePrioritySelect.appendChild(option);
                });

                notePrioritySelect.addEventListener('change', (e) => {
                    const newIndex = parseInt(e.target.value, 10);
                    if (newIndex !== noteIndex) {
                        const [movedNote] = linkData.notes.splice(noteIndex, 1);
                        linkData.notes.splice(newIndex, 0, movedNote);
                        saveAndRender();
                    }
                });
                notePrioritySelect.addEventListener('click', e => e.stopPropagation());
                noteLi.appendChild(notePrioritySelect);

                // Note Text
                const noteContent = document.createElement('span');
                noteContent.classList.add('note-content');
                
                // Detect URLs and create clickable links
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const textParts = noteObj.text.split(urlRegex);

                textParts.forEach(part => {
                    if (part.match(urlRegex)) {
                        const link = document.createElement('a');
                        link.href = part;
                        link.textContent = part;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.addEventListener('click', e => e.stopPropagation()); // Prevent entering edit mode when clicking link
                        noteContent.appendChild(link);
                    } else {
                        noteContent.appendChild(document.createTextNode(part));
                    }
                });

                    noteContent.title = 'Click to edit note';
                    noteContent.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const inputEl = document.createElement('textarea');
                        inputEl.value = noteObj.text;
                        inputEl.classList.add('edit-note-input');
                        
                        const saveNote = () => {
                            const newText = inputEl.value.trim();
                            noteObj.text = newText;
                            saveAndRender();
                        };

                        inputEl.addEventListener('blur', saveNote);
                        inputEl.addEventListener('click', e => e.stopPropagation());
                        
                        noteLi.replaceChild(inputEl, noteContent);
                        inputEl.focus();
                    });
                noteLi.appendChild(noteContent);

                // Delete Note Button (Moves to Deleted Notes Playlist)
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '×';
                deleteBtn.classList.add('delete-note-btn');
                deleteBtn.title = 'Move to Deleted Notes';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Move this note to Deleted Notes playlist?')) {
                        linkData.notes.splice(noteIndex, 1);
                        
                        let deletedNotesPlaylist = playlists.find(p => p.name === DELETED_NOTES_PLAYLIST_NAME);
                        if (!deletedNotesPlaylist) {
                            deletedNotesPlaylist = { name: DELETED_NOTES_PLAYLIST_NAME, links: [] };
                            playlists.push(deletedNotesPlaylist);
                        }
                        
                        deletedNotesPlaylist.links.push({
                            url: linkData.url,
                            title: noteObj.text,
                            description: `Note from: ${linkData.title}`,
                            image: linkData.image,
                            notes: [],
                            originalPlaylistName: activePlaylist.name,
                            originalLinkUrl: linkData.url,
                            isDeletedNote: true
                        });
                        saveAndRender();
                    }
                });
                noteLi.appendChild(deleteBtn);

                notesList.appendChild(noteLi);
            });
            notesContainer.appendChild(notesList);

            // Add Note Button
            const addNoteBtn = document.createElement('button');
            addNoteBtn.textContent = '+ Add Note';
            addNoteBtn.classList.add('add-note-btn');
            addNoteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                linkData.notes.push({ text: '' });
                saveAndRender();
            });
            notesContainer.appendChild(addNoteBtn);

            contentDiv.appendChild(notesContainer);

            li.appendChild(contentDiv);

            // --- Action Buttons ---
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('link-actions');

            // --- Move to Playlist Dropdown ---
            // Only show if it's not a system playlist
            if (activePlaylist.name !== RECYCLE_BIN_NAME && activePlaylist.name !== DELETED_NOTES_PLAYLIST_NAME) {
                const moveSelect = document.createElement('select');
                moveSelect.classList.add('move-playlist-select');
                moveSelect.title = 'Move to another playlist';

                playlists.forEach((p, pIndex) => {
                    // Don't show system playlists in this move list
                    if (p.name === RECYCLE_BIN_NAME || p.name === DELETED_NOTES_PLAYLIST_NAME) return;

                    const option = document.createElement('option');
                    option.value = pIndex;
                    option.textContent = p.name;
                    if (p.name === activePlaylist.name) {
                        option.selected = true;
                    }
                    moveSelect.appendChild(option);
                });

                moveSelect.addEventListener('change', (e) => {
                    const targetPlaylistIndex = parseInt(e.target.value, 10);
                    const targetPlaylist = playlists[targetPlaylistIndex];

                    if (targetPlaylist && targetPlaylist.name !== activePlaylist.name) {
                        if (confirm(`Move "${linkData.title}" to "${targetPlaylist.name}"?`)) {
                            // Remove from current
                            const [movedLink] = activePlaylist.links.splice(index, 1);
                            // Add to target
                            targetPlaylist.links.push(movedLink);
                            saveAndRender();
                        } else {
                            // Revert selection if cancelled
                            moveSelect.value = playlists.indexOf(activePlaylist);
                        }
                    }
                });

                // Prevent drag propagation
                moveSelect.addEventListener('click', (e) => e.stopPropagation());
                buttonContainer.appendChild(moveSelect);
            }

            if (activePlaylist.name === RECYCLE_BIN_NAME || activePlaylist.name === DELETED_NOTES_PLAYLIST_NAME) {
                li.classList.add('deleted-item'); // For special styling

                // Display original playlist info
                if (linkData.originalPlaylistName) {
                    const originalLocation = document.createElement('p');
                    originalLocation.classList.add('original-location');
                    originalLocation.textContent = `(From: ${linkData.originalPlaylistName})`;
                    contentDiv.appendChild(originalLocation);
                }

                // Create Restore button
                const restoreBtn = document.createElement('button');
                restoreBtn.textContent = 'Restore';
                restoreBtn.classList.add('restore-btn');
                restoreBtn.addEventListener('click', (e) => { e.stopPropagation(); restoreLink(index); });
                buttonContainer.appendChild(restoreBtn);

                // Create permanent delete button
                const permDeleteBtn = document.createElement('button');
                permDeleteBtn.textContent = 'Delete Forever';
                permDeleteBtn.classList.add('perm-delete-btn');
                permDeleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteLink(index); });
                buttonContainer.appendChild(permDeleteBtn);

            } else {
                // Create regular delete button for normal playlists
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteLink(index); });
                buttonContainer.appendChild(deleteBtn);
            }

            li.appendChild(buttonContainer);
            linkList.appendChild(li);
        });
    }

    // --- Core Logic ---
    function createPlaylist() {
        const playlistName = newPlaylistNameInput.value.trim();
        if (playlistName === RECYCLE_BIN_NAME) {
            alert(`"${RECYCLE_BIN_NAME}" is a reserved name. Please choose another.`);
            return;
        }
        if (playlistName && !playlists.some(p => p.name === playlistName)) {
            const newPlaylist = { name: playlistName, links: [] };
            playlists.push(newPlaylist);
            newPlaylistNameInput.value = '';
            selectPlaylist(playlists.length - 1); // Auto-select the new playlist
        } else if (!playlistName) {
            alert('Please enter a playlist name.');
        } else {
            alert('A playlist with that name already exists.');
        }
    }

    function deletePlaylist(index) {
        const playlistToDelete = playlists[index];
        if (playlistToDelete.name === RECYCLE_BIN_NAME || playlistToDelete.name === DELETED_NOTES_PLAYLIST_NAME) {
            alert('This system playlist cannot be deleted.');
            return;
        }
        if (!confirm(`Are you sure you want to delete the playlist "${playlistToDelete.name}"? Its links will be moved to the Recycle Bin.`)) {
            return;
        }

        // Find the recycle bin and move the links
        const recycleBinPlaylist = playlists.find(p => p.name === RECYCLE_BIN_NAME);
        if (recycleBinPlaylist && playlistToDelete.links.length > 0) {
            const linksToMove = playlistToDelete.links;
            linksToMove.forEach(linkToMove => {
                // Add original playlist info before moving
                linkToMove.originalPlaylistName = playlistToDelete.name;
                // Prevent duplicates in the recycle bin
                if (!recycleBinPlaylist.links.some(existingLink => existingLink.url === linkToMove.url)) {
                    recycleBinPlaylist.links.push(linkToMove);
                }
            });
        }

        // Remove the original playlist
        playlists.splice(index, 1);

        if (activePlaylist && activePlaylist.name === playlistToDelete.name) {
            activePlaylist = null;
        }
        saveAndRender();
    }

    function selectPlaylist(index) {
        activePlaylist = playlists[index];
        saveAndRender();
    }

    async function addLink() {
        const linkUrl = newLinkUrlInput.value.trim();
        if (!linkUrl || !activePlaylist) return;

        try {
            new URL(linkUrl); // Basic URL validation
        } catch (_) {
            alert('Please enter a valid URL (e.g., https://www.example.com)');
            return;
        }

        // Check for duplicates
        if (activePlaylist.links.some(link => link.url === linkUrl)) {
            alert('This link already exists in the current playlist.');
            return;
        }

        // Validate URL protocol
        let validUrl = linkUrl;
        if (!validUrl.match(/^https?:\/\//i)) {
            validUrl = 'http://' + validUrl;
        }

        // Visual feedback that we are processing
        addLinkBtn.textContent = 'Adding...';
        addLinkBtn.disabled = true;

        let title = linkUrl;
        let image = '';
        let description = '';

        try {
            const response = await fetch(`/api/metadata?url=${encodeURIComponent(validUrl)}`);
            if (response.ok) {
                const data = await response.json();
                title = data.title || linkUrl;
                image = data.image || '';
                description = data.description || '';
            }
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
            // Fallback to defaults (set above)
        } finally {
            // Reset button state
            addLinkBtn.textContent = 'Add Link';
            addLinkBtn.disabled = false;
        }

        activePlaylist.links.push({
            url: validUrl,
            title: title,
            description: description,
            image: image,
            notes: []
        });

        newLinkUrlInput.value = '';
        saveAndRender();
    }

    function deleteLink(index) {
        if (!activePlaylist) return;

        // If in recycle bin or deleted notes, it's a permanent delete
        if (activePlaylist.name === RECYCLE_BIN_NAME || activePlaylist.name === DELETED_NOTES_PLAYLIST_NAME) {
            if (!confirm(`This will permanently delete the link. This action cannot be undone.\n\n"${activePlaylist.links[index].title}"`)) {
                return;
            }
            activePlaylist.links.splice(index, 1);
        } else {
            if (!confirm(`Are you sure you want to move this link to the Recycle Bin?\n\n"${activePlaylist.links[index].title}"`)) {
                return;
            }
            // Otherwise, move it to the recycle bin
            const recycleBinPlaylist = playlists.find(p => p.name === RECYCLE_BIN_NAME);
            const [deletedLink] = activePlaylist.links.splice(index, 1);

            // Add original playlist info
            deletedLink.originalPlaylistName = activePlaylist.name;

            // To prevent duplicates in the recycle bin
            if (recycleBinPlaylist && !recycleBinPlaylist.links.some(link => link.url === deletedLink.url)) {
                recycleBinPlaylist.links.push(deletedLink);
            }
        }
        saveAndRender();
    }

    function restoreLink(indexInBin) {
        if (!activePlaylist || !activePlaylist.links[indexInBin]) return;

        // Remove the link from the current bin (Recycle Bin or Deleted Notes)
        const [linkToRestore] = activePlaylist.links.splice(indexInBin, 1);
        
        // Handle Note Restoration
        if (linkToRestore.isDeletedNote) {
            const targetPlaylist = playlists.find(p => p.name === linkToRestore.originalPlaylistName);
            if (targetPlaylist) {
                const targetLink = targetPlaylist.links.find(l => l.url === linkToRestore.originalLinkUrl);
                if (targetLink) {
                    targetLink.notes.push({ text: linkToRestore.title });
                    saveAndRender();
                    return;
                }
            }
            // If parent not found, fall through to restore as a regular link
            delete linkToRestore.isDeletedNote;
        }

        const originalName = linkToRestore.originalPlaylistName;

        // Clean up the object before restoring
        delete linkToRestore.originalPlaylistName;

        if (!originalName) {
            // Fallback: if for some reason there's no original playlist name,
            // move it to the first available playlist that is not the bin.
            const firstPlaylist = playlists.find(p => p.name !== RECYCLE_BIN_NAME && p.name !== DELETED_NOTES_PLAYLIST_NAME);
            if (firstPlaylist) {
                firstPlaylist.links.push(linkToRestore);
            } else {
                // If no other playlist exists, create one with a default name
                const newPlaylist = { name: "Restored Links", links: [linkToRestore] };
                playlists.push(newPlaylist);
            }
            alert('Link restored to the first available playlist as its original playlist was not found.');
            saveAndRender();
            return;
        }

        let targetPlaylist = playlists.find(p => p.name === originalName);

        // If the original playlist was deleted, re-create it.
        if (!targetPlaylist) {
            targetPlaylist = { name: originalName, links: [] };
            playlists.push(targetPlaylist);
        }

        // Add the link to the target playlist, preventing duplicates
        if (!targetPlaylist.links.some(link => link.url === linkToRestore.url)) {
            targetPlaylist.links.push(linkToRestore);
        } else {
            alert(`Link "${linkToRestore.title}" already exists in "${targetPlaylist.name}" and was not restored.`);
        }

        saveAndRender();
    }

    function saveAndRender() {
        savePlaylists();
        renderPlaylists();
        renderPlaylistDetails();
    }

    // --- Event Listeners & Initial Load ---
    createPlaylistBtn.addEventListener('click', createPlaylist);
    addLinkBtn.addEventListener('click', addLink);
    newPlaylistNameInput.addEventListener('keypress', (e) => e.key === 'Enter' && createPlaylist());
    newLinkUrlInput.addEventListener('keypress', (e) => e.key === 'Enter' && addLink());

    loadPlaylists();
    ensureRecycleBinExists();
    saveAndRender();

    // --- Drag and Drop Logic ---

    // Helper function to determine the drop position relative to other elements
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- Drag and Drop for Playlists ---
    let draggedPlaylistIndex = null;

    playlistList.addEventListener('dragstart', e => {
        if (e.target.matches('#playlist-list li')) {
            draggedPlaylistIndex = parseInt(e.target.dataset.index, 10);
            // Use a timeout to allow the browser to create the drag image before adding the class
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    playlistList.addEventListener('dragend', e => {
        if (e.target.matches('#playlist-list li')) {
            e.target.classList.remove('dragging');
        }
    });

    playlistList.addEventListener('dragover', e => {
        e.preventDefault(); // This is necessary to allow a drop
        const afterElement = getDragAfterElement(playlistList, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) {
                playlistList.appendChild(dragging);
            } else {
                playlistList.insertBefore(dragging, afterElement);
            }
        }
    });

    playlistList.addEventListener('drop', e => {
        e.preventDefault();
        const draggingElement = playlistList.querySelector('.dragging');
        if (!draggingElement) return;

        const newIndex = Array.from(playlistList.children).indexOf(draggingElement);
        if (draggedPlaylistIndex !== null && newIndex !== -1 && draggedPlaylistIndex !== newIndex) {
            // Reorder the underlying data array
            const [movedItem] = playlists.splice(draggedPlaylistIndex, 1);
            playlists.splice(newIndex, 0, movedItem);
            saveAndRender(); // Save the new order and re-render everything
        }
        draggedPlaylistIndex = null;
    });

    // --- Drag and Drop for Links ---
    let draggedLinkIndex = null;

    linkList.addEventListener('dragstart', e => {
        if (e.target.matches('.link-card')) {
            draggedLinkIndex = parseInt(e.target.dataset.index, 10);
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    linkList.addEventListener('dragend', e => {
        if (e.target.matches('.link-card')) {
            e.target.classList.remove('dragging');
        }
    });

    linkList.addEventListener('dragover', e => {
        e.preventDefault(); // This is necessary to allow a drop
        const afterElement = getDragAfterElement(linkList, e.clientY);
        const dragging = linkList.querySelector('.dragging');
        if (dragging) {
            if (afterElement == null) {
                linkList.appendChild(dragging);
            } else {
                linkList.insertBefore(dragging, afterElement);
            }
        }
    });

    linkList.addEventListener('drop', e => {
        e.preventDefault();
        if (!activePlaylist || draggedLinkIndex === null) return;

        const draggingElement = linkList.querySelector('.dragging');
        if (!draggingElement) return;

        // Determine the new index based on the element's final position in the DOM
        const newIndex = Array.from(linkList.children).indexOf(draggingElement);
        if (newIndex !== -1 && draggedLinkIndex !== newIndex) {
            const [movedItem] = activePlaylist.links.splice(draggedLinkIndex, 1);
            activePlaylist.links.splice(newIndex, 0, movedItem);
            saveAndRender();
        }
        draggedLinkIndex = null;
    });
});