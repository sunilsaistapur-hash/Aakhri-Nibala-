import React, { useEffect, useRef, useState } from 'react';

interface StoryPhotoFrameProps {
  sceneIndex: number;
}

const COUNTER_WOMAN_PHOTO =
  '/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png';

function drawPaintedScene(canvas: HTMLCanvasElement, sceneIndex: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Night storm sky base
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  skyGrad.addColorStop(0, '#04060b');
  skyGrad.addColorStop(0.6, '#0d1421');
  skyGrad.addColorStop(1, '#1a2130');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Distant lightning wash
  const stormGlow = ctx.createRadialGradient(w * 0.72, h * 0.14, 10, w * 0.72, h * 0.14, 340);
  stormGlow.addColorStop(0, sceneIndex === 3 ? 'rgba(130, 155, 195, 0.28)' : 'rgba(95, 115, 160, 0.2)');
  stormGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = stormGlow;
  ctx.fillRect(0, 0, w, h);

  if (sceneIndex === 0) {
    // SCENE 0: Inside car during heavy rain - Radio dead
    // Swirling roadside trees
    ctx.fillStyle = '#06080c';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.lineTo(110, h * 0.14);
    ctx.lineTo(190, h * 0.34);
    ctx.lineTo(290, h * 0.12);
    ctx.lineTo(360, h * 0.56);
    ctx.lineTo(0, h * 0.56);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, h * 0.6);
    ctx.lineTo(w - 105, h * 0.15);
    ctx.lineTo(w - 205, h * 0.36);
    ctx.lineTo(w - 300, h * 0.14);
    ctx.lineTo(w - 375, h * 0.56);
    ctx.lineTo(w, h * 0.56);
    ctx.closePath();
    ctx.fill();

    // Wet highway in headlight beams
    ctx.fillStyle = '#11151d';
    ctx.beginPath();
    ctx.moveTo(w * 0.39, h * 0.52);
    ctx.lineTo(w * 0.61, h * 0.52);
    ctx.lineTo(w * 0.88, h * 0.74);
    ctx.lineTo(w * 0.12, h * 0.74);
    ctx.closePath();
    ctx.fill();

    const beamGrad = ctx.createRadialGradient(w * 0.5, h * 0.68, 20, w * 0.5, h * 0.58, 320);
    beamGrad.addColorStop(0, 'rgba(255, 224, 150, 0.25)');
    beamGrad.addColorStop(1, 'rgba(255, 224, 150, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(0, h * 0.35, w, h * 0.4);

    // Center dashed line
    ctx.strokeStyle = 'rgba(205, 195, 165, 0.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.52);
    ctx.lineTo(w * 0.5, h * 0.72);
    ctx.stroke();
    ctx.setLineDash([]);

    // Windshield frame & wiper
    ctx.strokeStyle = '#13161d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.68);
    ctx.lineTo(w * 0.44, h * 0.42);
    ctx.stroke();

    // Rain streaks across glass
    ctx.strokeStyle = 'rgba(186, 208, 236, 0.32)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 85; i++) {
      const rx = ((i * 113) % (w - 20)) + 10;
      const ry = ((i * 79) % (h * 0.66)) + 6;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 14, ry + 34);
      ctx.stroke();
    }

    // Dashboard body
    const dashGrad = ctx.createLinearGradient(0, h * 0.62, 0, h);
    dashGrad.addColorStop(0, '#16181f');
    dashGrad.addColorStop(1, '#08090c');
    ctx.fillStyle = dashGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.66);
    ctx.quadraticCurveTo(w * 0.5, h * 0.57, w, h * 0.66);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Glowing Speedometer cluster (Left-center)
    ctx.fillStyle = '#090b10';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w * 0.31, h * 0.82, 68, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w * 0.31, h * 0.82, 54, Math.PI, Math.PI * 1.9);
    ctx.stroke();

    // Needle at 0 (car slowing)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.31, h * 0.82);
    ctx.lineTo(w * 0.31 - 44, h * 0.84);
    ctx.stroke();

    // Steering wheel ring
    ctx.strokeStyle = '#20242c';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(w * 0.31, h * 0.96, 118, Math.PI * 0.96, Math.PI * 2.04);
    ctx.stroke();

    // Dead Car Radio Console (Center-right)
    ctx.fillStyle = '#0c0e13';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(w * 0.53, h * 0.72, 230, 112);
    ctx.strokeRect(w * 0.53, h * 0.72, 230, 112);

    // Static flicker screen
    ctx.fillStyle = '#2a0d11';
    ctx.fillRect(w * 0.555, h * 0.745, 180, 46);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 16px "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('रेडियो बंद · कोई ध्वनि नहीं', w * 0.555 + 90, h * 0.745 + 29);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('घड़ी: रात 11:04', w * 0.555 + 90, h * 0.865);
  } else if (sceneIndex === 1) {
    // SCENE 1: Phone showing No Network + Milestone 18 km outside wet glass
    // Rainy roadside darkness outside
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, h * 0.56, w, h * 0.44);

    // Wet Indian roadside stone milestone (left)
    const mileGlow = ctx.createRadialGradient(w * 0.22, h * 0.62, 10, w * 0.22, h * 0.62, 210);
    mileGlow.addColorStop(0, 'rgba(234, 179, 8, 0.22)');
    mileGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mileGlow;
    ctx.fillRect(0, h * 0.3, w * 0.5, h * 0.6);

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(w * 0.14, h * 0.51, 138, 172, [28, 28, 4, 4]);
    ctx.fill();
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.roundRect(w * 0.14, h * 0.51, 138, 52, [28, 28, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('राजमार्ग 44', w * 0.14 + 69, h * 0.51 + 33);
    ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('शहर', w * 0.14 + 69, h * 0.67);
    ctx.font = 'bold 26px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('18 कि.मी.', w * 0.14 + 69, h * 0.74);

    // Rain streaks
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.26)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 65; i++) {
      const rx = ((i * 127) % w);
      const ry = ((i * 89) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 10, ry + 30);
      ctx.stroke();
    }

    // Aarav's hand holding smartphone on the right
    ctx.fillStyle = '#4a3023';
    ctx.beginPath();
    ctx.roundRect(w * 0.54, h * 0.42, 210, 320, 28);
    ctx.fill();

    // Phone Chassis
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(w * 0.555, h * 0.16, 214, 355, 22);
    ctx.fill();
    ctx.stroke();

    // Glowing Phone Screen
    const scrGrad = ctx.createLinearGradient(0, h * 0.19, 0, h * 0.76);
    scrGrad.addColorStop(0, '#18181b');
    scrGrad.addColorStop(1, '#2a0f14');
    ctx.fillStyle = scrGrad;
    ctx.beginPath();
    ctx.roundRect(w * 0.568, h * 0.19, 188, 305, 14);
    ctx.fill();

    // Dead signal bars
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(w * 0.585 + b * 9, h * 0.23 - b * 3, 6, 8 + b * 3);
    }
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.582, h * 0.205);
    ctx.lineTo(w * 0.625, h * 0.245);
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 21px "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('कोई नेटवर्क नहीं', w * 0.568 + 94, h * 0.42);
    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 34px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('11:06', w * 0.568 + 94, h * 0.34);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('केवल आपातकालीन संकेत', w * 0.568 + 94, h * 0.49);

    // Failed Call button icon
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(w * 0.568 + 94, h * 0.63, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 13px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('कॉल असफल', w * 0.568 + 94, h * 0.71);
  } else if (sceneIndex === 2) {
    // SCENE 2: Steaming broken sedan with propped hood & hazard lights
    // Wet highway reflection plane
    const roadGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    roadGrad.addColorStop(0, '#10131c');
    roadGrad.addColorStop(1, '#050609');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // Dense dark trees background
    ctx.fillStyle = '#070a0e';
    ctx.fillRect(0, h * 0.32, w, h * 0.24);

    // Amber hazard glow reflection on wet road
    const hazGlowL = ctx.createRadialGradient(w * 0.33, h * 0.72, 6, w * 0.33, h * 0.76, 145);
    hazGlowL.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
    hazGlowL.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = hazGlowL;
    ctx.fillRect(w * 0.14, h * 0.58, 280, 220);

    const hazGlowR = ctx.createRadialGradient(w * 0.66, h * 0.72, 6, w * 0.66, h * 0.76, 145);
    hazGlowR.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
    hazGlowR.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = hazGlowR;
    ctx.fillRect(w * 0.52, h * 0.58, 280, 220);

    // White engine steam clouds billowing out
    for (let s = 0; s < 9; s++) {
      const sx = w * 0.42 + Math.sin(s * 1.4) * 58;
      const sy = h * 0.46 - s * 24;
      const sr = 28 + s * 6;
      const stGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, sr);
      stGrad.addColorStop(0, 'rgba(215, 225, 240, 0.36)');
      stGrad.addColorStop(1, 'rgba(215, 225, 240, 0)');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Broken-down Sedan body (front 3/4 view)
    ctx.fillStyle = '#2d1419';
    ctx.strokeStyle = '#52262e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(w * 0.28, h * 0.52, w * 0.44, h * 0.22, 16);
    ctx.fill();
    ctx.stroke();

    // Car cabin roof
    ctx.fillStyle = '#1e0e11';
    ctx.beginPath();
    ctx.moveTo(w * 0.34, h * 0.52);
    ctx.lineTo(w * 0.4, h * 0.39);
    ctx.lineTo(w * 0.62, h * 0.39);
    ctx.lineTo(w * 0.68, h * 0.52);
    ctx.closePath();
    ctx.fill();

    // Propped-up open engine hood
    ctx.fillStyle = '#3a1a21';
    ctx.beginPath();
    ctx.moveTo(w * 0.31, h * 0.53);
    ctx.lineTo(w * 0.24, h * 0.38);
    ctx.lineTo(w * 0.56, h * 0.37);
    ctx.lineTo(w * 0.59, h * 0.53);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tires
    ctx.fillStyle = '#07080b';
    ctx.fillRect(w * 0.29, h * 0.72, 62, 34);
    ctx.fillRect(w * 0.65, h * 0.72, 62, 34);

    // Blinking hazard lamps + dim headlights
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(w * 0.295, h * 0.6, 46, 20, 6);
    ctx.roundRect(w * 0.66, h * 0.6, 46, 20, 6);
    ctx.fill();

    // Indian number plate
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(w * 0.445, h * 0.665, 108, 24);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('गाड़ी संख्या 1998', w * 0.445 + 54, h * 0.682);

    // Rain streaks
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.34)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 95; i++) {
      const rx = ((i * 97) % w);
      const ry = ((i * 73) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 10, ry + 32);
      ctx.stroke();
    }
  } else {
    // SCENE 3: Looming haunted Shahi Niwala Restaurant in storm fog
    ctx.fillStyle = '#090c12';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Wet courtyard reflection
    const entryGlow = ctx.createRadialGradient(w * 0.5, h * 0.74, 20, w * 0.5, h * 0.8, 300);
    entryGlow.addColorStop(0, 'rgba(245, 158, 11, 0.36)');
    entryGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = entryGlow;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // 4-Storey Old Indian Colonial Mansion Silhouette
    ctx.fillStyle = '#141114';
    ctx.strokeStyle = '#332824';
    ctx.lineWidth = 2;
    ctx.fillRect(w * 0.21, h * 0.14, w * 0.58, h * 0.61);
    ctx.strokeRect(w * 0.21, h * 0.14, w * 0.58, h * 0.61);

    // Roof parapet & decorative dome/crest
    ctx.fillStyle = '#1b1416';
    ctx.fillRect(w * 0.19, h * 0.12, w * 0.62, 16);
    ctx.fillRect(w * 0.38, h * 0.08, w * 0.24, 24);

    // Rows of dark arched windows across floors 1–4
    for (let fl = 0; fl < 4; fl++) {
      const wy = h * 0.18 + fl * 72;
      for (let col = 0; col < 5; col++) {
        const wx = w * 0.255 + col * 102;
        const isLit4thFloor = fl === 0 && col === 3;
        const isDimLobby = fl === 3 && (col === 1 || col === 3);

        ctx.fillStyle = isLit4thFloor
          ? '#f59e0b'
          : isDimLobby
          ? 'rgba(217, 119, 6, 0.48)'
          : '#090a0d';
        ctx.beginPath();
        ctx.roundRect(wx, wy, 42, 46, [18, 18, 2, 2]);
        ctx.fill();

        if (isLit4thFloor) {
          // Glow halo & shadow watcher silhouette in 4th floor window!
          const wGlow = ctx.createRadialGradient(wx + 21, wy + 23, 6, wx + 21, wy + 23, 72);
          wGlow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
          wGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = wGlow;
          ctx.fillRect(wx - 45, wy - 45, 130, 130);

          // Eerie standing figure silhouette
          ctx.fillStyle = '#140c0a';
          ctx.beginPath();
          ctx.arc(wx + 21, wy + 18, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(wx + 12, wy + 25, 18, 21);
        }
      }
    }

    // Open heavy arched wooden entrance & warm lobby spill
    ctx.fillStyle = '#2b160d';
    ctx.beginPath();
    ctx.roundRect(w * 0.445, h * 0.59, 106, 88, [34, 34, 0, 0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
    ctx.beginPath();
    ctx.roundRect(w * 0.46, h * 0.615, 76, 74, [24, 24, 0, 0]);
    ctx.fill();

    // Porch hanging lantern
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.57, 7, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Hindi Signboard
    ctx.fillStyle = '#1c0f0a';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.fillRect(w * 0.305, h * 0.47, w * 0.39, 54);
    ctx.strokeRect(w * 0.305, h * 0.47, w * 0.39, 54);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 21px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('शाही निवाला रेस्टोरेंट', w * 0.5, h * 0.506);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('खाना और रहने की व्यवस्था उपलब्ध है', w * 0.5, h * 0.526);

    // Rain streaks
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.28)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 80; i++) {
      const rx = ((i * 103) % w);
      const ry = ((i * 71) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 9, ry + 30);
      ctx.stroke();
    }
  }
}

export const StoryPhotoFrame: React.FC<StoryPhotoFrameProps> = ({ sceneIndex }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (sceneIndex >= 4) return;
    if (!canvasRef.current) return;
    drawPaintedScene(canvasRef.current, sceneIndex);
  }, [sceneIndex]);

  if (sceneIndex === 4) {
    return (
      <div className="relative w-full max-w-2xl aspect-video mx-auto rounded-xl overflow-hidden border-2 border-red-900/75 bg-zinc-950 shadow-2xl">
        {!imgFailed ? (
          <img
            src={COUNTER_WOMAN_PHOTO}
            alt="काउंटर पर खड़ी रहस्यमयी महिला कविता"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-[50%_14%]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-red-300 text-sm">
            काउंटर के पीछे धुँधली लालटेन में खड़ी एक भयानक आकृति...
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, transparent 36%, rgba(8, 4, 6, 0.78) 88%, rgba(0, 0, 0, 0.96) 100%)',
          }}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-red-200/90 bg-zinc-950/85 border border-red-900/50 rounded-md px-3 py-1.5">
          <span>रेस्टोरेंट रिसेप्शन काउंटर · धुँधली रोशनी</span>
          <span className="text-amber-300 font-semibold">काउंटर पर खड़ी वेट्रेस</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl aspect-video mx-auto rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="w-full h-full block object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, transparent 55%, rgba(0, 0, 0, 0.65) 100%)',
        }}
      />
    </div>
  );
};
