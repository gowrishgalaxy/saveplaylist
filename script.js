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
                        return { url: link, title: link, description: '', image: '', notes: '' };
                    }
                    // For older objects that might be missing 'notes', add it.
                    if (!link.hasOwnProperty('notes')) {
                        link.notes = '';
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
            if (playlist.name === RECYCLE_BIN_NAME) {
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

            // Add Serial Number
            const slNumber = document.createElement('span');
            slNumber.textContent = `${index + 1}.`;
            slNumber.classList.add('sl-number');
            li.appendChild(slNumber);

            // Since we are not fetching thumbnails, always add the 'no-thumbnail' class
            // for consistent styling that emphasizes the title.
            li.classList.add('no-thumbnail');

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

            const notesText = document.createElement('p');
            notesText.classList.add('notes-text');
            if (linkData.notes) {
                notesText.textContent = linkData.notes;
                notesText.title = 'Click to edit note';
            } else {
                notesText.textContent = 'Click to add a note...';
                notesText.classList.add('placeholder');
            }

            notesContainer.addEventListener('click', () => {
                // Prevent creating multiple textareas
                if (notesContainer.querySelector('textarea')) return;

                const notesTextarea = document.createElement('textarea');
                notesTextarea.value = linkData.notes || '';
                notesTextarea.placeholder = 'Type your notes here...';
                notesTextarea.classList.add('notes-textarea');

                notesTextarea.addEventListener('blur', () => {
                    linkData.notes = notesTextarea.value.trim();
                    saveAndRender(); // This will save and re-render the view
                });

                notesContainer.replaceChild(notesTextarea, notesText);
                notesTextarea.focus();
            });

            notesContainer.appendChild(notesText);
            contentDiv.appendChild(notesContainer);

            li.appendChild(contentDiv);

            // --- Action Buttons ---
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('link-actions');

            if (activePlaylist.name === RECYCLE_BIN_NAME) {
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
        if (playlistToDelete.name === RECYCLE_BIN_NAME) {
            alert('The Recycle Bin playlist cannot be deleted.');
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

    function addLink() {
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

        // Directly add the link without fetching any metadata.
        // The URL itself is used as the title.
        activePlaylist.links.push({
            url: linkUrl,
            title: linkUrl,
            description: '',
            image: '', // No image
            notes: ''
        });

        newLinkUrlInput.value = '';
        saveAndRender();
    }

    function deleteLink(index) {
        if (!activePlaylist) return;

        // If in recycle bin, it's a permanent delete
        if (activePlaylist.name === RECYCLE_BIN_NAME) {
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
        const recycleBinPlaylist = playlists.find(p => p.name === RECYCLE_BIN_NAME);
        if (!recycleBinPlaylist || !recycleBinPlaylist.links[indexInBin]) return;

        // Remove the link from the recycle bin
        const [linkToRestore] = recycleBinPlaylist.links.splice(indexInBin, 1);
        const originalName = linkToRestore.originalPlaylistName;

        // Clean up the object before restoring
        delete linkToRestore.originalPlaylistName;

        if (!originalName) {
            // Fallback: if for some reason there's no original playlist name,
            // move it to the first available playlist that is not the bin.
            const firstPlaylist = playlists.find(p => p.name !== RECYCLE_BIN_NAME);
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