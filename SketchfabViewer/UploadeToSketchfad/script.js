async function uploadToSketchfab() {
    const fileInput = document.getElementById('plyFile');
    const apiToken = document.getElementById('apiToken').value.trim();
    debugger;
    if (!apiToken) {
        alert('Please enter your Sketchfab API token');
        return;
    }
    if (fileInput.files.length === 0) {
        alert('Please select a PLY file to upload');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('token', apiToken);
    formData.append('modelFile', file);
    formData.append('name', file.name);

    try {
        const response = await fetch('https://api.sketchfab.com/v3/models', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log(result);

        if (response.ok) {
            alert('Upload successful! Model UID: ' + result.uid);
            window.location.href = `../PLYWithSketchfab/PLYWithSketchfab.html?uid=${result.uid}`;
        } else {
            alert('Upload failed: ' + JSON.stringify(result));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}