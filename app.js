
const fileForm = document.getElementById('fileForm');
const message = document.getElementById('message');
const fileList = document.getElementById('fileList');
const refreshButton = document.getElementById('refreshButton');
const systemInfo = document.getElementById('systemInfo');

// Create file
fileForm.addEventListener('submit', async event => {
    event.preventDefault();

    const filename = document.getElementById('filename').value.trim();
    const content = document.getElementById('content').value;

    try {
        const response = await fetch('/api/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename, content })
        });

        const data = await response.json();
        message.textContent = data.message || data.error;

        if (response.ok) {
            fileForm.reset();
            await loadFiles();
        }
    } catch (error) {
        message.textContent = 'Server connection failed';
    }
});

// Load and display files
async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        const data = await response.json();

        fileList.replaceChildren();

        if (!response.ok) {
            fileList.textContent = data.error || 'Could not load files';
            return;
        }

        if (!data.files || data.files.length === 0) {
            fileList.textContent = 'No files found';
            return;
        }

        data.files.forEach(filename => {
            const item = document.createElement('li');
            const name = document.createElement('span');
            const deleteButton = document.createElement('button');

            name.textContent = filename;
            deleteButton.textContent = 'Delete';
            deleteButton.type = 'button';

            deleteButton.addEventListener('click', async () => {
                const confirmed = confirm(`Do you want to delete ${filename}?`);

                if (!confirmed) return;

                try {
                    const deleteResponse = await fetch(
                        `/api/files?filename=${encodeURIComponent(filename)}`,
                        { method: 'DELETE' }
                    );

                    const result = await deleteResponse.json();
                    message.textContent = result.message || result.error;

                    if (deleteResponse.ok) {
                        await loadFiles();
                    }
                } catch (error) {
                    message.textContent = 'Could not delete file';
                }
            });

            item.append(name, ' ', deleteButton);
            fileList.appendChild(item);
        });
    } catch (error) {
        fileList.textContent = 'Could not connect to server';
    }
}

// Refresh button
refreshButton.addEventListener('click', loadFiles);

// Load system information
async function loadSystemInfo() {
    try {
        const response = await fetch('/api/system');
        const data = await response.json();

        if (!response.ok) {
            systemInfo.textContent = data.error || 'Could not load system info';
            return;
        }

        systemInfo.replaceChildren();

        const details = [
            ['Platform', data.platform],
            ['Hostname', data.hostname],
            ['Free Memory', `${(data.freeMemory / 1024 / 1024).toFixed(2)} MB`],
            ['Total Memory', `${(data.totalMemory / 1024 / 1024).toFixed(2)} MB`],
            ['Uptime', `${Math.floor(data.uptime)} seconds`]
        ];

        details.forEach(([label, value]) => {
            const p = document.createElement('p');
            p.textContent = `${label}: ${value}`;
            systemInfo.appendChild(p);
        });
    } catch (error) {
        systemInfo.textContent = 'Could not load system information';
    }
}

// Load data when page opens
loadFiles();
loadSystemInfo();
