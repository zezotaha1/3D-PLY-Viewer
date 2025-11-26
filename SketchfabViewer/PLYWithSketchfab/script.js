const viewer = document.getElementById('viewer');
const uidInput = document.getElementById('UID');
const loadBtn = document.getElementById('loadSketchfab');
const clearBtn = document.getElementById('clear');
let iframeEl = null, client = null;

function createSketchfabFrame(uid) {
    viewer.innerHTML = '';
    iframeEl = document.createElement('iframe');
    iframeEl.setAttribute('allow', 'autoplay; fullscreen; vr');
    viewer.appendChild(iframeEl);

    client = new Sketchfab('1.12.1', iframeEl);
    client.init(uid, {
        success: function (api) {
            api.start(() => { });
            api.addEventListener('viewerready', () => {
                console.log('Sketchfab ready');
                // optional: position camera for many models
                try { api.setCameraLookAt([0, 0, 3], [0, 0, 0], 0); } catch (e) {/* ignore */ }
            });
        },
        error: function () {
            alert('خطأ في تحميل الموديل من Sketchfab — راجع الـ UID أو الاتصال بالإنترنت.');
            console.error('Sketchfab init error');
        }
    });
}

loadBtn.addEventListener('click', () => {
    const uid = uidInput.value.trim();
    if (!uid) { alert('من فضلك ضع الـ UID'); uidInput.focus(); return; }
    createSketchfabFrame(uid);
});

clearBtn.addEventListener('click', () => { viewer.innerHTML = ''; iframeEl = null; client = null; });
// optional: load if UID present in query ?uid=...
const params = new URLSearchParams(location.search);
if (params.get('uid')) { uidInput.value = params.get('uid'); createSketchfabFrame(params.get('uid')); }