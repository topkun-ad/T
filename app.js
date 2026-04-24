document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const memoForm = document.getElementById('memo-form');
    const textInput = document.getElementById('memo-text');
    const saveBtn = document.getElementById('save-btn');
    const memosList = document.getElementById('memos-list');
    const spinner = document.getElementById('loading-spinner');

    let currentMemos = [];

    // Initialize
    fetchMemos();

    // Event Listeners
    memoForm.addEventListener('submit', handleSaveMemo);

    // API Functions
    async function fetchMemos() {
        showLoading(true);
        try {
            const response = await fetch('/api/memos');
            if (!response.ok) throw new Error('Failed to fetch memos');
            currentMemos = await response.json();
            
            // Sort by date descending (newest first)
            currentMemos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            
            renderMemos();
        } catch (error) {
            console.error(error);
            alert('Failed to load memos. Please check your connection.');
        } finally {
            showLoading(false);
        }
    }

    async function handleSaveMemo(e) {
        e.preventDefault();
        
        const text = textInput.value.trim();
        if (!text) return;

        const memoData = {
            id: Date.now().toString(),
            text: text,
            date: new Date().toLocaleString()
        };

        showLoading(true);
        saveBtn.disabled = true;

        try {
            const response = await fetch('/api/memos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memoData)
            });

            if (!response.ok) throw new Error('Failed to save memo');
            
            textInput.value = '';
            await fetchMemos(); // Refresh list
        } catch (error) {
            console.error(error);
            alert('Failed to save memo. Check console for details.');
        } finally {
            showLoading(false);
            saveBtn.disabled = false;
        }
    }

    async function deleteMemo(id) {
        if (!confirm('정말 이 메모를 삭제하시겠습니까?')) return;

        showLoading(true);
        try {
            const response = await fetch(`/api/memos?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete memo');
            
            // Optimistic UI update
            currentMemos = currentMemos.filter(m => m.id !== id);
            renderMemos();
        } catch (error) {
            console.error(error);
            alert('Failed to delete memo.');
        } finally {
            showLoading(false);
        }
    }

    // UI Functions
    function renderMemos() {
        memosList.innerHTML = '';
        
        if (currentMemos.length === 0) {
            memosList.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">저장된 메모가 없습니다.</div>`;
            return;
        }

        currentMemos.forEach(memo => {
            memosList.appendChild(createMemoElement(memo));
        });
    }

    function createMemoElement(memo) {
        const div = document.createElement('div');
        div.className = 'memo-item';
        div.id = `memo-${memo.id}`;

        div.innerHTML = `
            <div class="memo-content">${escapeHTML(memo.text)}</div>
            <div class="memo-footer">
                <span class="memo-date">${memo.date}</span>
                <button class="action-btn delete" data-id="${memo.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    삭제
                </button>
            </div>
        `;

        // Bind events
        div.querySelector('.delete').addEventListener('click', () => deleteMemo(memo.id));

        return div;
    }

    function showLoading(isLoading) {
        if (isLoading) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
});
