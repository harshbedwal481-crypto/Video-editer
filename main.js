import './style.css';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const $ = (id) => document.getElementById(id);
const video = $('video');
let videoFile = null, audioFile = null, videoUrl = null, audioUrl = null, ffmpeg = null;
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}
function fmt(seconds) {
  if (!Number.isFinite(seconds)) return '00:00.00';
  const m = Math.floor(seconds / 60), s = (seconds % 60).toFixed(2).padStart(5,'0');
  return `${String(m).padStart(2,'0')}:${s}`;
}
function updateText() {
  const enabled = $('textEnabled').checked;
  const overlay = $('textOverlay');
  overlay.textContent = enabled ? $('overlayText').value : '';
  overlay.style.fontSize = `${$('textSize').value}px`;
  overlay.style.color = $('textColor').value;
}
$('videoInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) return toast('Please choose a video file.');
  videoFile = file;
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.classList.add('ready');
  $('emptyState').style.display = 'none';
  $('fileName').textContent = file.name;
  $('previewMeta').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  $('timelineStatus').textContent = 'Video loaded. Adjust trim range, then export.';
  $('videoClip').textContent = `▰　${file.name}`;
  toast('Video imported. It stays on your device.');
});
video.addEventListener('loadedmetadata', () => {
  $('endTime').value = Math.max(0.1, video.duration).toFixed(1);
  $('timeLabel').textContent = `${fmt(0)} / ${fmt(video.duration)}`;
});
video.addEventListener('timeupdate', () => {
  $('timeLabel').textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
});
$('audioInput').addEventListener('change', (e) => {
  audioFile = e.target.files?.[0] || null;
  $('audioName').textContent = audioFile ? audioFile.name : 'No audio selected';
  $('audioClip').textContent = audioFile ? `♫　${audioFile.name}` : '♫　Music track';
});
['overlayText','textSize','textColor','textEnabled'].forEach(id => $(id).addEventListener('input', updateText));
$('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light');
  $('themeBtn').textContent = document.body.classList.contains('light') ? '☀ Light' : '☾ Dark';
});
$('playheadBtn').addEventListener('click', () => { video.currentTime = 0; video.play().catch(()=>{}); });
$('exportBtn').addEventListener('click', exportVideo);

async function loadEngine() {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({message}) => console.log('[FFmpeg]', message));
  ffmpeg.on('progress', ({progress}) => {
    if (Number.isFinite(progress)) $('busyText').textContent = `Processing video… ${Math.max(0,Math.min(100,Math.round(progress*100)))}%`;
  });
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
  });
  return ffmpeg;
}
function safeName(name) { return name.replace(/[^a-z0-9._-]/gi,'_').slice(0,80) || 'video'; }
async function exportVideo() {
  if (!videoFile) return toast('Import a video before exporting.');
  const start = Math.max(0, Number($('startTime').value) || 0);
  const end = Math.min(video.duration || Infinity, Number($('endTime').value) || video.duration);
  if (!Number.isFinite(end) || end <= start) return toast('Trim end must be greater than trim start.');
  const overlayText = $('textEnabled').checked ? $('overlayText').value.trim() : '';
  const useAudio = $('mixAudio').checked && audioFile;
  $('busy').classList.remove('hidden');
  $('busyTitle').textContent = 'Preparing export…';
  $('busyText').textContent = 'The first export downloads the video engine. Keep this tab open.';
  $('exportBtn').disabled = true;
  try {
    const engine = await loadEngine();
    const inputName = `input_${safeName(videoFile.name)}`;
    const outputName = 'clipforge_export.mp4';
    await engine.writeFile(inputName, await fetchFile(videoFile));
    const args = ['-ss', String(start), '-i', inputName, '-t', String(end-start)];
    let audioName = '';
    if (useAudio) {
      audioName = `music_${safeName(audioFile.name)}`;
      await engine.writeFile(audioName, await fetchFile(audioFile));
      args.push('-i', audioName);
    }
    const filters = [];
    const key = $('keyColor').value;
    const similarity = Math.max(0.01, Math.min(1, Number($('similarity').value)/100));
    // Chroma key is applied only when the user moves similarity away from its default,
    // to reduce accidental removal of green colors in ordinary footage.
    if (Number($('similarity').value) !== 30) filters.push(`chromakey=${key.replace('#','0x')}:${similarity.toFixed(2)}:0.08`);
    if (overlayText) {
      // drawtext needs a font file; this portable starter uses subtitles-style overlay
      // via a generated SRT, which FFmpeg can render when its build includes libass.
      const srtText = `1\n00:00:00,000 --> 99:00:00,000\n${overlayText.replace(/[<>]/g,'')}\n`;
      await engine.writeFile('overlay.srt', new TextEncoder().encode(srtText));
      args.push('-vf', `subtitles=overlay.srt:force_style='FontSize=${Math.round(Number($('textSize').value)*0.55)},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Alignment=2'`);
    } else if (filters.length) {
      args.push('-vf', filters.join(','));
    }
    if (useAudio) {
      args.push('-map','0:v:0','-map','1:a:0','-shortest','-c:a','aac','-b:a','192k');
    } else {
      args.push('-c:a','aac');
    }
    args.push('-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',outputName);
    $('busyTitle').textContent = 'Rendering your video…';
    await engine.exec(args);
    const data = await engine.readFile(outputName);
    const blob = new Blob([data.buffer], {type:'video/mp4'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clipforge-${Date.now()}.mp4`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast('Export complete. Check your Downloads folder.');
  } catch (err) {
    console.error(err);
    toast('Export failed on this device. Try a shorter/smaller video or desktop browser.');
  } finally {
    $('busy').classList.add('hidden');
    $('exportBtn').disabled = false;
  }
}
document.querySelectorAll('[data-panel]').forEach(btn => btn.addEventListener('click', () => {
  const panel = btn.dataset.panel;
  document.querySelectorAll('.nav').forEach(n => n.classList.remove('active'));
  btn.classList.add('active');
  const map = {text:'Text overlay settings are in Properties.',chroma:'Chroma key settings are in Properties.',keyframes:'Keyframe animation is planned but not implemented in this starter.'};
  toast(map[panel] || 'Media tools selected.');
}));
updateText();
